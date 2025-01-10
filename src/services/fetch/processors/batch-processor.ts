import { NostrEvent, NostrSettings } from '../../../types';
import { RelayService } from '../../../services/core/relay-service';
import { EventStreamHandler } from '../../../services/core/event-stream-handler';
import { type Filter } from 'nostr-tools';
import { EventKinds } from '../../../services/core/base-event-handler';
import { Notice } from 'obsidian';

interface ProfileStats {
    noteCount: number;
    oldestNote?: number;
    newestNote?: number;
}

export class BatchProcessor {
    private profileStats: Map<string, ProfileStats> = new Map();

    constructor(
        private settings: NostrSettings,
        private relayService: RelayService,
        private streamHandler: EventStreamHandler
    ) {}

    private updateProfileStats(event: NostrEvent): void {
        if (event.kind !== EventKinds.NOTE) return;

        const stats = this.profileStats.get(event.pubkey) || {
            noteCount: 0,
            oldestNote: event.created_at,
            newestNote: event.created_at
        };

        stats.noteCount++;
        stats.oldestNote = Math.min(stats.oldestNote!, event.created_at);
        stats.newestNote = Math.max(stats.newestNote!, event.created_at);
        
        this.profileStats.set(event.pubkey, stats);
    }

    private hasNoNotes(pubkey: string): boolean {
        const stats = this.profileStats.get(pubkey);
        return !stats || stats.noteCount === 0;
    }

    private hasNotes(pubkey: string): boolean {
        const stats = this.profileStats.get(pubkey);
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
        let newReactions = 0;

        // Process authors with no notes (70% of batch)
        if (noNotesAuthors.length > 0) {
            const noteLimit = Math.ceil(this.settings.batchSize * 0.7);
            
            // First fetch notes
            const noteFilter: Filter = {
                authors: noNotesAuthors,
                kinds: [EventKinds.NOTE],
                limit: noteLimit
            };

            try {
                const noteEvents = await this.relayService.subscribe([noteFilter]);
                const noteIds = noteEvents.map(event => event.id);

                // Process notes through stream handler
                for (const event of noteEvents) {
                    await this.streamHandler.handleEvent(event);
                    this.updateProfileStats(event);
                    count++;
                    newNotes++;
                }

                // Then fetch reactions targeting these notes
                if (noteIds.length > 0) {
                    const reactionFilter: Filter = {
                        kinds: [EventKinds.REACTION, EventKinds.ZAPS],
                        '#e': noteIds
                    };

                    const reactionEvents = await this.relayService.subscribe([reactionFilter]);
                    for (const event of reactionEvents) {
                        await this.streamHandler.handleEvent(event);
                        newReactions++;
                    }
                }

                // Also fetch outgoing reactions from authors
                const outgoingFilter: Filter = {
                    authors: noNotesAuthors,
                    kinds: [EventKinds.REACTION, EventKinds.ZAPS]
                };

                const outgoingEvents = await this.relayService.subscribe([outgoingFilter]);
                for (const event of outgoingEvents) {
                    await this.streamHandler.handleEvent(event);
                    newReactions++;
                }
            } catch (error) {
                console.error('Error fetching priority events:', error);
                new Notice('Error fetching new events');
            }
        }

        // Process authors with existing notes (30% of batch)
        if (hasNotesAuthors.length > 0) {
            const noteLimit = Math.floor(this.settings.batchSize * 0.3);
            
            // Get oldest note timestamp, defaulting to current time if undefined
            const timestamps = hasNotesAuthors
                .map(a => this.profileStats.get(a)?.oldestNote)
                .filter((t): t is number => t !== undefined);
            const oldestNote = timestamps.length > 0 ? Math.min(...timestamps) : Math.floor(Date.now() / 1000);

            // First fetch notes
            const noteFilter: Filter = {
                authors: hasNotesAuthors,
                kinds: [EventKinds.NOTE],
                limit: noteLimit,
                until: oldestNote
            };

            try {
                const noteEvents = await this.relayService.subscribe([noteFilter]);
                const noteIds = noteEvents.map(event => event.id);

                // Process notes through stream handler
                for (const event of noteEvents) {
                    await this.streamHandler.handleEvent(event);
                    this.updateProfileStats(event);
                    count++;
                    newNotes++;
                }

                // Then fetch reactions targeting these notes
                if (noteIds.length > 0) {
                    const reactionFilter: Filter = {
                        kinds: [EventKinds.REACTION, EventKinds.ZAPS],
                        '#e': noteIds
                    };

                    const reactionEvents = await this.relayService.subscribe([reactionFilter]);
                    for (const event of reactionEvents) {
                        await this.streamHandler.handleEvent(event);
                        newReactions++;
                    }
                }

                // Also fetch outgoing reactions from authors
                const outgoingFilter: Filter = {
                    authors: hasNotesAuthors,
                    kinds: [EventKinds.REACTION, EventKinds.ZAPS],
                    until: oldestNote
                };

                const outgoingEvents = await this.relayService.subscribe([outgoingFilter]);
                for (const event of outgoingEvents) {
                    await this.streamHandler.handleEvent(event);
                    newReactions++;
                }
            } catch (error) {
                console.error('Error fetching historical events:', error);
                new Notice('Error fetching historical events');
            }
        }

        if (newNotes > 0) {
            new Notice(`Fetched ${newNotes} new note${newNotes > 1 ? 's' : ''}`);
        }
        if (newReactions > 0) {
            new Notice(`Processed ${newReactions} reaction${newReactions > 1 ? 's' : ''}`);
        }

        return count;
    }

    reset(): void {
        this.profileStats.clear();
    }
}
