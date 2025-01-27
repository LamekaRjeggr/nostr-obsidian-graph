import { EventHandler, HexFetchEvent, NostrEventType } from '../../../experimental/event-bus/types';
import { UnifiedFetchProcessor } from '../unified-fetch-processor';
import { EventKinds } from '../../core/base-event-handler';
import { Notice } from 'obsidian';
import { FileService } from '../../core/file-service';
import { ValidationService } from '../../validation-service';
import { Reference, TagType } from '../../../types';

export class HexFetchHandler implements EventHandler<HexFetchEvent> {
    priority = 1; // High priority for direct fetches
    
    constructor(
        private unifiedFetchProcessor: UnifiedFetchProcessor,
        private fileService: FileService
    ) {}

    private createReferences(eventId: string, context: { root?: string; parent?: string; }): Reference[] {
        const references: Reference[] = [];
        if (context.root) {
            references.push({
                type: TagType.ROOT,
                targetId: context.root,
                marker: 'root'
            });
        }
        if (context.parent) {
            references.push({
                type: TagType.REPLY,
                targetId: context.parent,
                marker: 'reply'
            });
        }
        return references;
    }
    
    async handle(event: HexFetchEvent): Promise<void> {
        try {
            const { hexKey } = event;

            // Validate hex key
            if (!ValidationService.validateHex(hexKey)) {
                new Notice('Invalid hex key format');
                return;
            }

            // First fetch the profile
            const profileEvent = await this.unifiedFetchProcessor.fetchCompleteNote(hexKey, 0);
            if (profileEvent) {
                try {
                    const metadata = JSON.parse(profileEvent.content);
                    await this.fileService.saveProfile({
                        pubkey: profileEvent.pubkey,
                        displayName: metadata.display_name,
                        name: metadata.name,
                        about: metadata.about,
                        picture: metadata.picture,
                        nip05: metadata.nip05
                    });
                } catch (error) {
                    console.error('Error parsing profile metadata:', error);
                    new Notice('Error processing profile metadata');
                    return;
                }
            } else {
                new Notice('No profile found for this key');
                return;
            }

            // Then fetch their notes with context
            const notes = await this.unifiedFetchProcessor.fetchWithOptions({
                kinds: [EventKinds.NOTE],
                authors: [hexKey],
                limit: 50,
                enhanced: {
                    reactions: true
                }
            });

            let processedNotes = 0;
            // Process each note with proper references
            for (const note of notes) {
                try {
                    const context = await this.unifiedFetchProcessor.fetchThreadContext(note.id);
                    
                    // Save note with references
                    await this.fileService.saveNote(note, {
                        references: this.createReferences(note.id, {
                            root: context.root,
                            parent: context.parent
                        }),
                        referencedBy: []
                    });

                    // Save any replies
                    if (context.replies?.length) {
                        for (const replyId of context.replies) {
                            const replyEvent = await this.unifiedFetchProcessor.fetchCompleteNote(replyId);
                            if (replyEvent) {
                                await this.fileService.saveNote(replyEvent, {
                                    references: this.createReferences(replyEvent.id, {
                                        root: context.root,
                                        parent: note.id
                                    }),
                                    referencedBy: []
                                });
                            }
                        }
                    }
                    processedNotes++;
                } catch (error) {
                    console.error('Error processing note:', error);
                }
            }

            new Notice(`Successfully processed profile and ${processedNotes} notes`);
            
        } catch (error) {
            console.error('Error in hex fetch:', error);
            new Notice(`Error: ${error.message}`);
        }
    }
}
