import { NostrSettings, NostrEvent, RelayConnection } from '../../types';
import { SimplePool, type Filter } from 'nostr-tools';
import { Notice } from 'obsidian';

export class RelayService {
    private pool: SimplePool;
    private settings: NostrSettings;
    private activeRelays: Set<string> = new Set();
    private connecting: boolean = false;
    private initialized: boolean = false;

    constructor(settings: NostrSettings) {
        this.settings = settings;
        this.pool = new SimplePool();
    }

    /**
     * Initialize relay connections
     * This must be called and awaited before using the service
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;
        console.log('[RelayService] Initializing...');
        await this.connectToRelays();
        this.initialized = true;
        console.log('[RelayService] Initialization complete');
    }

    updateSettings(settings: NostrSettings): void {
        console.log('[RelayService] Updating settings');
        this.settings = settings;
        this.reconnectRelays();
    }

    private async connectToRelays(): Promise<void> {
        if (this.connecting) {
            console.log('[RelayService] Already connecting, skipping');
            return;
        }
        
        this.connecting = true;
        console.log('[RelayService] Starting relay connections');

        const enabledRelays = this.settings.relays
            .filter(relay => relay.enabled)
            .map(relay => relay.url);

        if (enabledRelays.length === 0) {
            console.log('[RelayService] No relays enabled');
            new Notice('No relays enabled');
            this.connecting = false;
            return;
        }

        console.log('[RelayService] Connecting to relays:', enabledRelays);
        new Notice('Connecting to relays...');

        // Connect to enabled relays with retry
        let connectedCount = 0;
        for (const url of enabledRelays) {
            if (!this.activeRelays.has(url)) {
                try {
                    console.log(`[RelayService] Connecting to ${url}`);
                    await this.connectWithRetry(url);
                    this.activeRelays.add(url);
                    connectedCount++;
                    console.log(`[RelayService] Connected to ${url}`);
                } catch (error) {
                    console.error(`[RelayService] Failed to connect to relay ${url}:`, error);
                }
            } else {
                connectedCount++;
            }
        }

        // Track which relays are no longer enabled
        this.activeRelays.forEach(url => {
            if (!enabledRelays.includes(url)) {
                console.log(`[RelayService] Removing inactive relay: ${url}`);
                this.activeRelays.delete(url);
            }
        });

        if (connectedCount === 0) {
            console.error('[RelayService] Failed to connect to any relays');
            new Notice('Failed to connect to any relays');
        } else {
            console.log(`[RelayService] Connected to ${connectedCount} relay(s)`);
            new Notice(`Connected to ${connectedCount} relay${connectedCount > 1 ? 's' : ''}`);
        }

        this.connecting = false;
    }

    private async connectWithRetry(url: string, retries = 3): Promise<void> {
        for (let i = 0; i < retries; i++) {
            try {
                await this.pool.ensureRelay(url);
                return;
            } catch (error) {
                console.error(`[RelayService] Retry ${i + 1}/${retries} failed for ${url}:`, error);
                if (i === retries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
        }
    }

    private async reconnectRelays(): Promise<void> {
        console.log('[RelayService] Reconnecting relays');
        this.disconnect();
        this.pool = new SimplePool();
        await this.connectToRelays();
    }

    async subscribe(filters: Filter[]): Promise<NostrEvent[]> {
        if (!this.initialized) {
            console.log('[RelayService] Not initialized, initializing now');
            await this.initialize();
        }

        const enabledRelays = this.settings.relays
            .filter(relay => relay.enabled)
            .map(relay => relay.url);

        if (enabledRelays.length === 0) {
            console.log('[RelayService] No enabled relays');
            new Notice('No enabled relays');
            return [];
        }

        if (this.activeRelays.size === 0) {
            console.log('[RelayService] No active relays, attempting to connect');
            await this.connectToRelays();
            if (this.activeRelays.size === 0) {
                return [];
            }
        }

        try {
            console.log('[RelayService] Subscribing to events with filters:', filters);
            const events = await this.pool.list(Array.from(this.activeRelays), filters);
            console.log(`[RelayService] Received ${events.length} events`);
            return events;
        } catch (error) {
            console.error('[RelayService] Subscription error:', error);
            new Notice('Error fetching from relays');
            return [];
        }
    }

    disconnect(): void {
        console.log('[RelayService] Disconnecting from all relays');
        this.pool.close(Array.from(this.activeRelays));
        this.activeRelays.clear();
        this.initialized = false;
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
        const connected = this.activeRelays.size > 0;
        console.log(`[RelayService] Connection status: ${connected ? 'connected' : 'disconnected'} (${this.activeRelays.size} relays)`);
        return connected;
    }
}
