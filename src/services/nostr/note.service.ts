import { INoteService } from '../../interfaces';
import { NostrEvent, Filter } from '../../interfaces';
import { RelayService } from '../core/relay.service';
import { EventService } from '../core/event.service';
import { SearchService, SearchOptions } from '../core/search';

export class NoteService implements INoteService {
    private searchService: SearchService;

    constructor(
        private relayService: RelayService,
        private eventService: EventService
    ) {
        this.searchService = new SearchService(relayService, eventService);
    }

    async searchNotes(keyword: string): Promise<NostrEvent[]> {
        // Use new search service with backward compatible defaults
        return this.searchService.searchKeywordWithTime(keyword, 24, 20);
    }

    /**
     * Enhanced search with more options
     * @param options Search criteria including keyword, time range, and limit
     * @returns Array of matching NostrEvent objects
     */
    async searchWithOptions(options: SearchOptions): Promise<NostrEvent[]> {
        return this.searchService.search(options);
    }

    async fetchEvent(id: string): Promise<NostrEvent | null> {
        await this.relayService.ensureConnected();
        
        const events = await this.fetchEvents({
            ids: [id],
            kinds: [1]
        });
        return events.length > 0 ? events[0] : null;
    }

    async fetchEvents(filter: Filter): Promise<NostrEvent[]> {
        await this.relayService.ensureConnected();
        
        return new Promise((resolve, reject) => {
            const events: NostrEvent[] = [];
            let timeout: NodeJS.Timeout;

            const onEvent = (event: NostrEvent) => {
                events.push(event);
            };

            const onEose = () => {
                this.eventService.off('event', onEvent);
                this.eventService.off('eose', onEose);
                clearTimeout(timeout);
                resolve(events);
            };

            timeout = setTimeout(() => {
                this.eventService.off('event', onEvent);
                this.eventService.off('eose', onEose);
                resolve(events);
            }, 5000);

            this.eventService.on('event', onEvent);
            this.eventService.on('eose', onEose);

            this.eventService.subscribe({
                ...filter,
                kinds: filter.kinds || [1]
            });
        });
    }

    onEvent(callback: (event: NostrEvent) => void): void {
        this.eventService.on('event', callback);
    }

    onDelete(callback: (event: NostrEvent) => void): void {
        this.eventService.on('event', (event: NostrEvent) => {
            if (event.kind === 5) {
                callback(event);
            }
        });
    }
}
