export type HexString = string;

export interface NostrEvent {
    id: HexString;
    pubkey: HexString;
    created_at: number;
    kind: number;
    tags: string[][];
    content: string;
    sig: HexString;
}

export interface NostrSettings {
    npub: string;
    relays: RelayConnection[];
    batchSize: number;
    notesPerProfile: number;
    autoUpdate: boolean;
    updateInterval: number;
    includeOwnNotes: boolean;
    usePublicKeyAsFilename: boolean;
    notesDirectory: string;
    profilesDirectory: string;
    globalLimit?: number;  // For backward compatibility
    directories: {
        main: string;
        contacts?: string;
        mentions?: string;
        cache?: string;
        replies?: string;  // Add optional replies directory
    };
}

export interface RelayConnection {
    url: string;
    enabled: boolean;
    status?: 'connecting' | 'connected' | 'disconnected' | 'error';
}

export interface FetchState {
    count: number;
    mainUserDone: boolean;
    isActive: boolean;
}

export interface ProfileData {
    pubkey: HexString;
    displayName?: string;
    name?: string;
    about?: string;
    picture?: string;
    nip05?: string;
}

export interface ProfileStats {
    noteCount: number;
    oldestNote?: number;
    newestNote?: number;
}

export interface ChronologicalMetadata {
    previousNote?: string;
    nextNote?: string;
    references?: TagReference[];
    referencedBy?: TagReference[];
}

export interface TagReference {
    type: TagType;
    targetId: string;
    marker?: string;
    relayHint?: string;
}

export enum TagType {
    ROOT = 'root',
    REPLY = 'reply',
    MENTION = 'mention',
    TOPIC = 'topic'
}

export interface NoteFile {
    id: string;
    content: string;
    pubkey: string;
    authorName?: string;  // Added author name field
    created_at: number;
    kind: number;
    tags: string[][];
    mentions: string[];
    title: string;
    previousNote?: string;
    nextNote?: string;
    references?: TagReference[];
    referencedBy?: TagReference[];
}
