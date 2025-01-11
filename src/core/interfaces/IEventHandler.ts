import { Event } from 'nostr-tools';

/**
 * Interface for handling specific types of nostr events
 */
export interface IEventHandler {
    /**
     * The kind of nostr event this handler processes
     */
    readonly kind: number;

    /**
     * Processing priority (lower numbers = higher priority)
     * Ensures correct order: profiles -> contacts -> notes
     */
    readonly priority: number;

    /**
     * Process a single nostr event
     * @param event The nostr event to process
     * @returns Promise that resolves when processing is complete
     */
    process(event: Event): Promise<void>;

    /**
     * Validate if this handler can process the event
     * @param event The event to validate
     * @returns boolean indicating if event can be processed
     */
    validate(event: Event): boolean;

    /**
     * Clean up any resources used by this handler
     */
    cleanup(): Promise<void>;
}

/**
 * Priority levels for event processing
 */
export enum ProcessingPriority {
    PROFILE = 1,   // Process profiles first
    CONTACT = 2,   // Then contacts
    NOTE = 3,      // Then notes
    REACTION = 4   // Finally reactions
}
