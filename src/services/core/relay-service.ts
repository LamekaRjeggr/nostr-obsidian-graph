import { NostrSettings, NostrEvent, RelayConnection } from '../../types';
import { SimplePool, type Filter } from 'nostr-tools';

export class RelayService {
    private pool: SimplePool;
    private settings: NostrSettings;
    private activeRelays: Set<string> = new Set();

    constructor(settings: NostrSettings) {
        this.settings = settings;
        this.pool = new SimplePool();
        this.connectToRelays();
    }

    updateSettings(settings: NostrSettings): void {
        this.settings = settings;
        this.reconnectRelays();
    }

    private async connectToRelays(): Promise<void> {
        const enabledRelays = this.settings.relays
            .filter(relay => relay.enabled)
            .map(relay => relay.url);

        // Connect to enabled relays
        enabledRelays.forEach(url => {
            if (!this.activeRelays.has(url)) {
                try {
                    this.pool.ensureRelay(url);
                    this.activeRelays.add(url);
                } catch (error) {
                    console.error(`Failed to connect to relay ${url}:`, error);
                }
            }
        });

        // Track which relays are no longer enabled
        this.activeRelays.forEach(url => {
            if (!enabledRelays.includes(url)) {
                this.activeRelays.delete(url);
            }
        });
    }

    private reconnectRelays(): void {
        this.disconnect();
        this.pool = new SimplePool();
        this.connectToRelays();
    }

    async subscribe(filters: Filter[]): Promise<NostrEvent[]> {
        const enabledRelays = this.settings.relays
            .filter(relay => relay.enabled)
            .map(relay => relay.url);

        if (enabledRelays.length === 0) {
            console.warn('No enabled relays');
            return [];
        }

        try {
            const events = await this.pool.list(enabledRelays, filters);
            return events;
        } catch (error) {
            console.error('Subscription error:', error);
            return [];
        }
    }

    disconnect(): void {
        this.pool.close(Array.from(this.activeRelays));
        this.activeRelays.clear();
    }

    getActiveRelays(): string[] {
        return Array.from(this.activeRelays);
    }

    getRelayStatus(url: string): RelayConnection['status'] {
        if (!this.activeRelays.has(url)) {
            return 'disconnected';
        }
        return 'connected';
    }
}
