import { NostrEvent, ReactionCounts, NoteFrontmatter } from '../../types';
import { EventService } from '../core/event-service';
import { BaseEventHandler, EventKinds, ProcessingPriority } from '../core/base-event-handler';
import { FrontmatterUtil } from '../file/utils/frontmatter-util';
import { App, TFile, FrontMatterCache } from 'obsidian';

export class ReactionProcessor extends BaseEventHandler {
    private reactionCounts: Map<string, ReactionCounts> = new Map();

    constructor(
        eventService: EventService,
        private app: App
    ) {
        // Use REACTION kind as default, but override validate method
        super(eventService, EventKinds.REACTION, ProcessingPriority.REACTION);
    }

    // Override validate to accept both reaction and zap events
    protected validate(event: NostrEvent): boolean {
        return event && (event.kind === EventKinds.REACTION || event.kind === EventKinds.ZAPS);
    }

    async process(event: NostrEvent): Promise<void> {
        if (!this.validate(event)) return;

        try {
            const targetId = this.getTargetId(event);
            if (!targetId) return;

            // Handle reactions (kind 7)
            if (event.kind === EventKinds.REACTION) {
                await this.processReaction(event, targetId);
            }
            // Handle zaps (kind 9735)
            else if (event.kind === EventKinds.ZAPS) {
                await this.processZap(event, targetId);
            }
        } catch (error) {
            console.error('Error processing reaction:', error);
        }
    }

    private getTargetId(event: NostrEvent): string | null {
        const eTags = event.tags.filter(tag => tag[0] === 'e');
        return eTags.length > 0 ? eTags[0][1] : null;
    }

    private getCounts(noteId: string): ReactionCounts {
        if (!this.reactionCounts.has(noteId)) {
            this.reactionCounts.set(noteId, {
                likes: 0,
                zaps: 0,
                zap_amount: 0
            });
        }
        return this.reactionCounts.get(noteId)!;
    }

    private async processReaction(event: NostrEvent, targetId: string): Promise<void> {
        // Only count '+' reactions as likes
        if (event.content === '+') {
            const counts = this.getCounts(targetId);
            counts.likes++;
            await this.updateFrontmatter(targetId, counts);
        }
    }

    private async processZap(event: NostrEvent, targetId: string): Promise<void> {
        try {
            const zapContent = JSON.parse(event.content);
            const amount = Number(zapContent.amount) || 0;
            
            if (amount > 0) {
                const counts = this.getCounts(targetId);
                counts.zaps++;
                counts.zap_amount += amount;
                await this.updateFrontmatter(targetId, counts);
            }
        } catch (error) {
            console.error('Error processing zap:', error);
        }
    }

    private async updateFrontmatter(noteId: string, counts: ReactionCounts): Promise<void> {
        try {
            const filePath = `nostr/notes/${noteId}.md`;
            const file = this.app.vault.getAbstractFileByPath(filePath);
            
            if (!(file instanceof TFile)) return;

            // Get existing content and frontmatter
            const cache = this.app.metadataCache.getFileCache(file);
            if (!cache) return;

            const existingFrontmatter = cache.frontmatter || {} as FrontMatterCache & {
                likes?: number;
                zaps?: number;
                zap_amount?: number;
            };

            const content = await this.app.vault.read(file);
            const [_, ...contentParts] = content.split('---\n').filter(Boolean);

            // Create updated frontmatter preserving existing fields
            const updatedFrontmatter = {
                ...existingFrontmatter,
                likes: (existingFrontmatter.likes || 0) + counts.likes,
                zaps: (existingFrontmatter.zaps || 0) + counts.zaps,
                zap_amount: (existingFrontmatter.zap_amount || 0) + counts.zap_amount
            };

            // Create new content with updated frontmatter
            const newContent = [
                '---',
                FrontmatterUtil.formatFrontmatter(updatedFrontmatter),
                '---',
                ...contentParts
            ].join('\n');

            // Use vault API to modify file
            await this.app.vault.modify(file, newContent);

            // Reset counts after successful update
            this.reactionCounts.delete(noteId);
        } catch (error) {
            console.error('Error updating frontmatter:', error);
        }
    }

    public reset(): void {
        this.reactionCounts.clear();
    }
}
