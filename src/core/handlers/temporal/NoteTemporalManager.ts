import { NostrEvent } from '../../../types';
import { ITemporalManager } from '../../interfaces/ITemporalManager';
import { TemporalEventStore } from '../../../services/temporal-event-store';

export class NoteTemporalManager implements ITemporalManager {
    constructor(private temporalStore: TemporalEventStore) {}

    processTemporalOrder(event: NostrEvent) {
        this.temporalStore.storeEvent(event);
        return this.temporalStore.getConnectedEvents(event.id);
    }

    reset(): void {
        this.temporalStore.resetStore();
    }
}
