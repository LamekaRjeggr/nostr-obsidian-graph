import { NostrEvent } from '../types';
import { TemporalEventStore } from './temporal-event-store';

// This class maintains backwards compatibility while delegating to new implementation
export class ChronologicalChain {
    private store: TemporalEventStore;

    constructor() {
        this.store = new TemporalEventStore();
    }

    // Legacy method names map to new implementation
    add(event: NostrEvent): void {
        this.store.storeEvent(event);
    }

    getLatest(limit?: number): NostrEvent[] {
        return this.store.getRecentEvents(limit);
    }

    getEvent(id: string): NostrEvent | undefined {
        return this.store.getEventById(id);
    }

    // New method that enables chronological linking
    getLinkedEvents(id: string): {
        previous?: NostrEvent,
        next?: NostrEvent
    } {
        const connected = this.store.getConnectedEvents(id);
        return {
            previous: connected.precedingEvent,
            next: connected.subsequentEvent
        };
    }

    clear(): void {
        this.store.resetStore();
    }

    size(): number {
        return this.store.getEventCount();
    }
}
