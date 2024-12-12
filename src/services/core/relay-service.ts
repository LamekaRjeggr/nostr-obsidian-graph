import { NostrSettings, NostrEvent, RelayConnection } from '../../types';
import { SimplePool, type Filter } from 'nostr-tools';
import { Notice } from 'obsidian';

export class RelayService {
    private pool: SimplePool;
    private settings: NostrSettings;
    private activeRelays: Set<string> = new Set();
    private connecting: boolean = false;

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
        if (this.connecting) return;
        this.connecting = true;

        const enabledRelays = this.settings.relays
            .filter(relay => relay.enabled)
            .map(relay => relay.url);

        if (enabledRelays.length === 0) {
            new Notice('No relays enabled');
            this.connecting = false;
            return;
        }

        new Notice('Connecting to relays...');

        // Connect to enabled relays
        let connectedCount = 0;
        for (const url of enabledRelays) {
            if (!this.activeRelays.has(url)) {
                try {
                    await this.pool.ensureRelay(url);
                    this.activeRelays.add(url);
                    connectedCount++;
                } catch (error) {
                    console.error(`Failed to connect to relay ${url}:`, error);
                }
            } else {
                connectedCount++;
            }
        }

        // Track which relays are no longer enabled
        this.activeRelays.forEach(url => {
            if (!enabledRelays.includes(url)) {
                this.activeRelays.delete(url);
            }
        });

        if (connectedCount === 0) {
            new Notice('Failed to connect to any relays');
        } else {
            new Notice(`Connected to ${connectedCount} relay${connectedCount > 1 ? 's' : ''}`);
        }

        this.connecting = false;
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
            new Notice('No enabled relays');
            return [];
        }

        if (this.activeRelays.size === 0) {
            await this.connectToRelays();
            if (this.activeRelays.size === 0) {
                return [];
            }
        }

        try {
            const events = await this.pool.list(Array.from(this.activeRelays), filters);
            return events;
        } catch (error) {
            console.error('Subscription error:', error);
            new Notice('Error fetching from relays');
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

    isConnected(): boolean {
        return this.activeRelays.size > 0;
    }
}
