import { TFile } from 'obsidian';
import { Filter } from './interfaces';

// Settings Types
export interface Settings {
    relays: RelayConfig[];
    directories: DirectoryConfig;
    autoSync: boolean;
    updateInterval: number;
    pubkey: string; // User's nostr public key (npub format)
}

export const DEFAULT_SETTINGS: Settings = {
    relays: [
        { url: 'wss://relay.damus.io', enabled: true },
        { url: 'wss://nos.lol', enabled: true },
        { url: 'wss://relay.nostr.band', enabled: true }
    ],
    directories: {
        events: 'nostr/events'
    },
    autoSync: true,
    updateInterval: 60, // seconds
    pubkey: '' // Will be set by user in settings
};

export interface RelayConfig {
    url: string;
    enabled: boolean;
}

export interface DirectoryConfig {
    events: string;
}

export interface FilterOptions extends Filter {
    tags?: {
        [key: string]: string[]; // For 'p' tags, values are hex-encoded pubkeys
    };
}
