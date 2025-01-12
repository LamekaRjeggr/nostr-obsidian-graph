import { Event } from 'nostr-tools';

export interface TemporalResult {
    metadata: {
        created_at: string;
        created: number;
    };
}

/**
 * Processes temporal metadata for nostr events.
 * Only handles timestamp formatting and storage.
 */
export class TemporalProcessor {
    /**
     * Process temporal metadata for a nostr event
     */
    async process(event: Event): Promise<TemporalResult> {
        const timestamp = event.created_at;
        const created_at = new Date(timestamp * 1000).toISOString();

        return {
            metadata: {
                created_at,
                created: timestamp
            }
        };
    }
}
