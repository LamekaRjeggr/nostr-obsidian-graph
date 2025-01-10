import { Event } from 'nostr-tools';

/**
 * Interface for handling nostr event references
 */
export interface IReference {
    /**
     * Clear all stored references
     */
    clear(): void;

    /**
     * Add a reference between two events
     */
    addReference(from: string, to: string): void;

    /**
     * Add multiple references for an event
     */
    addReferences(from: string, to: string[]): void;

    /**
     * Get outgoing references for an event
     */
    getOutgoingReferences(eventId: string): string[];

    /**
     * Get incoming references for an event
     */
    getIncomingReferences(eventId: string): string[];

    /**
     * Add a profile mention
     */
    addMention(pubkey: string): void;

    /**
     * Get all mentioned profiles
     */
    getAllMentions(): string[];

    /**
     * Get thread context for a note
     */
    getThreadContext(eventId: string): {
        root?: string;
        replyTo?: string;
        replies: string[];
    };

    /**
     * Get references by type (root, reply, mention)
     */
    getReferencesByType(eventId: string): {
        roots: string[];
        replies: string[];
        mentions: string[];
    };

    /**
     * Clear references for a specific note
     */
    clearNote(eventId: string): void;
}
