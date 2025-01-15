import { App, Notice } from 'obsidian';
import { NostrEvent, TagType } from '../../../types';
import { EventStreamHandler } from '../../../core/event-stream-handler';
import { EventKinds } from '../../core/base-event-handler';
import { ValidationService } from '../../validation-service';
import { FileService } from '../../core/file-service';
import { TagProcessor } from '../../processors/tag-processor';
import { ReferenceProcessor } from '../../processors/reference-processor';
import { ReactionProcessor } from '../../processors/reaction-processor';
import { EventService } from '../../core/event-service';

export class EventStreamManager {
    private streamHandler: EventStreamHandler;
    private tagProcessor: TagProcessor;
    private referenceProcessor: ReferenceProcessor;

    constructor(
        private app: App,
        private fileService: FileService,
        private eventService: EventService,
        private reactionProcessor: ReactionProcessor
    ) {
        this.streamHandler = new EventStreamHandler();
        this.tagProcessor = new TagProcessor();
        this.referenceProcessor = new ReferenceProcessor(app, app.metadataCache);
        this.registerHandlers();
    }

    private registerHandlers(): void {
        // Profile events
        this.streamHandler.registerHandler({
            kind: EventKinds.METADATA,
            priority: 1,
            process: async (event) => {
                try {
                    if (!ValidationService.validateProfileEvent(event)) {
                        console.error('Invalid profile event');
                        new Notice('Invalid profile event received');
                        return;
                    }

                    const metadata = JSON.parse(event.content);
                    await this.fileService.saveProfile({
                        pubkey: event.pubkey,
                        displayName: metadata.display_name || metadata.name,
                        name: metadata.name,
                        about: metadata.about,
                        picture: metadata.picture,
                        nip05: metadata.nip05
                    });

                    this.eventService.emitStateChange(true);
                } catch (error) {
                    console.error('Error processing profile:', error);
                    new Notice('Error processing profile event');
                }
            },
            validate: (event) => {
                try {
                    JSON.parse(event.content);
                    return true;
                } catch {
                    return false;
                }
            },
            cleanup: async () => {
                this.eventService.emitStateChange(false);
            }
        });

        // Contact events
        this.streamHandler.registerHandler({
            kind: EventKinds.CONTACT,
            priority: 2,
            process: async (event) => {
                const contacts = event.tags
                    .filter(tag => tag[0] === 'p')
                    .map(tag => tag[1]);
                // Process each contact as a profile
                for (const contact of contacts) {
                    await this.fileService.saveProfile({
                        pubkey: contact,
                        name: `Nostr User ${contact.slice(0, 8)}`,
                        displayName: `Nostr User ${contact.slice(0, 8)}`
                    });
                }
            },
            validate: (event) => {
                return event.tags.some(tag => tag[0] === 'p');
            },
            cleanup: async () => {}
        });

        // Note events
        this.streamHandler.registerHandler({
            kind: EventKinds.NOTE,
            priority: 3,
            process: async (event) => {
                const refResults = await this.referenceProcessor.process(event);
                const tagResults = this.tagProcessor.process(event);
                await this.fileService.saveNote(event, {
                    references: [
                        ...(tagResults.root ? [{
                            targetId: tagResults.root,
                            type: TagType.ROOT,
                            marker: 'root'
                        }] : []),
                        ...(tagResults.replyTo ? [{
                            targetId: tagResults.replyTo,
                            type: TagType.REPLY,
                            marker: 'reply'
                        }] : []),
                        ...tagResults.references.map(id => ({
                            targetId: id,
                            type: TagType.MENTION
                        }))
                    ],
                    referencedBy: refResults.nostr.incoming.map(id => ({
                        targetId: id,
                        type: TagType.MENTION
                    }))
                });
            },
            validate: (event) => {
                return event.content.trim().length > 0;
            },
            cleanup: async () => {}
        });

        // Reaction events
        this.streamHandler.registerHandler({
            kind: EventKinds.REACTION,
            priority: 4,
            process: async (event) => {
                await this.reactionProcessor.process(event);
            },
            validate: (event) => {
                return event.tags.some(tag => tag[0] === 'e');
            },
            cleanup: async () => {}
        });
    }

    async processEvents(events: NostrEvent[]): Promise<void> {
        await this.streamHandler.processEvents(events);
    }

    async processEvent(event: NostrEvent): Promise<void> {
        await this.streamHandler.processEvent(event);
    }

    getReferenceProcessor(): ReferenceProcessor {
        return this.referenceProcessor;
    }

    reset(): void {
        this.streamHandler.reset();
        this.referenceProcessor.clear();
    }
}
