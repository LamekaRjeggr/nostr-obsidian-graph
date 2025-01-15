import { App, Notice } from 'obsidian';
import { NostrEvent, FetchOptions, TagType } from '../../../types';
import { EventKinds } from '../../core/base-event-handler';
import { RelayService } from '../../core/relay-service';
import { ValidationService } from '../../validation-service';
import { FileService } from '../../core/file-service';
import { TagProcessor } from '../../processors/tag-processor';
import { ReferenceProcessor } from '../../processors/reference-processor';
import { ReactionProcessor } from '../../processors/reaction-processor';
import { ContactManager } from './contact-manager';
import { EventStreamManager } from './event-stream-manager';
import { EventService } from '../../core/event-service';

export class FetchManager {
    private tagProcessor: TagProcessor;
    private referenceProcessor: ReferenceProcessor;
    private contactManager: ContactManager;
    private eventStreamManager: EventStreamManager;

    constructor(
        private relayService: RelayService,
        private fileService: FileService,
        private app: App,
        private reactionProcessor: ReactionProcessor,
        private eventService: EventService
    ) {
        this.tagProcessor = new TagProcessor();
        this.referenceProcessor = new ReferenceProcessor(app, app.metadataCache);
        this.eventStreamManager = new EventStreamManager(app, fileService, eventService, reactionProcessor);
        this.contactManager = new ContactManager(relayService, app, fileService, this.eventStreamManager);
    }

    async fetchWithOptions(options: FetchOptions): Promise<NostrEvent[]> {
        try {
            if (options.author && !ValidationService.validateHex(options.author)) {
                throw new Error('Invalid hex key format');
            }

            // Handle contacts if requested
            let authors: string[] | undefined;
            if (options.contacts?.include && options.author) {
                const contacts = await this.contactManager.fetchContacts(options.author);
                
                if (options.contacts.fetchProfiles && contacts.length > 0) {
                    await this.fetchWithOptions({
                        kinds: [EventKinds.METADATA],
                        limit: contacts.length,
                        authors: contacts,
                        skipSave: !options.contacts.linkInGraph
                    });
                }
                
                authors = [options.author, ...contacts];
            } else if (options.authors) {
                authors = options.authors;
            } else if (options.author) {
                authors = [options.author];
            }

            const filter = {
                kinds: options.kinds,
                limit: options.limit,
                since: options.since,
                until: options.until,
                authors: authors,
                ids: options.ids,
                '#e': options.tags?.filter(t => t[0] === 'e').map(t => t[1]),
                '#p': options.tags?.filter(t => t[0] === 'p').map(t => t[1]),
                search: options.search ? options.search.join(' ') : undefined
            };

            new Notice(`Fetching events with limit ${options.limit}...`);
            
            const events = await this.relayService.subscribe([filter]);
            const filteredEvents = options.filter 
                ? events.filter(options.filter)
                : events;

            new Notice(`Found ${filteredEvents.length} matching events`);

            if (!options.skipSave) {
                for (const event of filteredEvents) {
                    const refResults = await this.referenceProcessor.process(event);
                    const tagResults = this.tagProcessor.process(event);
                    
                    let metadata = {
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
                            })),
                            ...tagResults.mentions.map(id => ({
                                targetId: id,
                                type: TagType.MENTION
                            }))
                        ],
                        referencedBy: refResults.nostr.incoming.map(id => ({
                            targetId: id,
                            type: TagType.MENTION
                        }))
                    };

                    // Use EventStreamManager for all events to ensure consistent handling
                    await this.eventStreamManager.processEvent(event);

                    // Process reactions if requested and it's a note event
                    if (event.kind === EventKinds.NOTE && options.enhanced?.reactions) {
                        await this.reactionProcessor.processPendingReactions(event.id);
                    }
                }
            }

            return filteredEvents;
        } catch (error) {
            console.error('Error in FetchManager:', error);
            new Notice(`Error fetching events: ${error.message}`);
            throw error;
        }
    }

    getReferenceProcessor(): ReferenceProcessor {
        return this.referenceProcessor;
    }

    reset(): void {
        this.referenceProcessor.clear();
        this.contactManager.clear();
    }
}
