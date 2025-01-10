import { NostrEvent } from '../../types';
import { TemporalEventStore } from '../temporal-event-store';

export class TemporalChainService {
    private store: TemporalEventStore;

    constructor() {
        this.store = new TemporalEventStore();
    }

    addEvent(event: NostrEvent): void {
        this.store.storeEvent(event);
    }

    getRecentEvents(limit?: number): NostrEvent[] {
        return this.store.getRecentEvents(limit);
    }

    getEventById(id: string): NostrEvent | undefined {
        return this.store.getEventById(id);
    }

    getConnectedEvents(id: string): {
        precedingEvent?: NostrEvent,
        subsequentEvent?: NostrEvent
    } {
        return this.store.getConnectedEvents(id);
    }

    reset(): void {
        this.store.resetStore();
    }

    getEventCount(): number {
        return this.store.getEventCount();
    }

    getProfileStats(pubkey: string) {
        return this.store.getProfileStats(pubkey);
    }
}
