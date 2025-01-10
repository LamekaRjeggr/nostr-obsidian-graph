import { EventHandler, ThreadFetchEvent, NostrEventType } from '../../../experimental/event-bus/types';
import { UnifiedFetchProcessor } from '../unified-fetch-processor';
import { EventKinds } from '../../core/base-event-handler';
import { Notice } from 'obsidian';
import { FileService } from '../../core/file-service';
import { ValidationService } from '../../validation-service';
import { Reference, TagType } from '../../../types';

export class ThreadFetchHandler implements EventHandler<ThreadFetchEvent> {
    priority = 1; // High priority for thread operations
    
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
    
    async handle(event: ThreadFetchEvent): Promise<void> {
        try {
            const { eventId, limit = 50, includeContext = true } = event;

            // Validate event ID
            if (!ValidationService.validateHex(eventId)) {
                new Notice('Invalid event ID format');
                return;
            }

            // Fetch thread context
            const context = await this.unifiedFetchProcessor.fetchThreadContext(eventId, limit);
            
            // Fetch and save root note if exists and context is requested
            if (includeContext && context.root) {
                const rootEvent = await this.unifiedFetchProcessor.fetchCompleteNote(context.root);
                if (rootEvent) {
                    const rootRefs = this.createReferences(rootEvent.id, {});
                    await this.fileService.saveNote(rootEvent, {
                        references: rootRefs,
                        referencedBy: []
                    });
                }
            }

            // Fetch and save parent note if exists and context is requested
            if (includeContext && context.parent && context.parent !== context.root) {
                const parentEvent = await this.unifiedFetchProcessor.fetchCompleteNote(context.parent);
                if (parentEvent) {
                    const parentRefs = this.createReferences(parentEvent.id, { root: context.root });
                    await this.fileService.saveNote(parentEvent, {
                        references: parentRefs,
                        referencedBy: []
                    });
                }
            }

            // Fetch and save target event
            const targetEvent = await this.unifiedFetchProcessor.fetchCompleteNote(eventId);
            if (targetEvent) {
                const targetRefs = this.createReferences(targetEvent.id, {
                    root: context.root,
                    parent: context.parent
                });
                await this.fileService.saveNote(targetEvent, {
                    references: targetRefs,
                    referencedBy: []
                });
            }

            // Fetch and save replies if they exist
            if (context.replies && context.replies.length > 0) {
                for (const replyId of context.replies) {
                    const replyEvent = await this.unifiedFetchProcessor.fetchCompleteNote(replyId);
                    if (replyEvent) {
                        const replyRefs = this.createReferences(replyEvent.id, {
                            root: context.root,
                            parent: eventId
                        });
                        await this.fileService.saveNote(replyEvent, {
                            references: replyRefs,
                            referencedBy: []
                        });
                    }
                }
            }

            new Notice(`Thread processed with ${context.replies?.length || 0} replies`);
        } catch (error) {
            console.error('Error in thread fetch:', error);
            new Notice(`Error fetching thread: ${error.message}`);
        }
    }
}
