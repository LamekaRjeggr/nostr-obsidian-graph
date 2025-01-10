import { NostrEvent } from '../../types';
import { EventKinds } from '../core/base-event-handler';

interface ReactionStats {
    likes: number;
    zaps: number;
    zap_amount: number;
    reactions: NostrEvent[];  // Store actual reaction events
}

export class ReactionStore {
    private reactionsByNote: Map<string, ReactionStats> = new Map();

    constructor() {}

    addReaction(event: NostrEvent): void {
        const targetId = this.getTargetId(event);
        if (!targetId) return;

        console.log(`Adding reaction to store for note ${targetId}:`, event);

        let stats = this.reactionsByNote.get(targetId) || {
            likes: 0,
            zaps: 0,
            zap_amount: 0,
            reactions: []
        };

        // Process based on event kind
        if (event.kind === EventKinds.REACTION) {
            if (event.content === '+') {
                stats.likes++;
            }
        } else if (event.kind === EventKinds.ZAPS) {
            try {
                if (event.content) {
                    const zapContent = JSON.parse(event.content);
                    const amount = Number(zapContent.amount) || 0;
                    if (amount > 0) {
                        stats.zaps++;
                        stats.zap_amount += amount;
                    }
                }
            } catch (error) {
                console.error('Error processing zap content:', error);
            }
        }

        // Store the reaction event
        stats.reactions.push(event);
        this.reactionsByNote.set(targetId, stats);

        console.log(`Updated reaction stats for note ${targetId}:`, stats);
    }

    getReactionStats(noteId: string): ReactionStats {
        return (
            this.reactionsByNote.get(noteId) || {
                likes: 0,
                zaps: 0,
                zap_amount: 0,
                reactions: []
            }
        );
    }

    hasReactions(noteId: string): boolean {
        const stats = this.reactionsByNote.get(noteId);
        return !!(stats && (stats.likes > 0 || stats.zaps > 0));
    }

    getReactionEvents(noteId: string): NostrEvent[] {
        return this.getReactionStats(noteId).reactions;
    }

    private getTargetId(event: NostrEvent): string | null {
        const eTags = event.tags.filter(tag => tag[0] === 'e');
        return eTags.length > 0 ? eTags[0][1] : null;
    }

    clear(): void {
        this.reactionsByNote.clear();
    }
}
