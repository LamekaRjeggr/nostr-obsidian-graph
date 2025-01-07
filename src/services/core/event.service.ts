import { IEventService } from '../../interfaces';
import { NostrEvent, Filter, SimplePool, Subscription } from '../../interfaces';
import { PoolService } from './pool.service';
import { EventEmitter } from './event-emitter';
import { RelayService } from './relay.service';

interface StoredSubscription {
    filter: Filter;
    unsubscribe: () => void;
}

export class EventService implements IEventService {
    private emitter: EventEmitter;
    private subscriptions: Map<string, StoredSubscription>;
    private relayService: RelayService;
    private pool: SimplePool;

    constructor(relayService: RelayService) {
        this.relayService = relayService;
        this.emitter = new EventEmitter();
        this.subscriptions = new Map();
        this.pool = new PoolService();
    }

    async subscribe(filter: Filter, subscriptionId?: string): Promise<void> {
        await this.relayService.ensureConnected();
        
        const subId = subscriptionId || Math.random().toString(36).substring(7);
        const relays = this.relayService.getConnectedRelays();
        
        const sub = this.pool.sub(relays, [filter]);
        
        sub.on('event', (event: NostrEvent) => {
            this.emitter.emit('event', event);
        });

        sub.on('eose', () => {
            setTimeout(() => {
                this.emitter.emit('eose');
            }, 100);
        });

        // Store subscription for cleanup
        this.subscriptions.set(subId, {
            filter,
            unsubscribe: () => sub.unsub()
        });
    }

    unsubscribe(subscriptionId: string): void {
        const sub = this.subscriptions.get(subscriptionId);
        if (sub) {
            sub.unsubscribe();
            this.subscriptions.delete(subscriptionId);
        }
    }

    async publish(event: NostrEvent): Promise<void> {
        await this.relayService.ensureConnected();
        const relays = this.relayService.getConnectedRelays();
        const promises = this.pool.publish(relays, event);
        await Promise.all(promises); // Wait for all publish operations to complete
    }

    on(eventType: string, callback: (event: NostrEvent) => void): void {
        this.emitter.on(eventType, callback);
    }

    off(eventType: string, callback: (event: NostrEvent) => void): void {
        this.emitter.off(eventType, callback);
    }
}
