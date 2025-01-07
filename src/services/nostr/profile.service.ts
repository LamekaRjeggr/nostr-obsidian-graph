import { IProfileService } from '../../interfaces';
import { NostrEvent } from '../../interfaces';
import { RelayService } from '../core/relay.service';
import { EventService } from '../core/event.service';

export class ProfileService implements IProfileService {
    constructor(
        private relayService: RelayService,
        private eventService: EventService
    ) {}

    async fetchEvent(pubkey: string): Promise<NostrEvent> {
        await this.relayService.ensureConnected();
        
        const events = await this.fetchEvents([pubkey]);
        if (events.length === 0) {
            throw new Error(`No profile found for ${pubkey}`);
        }
        return events[0];
    }

    async fetchEvents(pubkeys: string[]): Promise<NostrEvent[]> {
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
                kinds: [0],
                authors: pubkeys
            });
        });
    }

    onEvent(callback: (event: NostrEvent) => void): void {
        this.eventService.on('event', callback);
    }
}
