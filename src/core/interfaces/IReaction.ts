import { NostrEvent } from '../../types';

/**
 * Interface for reaction processing and management.
 * Handles likes, zaps, and other reactions to nostr events.
 */
export interface ReactionStats {
    likes: number;
    zaps: number;
    zap_amount: number;
    reactions: NostrEvent[];
}

export interface ReactionResult {
    stats: ReactionStats;
    metadata: {
        targetId: string;
        timestamp: number;
        kind: number;
    };
    obsidian: {
        updated: boolean;
        path?: string;
    };
}

export interface IReaction {
    /**
     * Process a reaction event and update relevant stats
     */
    process(event: NostrEvent): Promise<ReactionResult>;

    /**
     * Add a reaction to the store
     */
    addReaction(event: NostrEvent): void;

    /**
     * Get reaction statistics for a note
     */
    getReactionStats(noteId: string): ReactionStats;

    /**
     * Check if a note has any reactions
     */
    hasReactions(noteId: string): boolean;

    /**
     * Get all reaction events for a note
     */
    getReactionEvents(noteId: string): NostrEvent[];

    /**
     * Process any pending reactions for a note
     */
    processPendingReactions(noteId: string): Promise<void>;

    /**
     * Clear all stored reactions
     */
    clear(): void;
}
