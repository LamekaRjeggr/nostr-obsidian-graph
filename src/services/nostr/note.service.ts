import { INoteService } from '../../interfaces';
import { NostrEvent, Filter } from '../../interfaces';
import { RelayService } from '../core/relay.service';
import { EventService } from '../core/event.service';

export class NoteService implements INoteService {
    constructor(
        private relayService: RelayService,
        private eventService: EventService
    ) {}

    async searchNotes(keyword: string): Promise<NostrEvent[]> {
        await this.relayService.ensureConnected();
        
        return this.fetchEvents({
            kinds: [1],
            search: keyword,
            limit: 20
        });
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
