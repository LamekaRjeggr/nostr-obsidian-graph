import { Filter, Event } from 'nostr-tools';

/**
 * Interface for fetching nostr events from relays
 */
export interface IEventFetcher {
    /**
     * Fetch events matching the given filter
     * @param filter nostr-tools Filter object
     * @returns Promise resolving to array of events
     */
    fetchEvents(filter: Filter): Promise<Event[]>;

    /**
     * Subscribe to events matching the filter
     * @param filters Array of nostr-tools Filter objects
     * @returns Promise resolving to array of events
     */
    subscribe(filters: Filter[]): Promise<Event[]>;

    /**
     * Check if connected to relays
     */
    isConnected(): boolean;

    /**
     * Close any open subscriptions
     */
    close(): Promise<void>;
}
