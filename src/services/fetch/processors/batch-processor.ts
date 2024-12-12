import { NostrEvent, NostrSettings } from '../../../types';
import { RelayService } from '../../../services/core/relay-service';
import { TemporalEventStore } from '../../../services/temporal-event-store';
import { EventStreamHandler } from '../../../services/core/event-stream-handler';
import { type Filter } from 'nostr-tools';
import { EventKinds } from '../../../services/core/base-event-handler';
import { Notice } from 'obsidian';

export class BatchProcessor {
    constructor(
        private settings: NostrSettings,
        private relayService: RelayService,
        private streamHandler: EventStreamHandler,
        private temporalStore: TemporalEventStore
    ) {}

    private hasNoNotes(pubkey: string): boolean {
        const stats = this.temporalStore.getProfileStats(pubkey);
        return !stats || stats.noteCount === 0;
    }

    private hasNotes(pubkey: string): boolean {
        const stats = this.temporalStore.getProfileStats(pubkey);
        return stats !== undefined && stats.noteCount > 0;
    }

    async processBatch(authors: string[], currentCount: number): Promise<number> {
        if (!this.relayService.isConnected()) {
            new Notice('No relay connection available');
            return currentCount;
        }

        // Split authors into two groups
        const noNotesAuthors = authors.filter(a => this.hasNoNotes(a));
        const hasNotesAuthors = authors.filter(a => this.hasNotes(a));

        let count = currentCount;
        let newNotes = 0;

        // Process authors with no notes (70% of batch)
        if (noNotesAuthors.length > 0) {
            const priorityLimit = Math.ceil(this.settings.batchSize * 0.7);
            const priorityFilter: Filter = {
                authors: noNotesAuthors,
                kinds: [EventKinds.NOTE],
                limit: priorityLimit
            };

            try {
                const priorityEvents = await this.relayService.subscribe([priorityFilter]);
                for (const event of priorityEvents) {
                    await this.streamHandler.handleEvent(event);
                    count++;
                    newNotes++;
                }
            } catch (error) {
                console.error('Error fetching priority notes:', error);
                new Notice('Error fetching new notes');
            }
        }

        // Process authors with existing notes (30% of batch)
        if (hasNotesAuthors.length > 0) {
            const regularLimit = Math.floor(this.settings.batchSize * 0.3);
            
            // Get oldest note timestamp, defaulting to current time if undefined
            const timestamps = hasNotesAuthors
                .map(a => this.temporalStore.getProfileStats(a)?.oldestNote)
                .filter((t): t is number => t !== undefined);
            const oldestNote = timestamps.length > 0 ? Math.min(...timestamps) : Math.floor(Date.now() / 1000);

            const regularFilter: Filter = {
                authors: hasNotesAuthors,
                kinds: [EventKinds.NOTE],
                limit: regularLimit,
                until: oldestNote
            };

            try {
                const regularEvents = await this.relayService.subscribe([regularFilter]);
                for (const event of regularEvents) {
                    await this.streamHandler.handleEvent(event);
                    count++;
                    newNotes++;
                }
            } catch (error) {
                console.error('Error fetching historical notes:', error);
                new Notice('Error fetching historical notes');
            }
        }

        if (newNotes > 0) {
            new Notice(`Fetched ${newNotes} new note${newNotes > 1 ? 's' : ''}`);
        }

        return count;
    }
}
