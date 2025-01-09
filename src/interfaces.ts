import { App, TFile } from 'obsidian';

export interface Filter {
    ids?: string[];
    authors?: string[];
    kinds?: number[];
    since?: number;
    until?: number;
    limit?: number;
    search?: string;
    [key: string]: any;
}

export interface Subscription {
    on: (event: string, callback: (event: NostrEvent) => void) => void;
    unsub: () => void;
}

export interface SimplePool {
    sub: (relays: string[], filters: Filter[]) => Subscription;
    publish: (relays: string[], event: NostrEvent) => Promise<void>[];
    close: (relays: string[]) => void;
}

export interface NostrEvent {
    id: string;
    pubkey: string;
    created_at: number;
    kind: number;
    tags: string[][];
    content: string;
    sig: string;
}

export interface RelationshipCache {
    // Forward references (who references whom)
    references: Map<string, Set<string>>;  // eventId -> Set of referenced eventIds
    // Backward references (who is referenced by whom)
    backlinks: Map<string, Set<string>>;   // eventId -> Set of referencing eventIds
    // Pending references (waiting for content)
    pending: Map<string, Set<string>>;     // missing eventId -> Set of waiting eventIds
}

export interface IIndexService {
    findEventFile(eventId: string): Promise<TFile | null>;
    findEventsByAuthor(pubkey: string): Promise<TFile[]>;
    findEventsByKind(kind: number): Promise<TFile[]>;
    getEventsFromFiles(files: TFile[]): Promise<NostrEvent[]>;
    
    // Relationship methods
    addReference(fromId: string, toId: string): Promise<void>;
    removeReference(fromId: string, toId: string): Promise<void>;
    getReferences(eventId: string): Promise<string[]>;
    getBacklinks(eventId: string): Promise<string[]>;
    getPendingReferences(eventId: string): Promise<string[]>;
    onContentArrived(eventId: string): Promise<void>;
}

// Core Interfaces
export interface IKeyService {
    npubToHex(npub: string): Promise<string>;
    hexToNpub(hex: string): Promise<string>;
}

export interface IRelayService {
    connect(urls: string[]): Promise<void>;
    disconnect(): void;
    ensureConnected(): Promise<void>;
    getConnectedStatus(): boolean;
    getConnectedRelays(): string[];
}

export interface IEventService {
    subscribe(filter: Filter, subscriptionId?: string): void;
    unsubscribe(subscriptionId: string): void;
    publish(event: NostrEvent): Promise<void>;
    on(eventType: string, callback: (event: NostrEvent) => void): void;
    off(eventType: string, callback: (event: NostrEvent) => void): void;
}

// Nostr Services
export interface IProfileService {
    fetchEvent(pubkey: string): Promise<NostrEvent>;
    fetchEvents(pubkeys: string[]): Promise<NostrEvent[]>;
    onEvent(callback: (event: NostrEvent) => void): void;
}

export interface INoteService {
    fetchEvent(id: string): Promise<NostrEvent | null>;
    fetchEvents(filter: Filter): Promise<NostrEvent[]>;
    searchNotes(keyword: string): Promise<NostrEvent[]>;
    onEvent(callback: (event: NostrEvent) => void): void;
    onDelete(callback: (event: NostrEvent) => void): void;
}

export interface IFollowService {
    fetchEvent(pubkey: string): Promise<NostrEvent>;
    fetchEvents(pubkeys: string[]): Promise<NostrEvent[]>;
    onEvent(callback: (event: NostrEvent) => void): void;
}

// File Services
export interface INoteFileService {
    saveNote(event: NostrEvent, targetDir?: string): Promise<void>;
    getNote(id: string): Promise<NostrEvent>;
}

export interface IFollowFileService {
    saveFollow(event: NostrEvent): Promise<void>;
    getFollow(pubkey: string): Promise<NostrEvent>;
}

// Obsidian Services
export interface IObsidianFileService {
    createOrUpdateFile(path: string, content: string): Promise<TFile>;
    readFile(file: TFile): Promise<string>;
    getFrontmatter(content: string): any;
    getFrontmatterFromCache(file: TFile): any;
    createFrontmatter(data: any): string;
}

export interface IProfileFileService {
    saveProfile(event: NostrEvent, directory?: string): Promise<void>;
    getProfile(pubkey: string): Promise<NostrEvent>;
}

export interface IVaultService {
    saveEvent(event: NostrEvent, isFollowedProfile?: boolean, isUserNote?: boolean): Promise<void>;
    getEvent(id: string): Promise<NostrEvent>;
    ensureDirectories(): Promise<void>;
    getEventsByKind(kind: number): Promise<NostrEvent[]>;
    getEventsByAuthor(pubkey: string): Promise<NostrEvent[]>;
}

export interface ILinkService {
    getReferencedProfiles(noteId: string): Promise<string[]>;
    getReferencedNotes(noteId: string): Promise<string[]>;
    getProfileMentions(profileId: string): Promise<string[]>;
    updateLinks(event: NostrEvent): Promise<void>;
}

export interface ProfileReference {
    pubkey: string;
    displayName?: string;
    noteIds: string[];  // Notes referencing this profile
}
