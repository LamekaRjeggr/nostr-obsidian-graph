import { NostrEvent, Filter, Subscription } from '../../interfaces';
import { SimplePool as NostrSimplePool } from 'nostr-tools';

export class PoolService {
    private pool: NostrSimplePool;

    constructor() {
        this.pool = new NostrSimplePool();
    }

    sub(relayUrls: string[], filters: Filter[]): Subscription {
        let eventCallback: ((event: NostrEvent) => void) | null = null;
        let eoseCallback: ((event: NostrEvent) => void) | null = null;

        const sub = this.pool.subscribeMany(relayUrls, filters, {
            onevent(event: NostrEvent) {
                if (eventCallback) eventCallback(event);
            },
            oneose() {
                if (eoseCallback) eoseCallback({} as NostrEvent);
            }
        });

        return {
            on: (event: string, callback: (event: NostrEvent) => void) => {
                if (event === 'event') {
                    eventCallback = callback;
                } else if (event === 'eose') {
                    eoseCallback = callback;
                }
            },
            unsub: () => {
                sub.close();
            }
        };
    }

    publish(relayUrls: string[], event: NostrEvent): Promise<void>[] {
        return this.pool.publish(relayUrls, event).map(async (promise) => {
            await promise;
        });
    }

    close(relayUrls: string[]): void {
        // SimplePool handles cleanup internally
        this.pool = new NostrSimplePool();
    }
}
