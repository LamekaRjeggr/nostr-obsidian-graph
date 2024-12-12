import { NostrEvent } from '../types';
import { TemporalChainService } from './temporal/temporal-chain-service';

/**
 * @deprecated Use TemporalChainService instead.
 * This class maintains backwards compatibility while delegating to new implementation.
 */
export class ChronologicalChain {
    private chainService: TemporalChainService;

    constructor() {
        this.chainService = new TemporalChainService();
    }

    add(event: NostrEvent): void {
        this.chainService.addEvent(event);
    }

    getLatest(limit?: number): NostrEvent[] {
        return this.chainService.getRecentEvents(limit);
    }

    getEvent(id: string): NostrEvent | undefined {
        return this.chainService.getEventById(id);
    }

    getLinkedEvents(id: string): {
        previous?: NostrEvent,
        next?: NostrEvent
    } {
        const connected = this.chainService.getConnectedEvents(id);
        return {
            previous: connected.precedingEvent,
            next: connected.subsequentEvent
        };
    }

    clear(): void {
        this.chainService.reset();
    }

    size(): number {
        return this.chainService.getEventCount();
    }
}
