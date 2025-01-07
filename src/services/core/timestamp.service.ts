import { NostrEvent } from '../../interfaces';

/**
 * Core service for timestamp formatting
 */
export class TimestampService {
    /**
     * Formats a Nostr event timestamp into ISO string
     * @param event The Nostr event
     * @returns ISO formatted timestamp string
     */
    static formatTimestamp(event: NostrEvent): string {
        const date = new Date(event.created_at * 1000);
        return date.toISOString();
    }

    /**
     * Formats a Nostr event timestamp into human readable format
     * @param event The Nostr event
     * @returns Human readable timestamp string
     */
    static formatReadableTimestamp(event: NostrEvent): string {
        const date = new Date(event.created_at * 1000);
        return date.toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZoneName: 'short'
        });
    }
}
