import { App } from 'obsidian';
import { NostrEvent } from '../../types';
import { BaseEventHandler, EventKinds, ProcessingPriority } from '../core/base-event-handler';
import { EventService } from '../core/event-service';
import { FileService } from '../core/file-service';
import { TagProcessor } from './tag-processor';
import { EventHandler } from '../../experimental/event-bus/types';

export interface ReactionStats {
    likes: number;
}

interface PendingUpdate {
    likes: number;
    events: NostrEvent[];
    title: string;
}

/**
 * Processes reaction events (kind 7) using existing tools:
 * - TagProcessor for extracting targets
 * - FileService for frontmatter updates
 * - EventBus for coordination
 */
export class ReactionProcessor extends BaseEventHandler implements EventHandler<NostrEvent> {
    private tagProcessor: TagProcessor;
    private pendingReactions: Map<string, NostrEvent[]> = new Map();
    private pendingUpdates: Map<string, PendingUpdate> = new Map();
    private updateTimeout: NodeJS.Timeout | null = null;
    private readonly BATCH_INTERVAL = 1000; // 1 second batching window

    constructor(
        eventService: EventService,
        private app: App,
        private fileService: FileService
    ) {
        super(eventService, EventKinds.REACTION, ProcessingPriority.REACTION);
        this.tagProcessor = new TagProcessor();
    }

    // Override to handle reactions
    getKinds(): number[] {
        return [EventKinds.REACTION];
    }

    // Override validate to accept reaction events
    protected validate(event: NostrEvent): boolean {
        return event && event.kind === EventKinds.REACTION;
    }

    // Implement EventHandler interface
    async handle(event: NostrEvent): Promise<void> {
        return this.process(event);
    }

    // Implement filter for EventHandler
    filter(event: NostrEvent): boolean {
        return this.validate(event);
    }

    // Implement priority for EventHandler
    priority = ProcessingPriority.REACTION;

    // Implement cleanup for EventHandler
    async cleanup(): Promise<void> {
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
            this.updateTimeout = null;
        }
        await this.flushUpdates();
        this.reset();
        return Promise.resolve();
    }

    async process(event: NostrEvent): Promise<void> {
        if (!this.validate(event)) return;

        try {
            // Use TagProcessor to extract target
            const tagResult = this.tagProcessor.process(event);
            const targetId = tagResult.references[0]; // First e-tag is the target
            if (!targetId) return;

            // Get note title from FileService
            const title = await this.fileService.getTitleById(targetId);
            if (!title) {
                // Queue reaction for later processing
                this.queuePendingReaction(targetId, event);
                return;
            }

            // Queue update with title
            this.queueUpdate(targetId, event, title);

            // Schedule flush if not already scheduled
            if (!this.updateTimeout) {
                this.updateTimeout = setTimeout(() => this.flushUpdates(), this.BATCH_INTERVAL);
            }

        } catch (error) {
            console.error('Error processing reaction:', error);
        }
    }

    private queueUpdate(targetId: string, event: NostrEvent, title: string): void {
        const update = this.pendingUpdates.get(targetId) || { likes: 0, events: [], title };
        update.likes++;
        update.events.push(event);
        this.pendingUpdates.set(targetId, update);
    }

    private async flushUpdates(): Promise<void> {
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
            this.updateTimeout = null;
        }

        for (const [targetId, update] of this.pendingUpdates.entries()) {
            try {
                // Get fresh metadata at time of update
                const metadata = await this.fileService.getNostrMetadata(`${update.title}.md`);
                if (!metadata) continue;

                // Update metadata with new like count
                const updatedMetadata = {
                    ...metadata,
                    likes: (metadata.likes || 0) + update.likes
                };

                // Save updated metadata
                await this.fileService.saveNote({
                    ...update.events[0], // Use first event for metadata
                    id: targetId
                }, {
                    ...updatedMetadata,
                    references: [], // No references to update
                    referencedBy: [] // No backlinks to update
                });

                // Emit events after successful save
                for (const event of update.events) {
                    await this.eventService.emitReaction(event);
                }
            } catch (error) {
                console.error(`Error updating reactions for ${targetId}:`, error);
            }
        }

        this.pendingUpdates.clear();
    }

    private queuePendingReaction(targetId: string, event: NostrEvent): void {
        if (!this.pendingReactions.has(targetId)) {
            this.pendingReactions.set(targetId, []);
        }
        this.pendingReactions.get(targetId)!.push(event);
    }

    async processPendingReactions(noteId: string): Promise<void> {
        const pending = this.pendingReactions.get(noteId);
        if (pending) {
            console.log(`Processing ${pending.length} pending reactions for note ${noteId}`);
            for (const event of pending) {
                await this.process(event);
            }
            this.pendingReactions.delete(noteId);
        }
    }

    public reset(): void {
        this.pendingReactions.clear();
        this.pendingUpdates.clear();
    }
}
