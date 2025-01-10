import { NostrEvent, NostrSettings } from '../../types';
import { RelayService } from '../core/relay-service';
import { EventService } from '../core/event-service';
import { EventKinds } from '../core/base-event-handler';
import { Notice } from 'obsidian';
import { Reference, TagType } from '../../types';

interface ThreadContext {
    root?: NostrEvent;
    parent?: NostrEvent;
    replies: NostrEvent[];
}

export class ThreadFetcher {
    constructor(
        private relayService: RelayService,
        private eventService: EventService,
        private settings: NostrSettings
    ) {}

    async fetchThreadContext(eventId: string): Promise<ThreadContext> {
        try {
            // Get the target event first
            const targetEvent = await this.fetchEvent(eventId);
            if (!targetEvent) {
                throw new Error('Target event not found');
            }

            // Initialize thread context
            const context: ThreadContext = {
                replies: []
            };

            // Find root and parent if they exist
            const rootId = this.findRootId(targetEvent);
            if (rootId) {
                context.root = await this.fetchEvent(rootId);
                // If we found a root and it's different from our target,
                // the target's immediate parent should be in its e tags
                const parentId = this.findParentId(targetEvent);
                if (parentId && parentId !== rootId) {
                    context.parent = await this.fetchEvent(parentId);
                }
            }

            // Fetch replies (limited by batchSize)
            context.replies = await this.fetchReplies(eventId);

            return context;
        } catch (error) {
            console.error('Error fetching thread context:', error);
            throw error;
        }
    }

    private async fetchEvent(id: string): Promise<NostrEvent | undefined> {
        const filter = {
            kinds: [EventKinds.NOTE],
            ids: [id]
        };

        const events = await this.relayService.subscribe([filter]);
        return events[0];
    }

    private async fetchReplies(eventId: string): Promise<NostrEvent[]> {
        const filter = {
            kinds: [EventKinds.NOTE],
            '#e': [eventId],
            limit: this.settings.batchSize
        };

        return await this.relayService.subscribe([filter]);
    }

    private findRootId(event: NostrEvent): string | undefined {
        // Look for root marker in e tags
        for (const tag of event.tags) {
            if (tag[0] === 'e' && tag[3] === 'root') {
                return tag[1];
            }
        }

        // If no root marker, look for first e tag
        const firstETag = event.tags.find(tag => tag[0] === 'e');
        return firstETag?.[1];
    }

    private findParentId(event: NostrEvent): string | undefined {
        // Look for reply marker in e tags
        for (const tag of event.tags) {
            if (tag[0] === 'e' && tag[3] === 'reply') {
                return tag[1];
            }
        }

        // If no reply marker, take the last e tag
        const eTags = event.tags.filter(tag => tag[0] === 'e');
        return eTags[eTags.length - 1]?.[1];
    }

    private createReferences(context: ThreadContext, event: NostrEvent): Reference[] {
        const references: Reference[] = [];

        // Add root reference if exists
        if (context.root) {
            references.push({
                type: TagType.ROOT,
                targetId: context.root.id,
                marker: 'root'
            });
        }

        // Add parent reference if exists
        if (context.parent) {
            references.push({
                type: TagType.REPLY,
                targetId: context.parent.id,
                marker: 'reply'
            });
        }

        // Add other references from e-tags
        for (const tag of event.tags) {
            if (tag[0] === 'e' && tag[1]) {
                // Skip if we already added this as root or parent
                if (tag[1] === context.root?.id || tag[1] === context.parent?.id) {
                    continue;
                }
                references.push({
                    type: TagType.MENTION,
                    targetId: tag[1],
                    marker: tag[3] || undefined
                });
            }
        }

        return references;
    }

    async processThreadEvent(event: NostrEvent): Promise<void> {
        try {
            const context = await this.fetchThreadContext(event.id);
            
            // Process root if exists
            if (context.root) {
                const rootContext: ThreadContext = {
                    replies: [event, ...context.replies]
                };
                const rootRefs = this.createReferences(rootContext, context.root);
                this.eventService.emitNote(context.root, { references: rootRefs });
            }

            // Process parent if exists
            if (context.parent) {
                const parentContext: ThreadContext = {
                    root: context.root,
                    replies: [event, ...context.replies]
                };
                const parentRefs = this.createReferences(parentContext, context.parent);
                this.eventService.emitNote(context.parent, { references: parentRefs });
            }

            // Process target event
            const targetRefs = this.createReferences(context, event);
            this.eventService.emitNote(event, { references: targetRefs });

            // Process replies
            for (const reply of context.replies) {
                const replyContext: ThreadContext = {
                    root: context.root,
                    parent: event,
                    replies: []
                };
                const replyRefs = this.createReferences(replyContext, reply);
                this.eventService.emitNote(reply, { references: replyRefs });
            }

            new Notice(`Processed thread with ${context.replies.length} replies (limited to ${this.settings.batchSize})`);
        } catch (error) {
            console.error('Error processing thread event:', error);
            new Notice('Error processing thread');
        }
    }
}
