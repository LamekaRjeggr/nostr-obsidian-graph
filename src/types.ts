export enum TagType {
    MENTION = "mention",
    REPLY = "reply",
    ROOT = "root",
    TOPIC = "topic"
}

export interface TagReference {
    type: TagType;
    targetId: string;
    marker?: string;
    relayHint?: string;
    position?: number;
}

export interface NoteFile {
    id: string;
    title: string;
    content: string;
    tags: string[];
}

export interface NostrSettings {
    npub: string;
    relays: RelayConfig[];
    notesPerProfile: number;
    batchSize: number;
    notesDirectory: string;
    profilesDirectory: string;
    autoUpdate: boolean;
    updateInterval: number;
    includeOwnNotes: boolean;
    usePublicKeyAsFilename: boolean;
    directories: {
        main: string;
        replies?: string;
    };
}

export interface RelayConfig {
    url: string;
    enabled: boolean;
}

export interface NostrEvent {
    id: string;
    pubkey: string;
    created_at: number;
    kind: number;
    tags: string[][];
    content: string;
    sig?: string;
}

export interface ProfileData {
    pubkey: string;
    displayName?: string;
    name?: string;
    about?: string;
    picture?: string;
    nip05?: string;
}

export interface ChronologicalMetadata {
    previousNote?: string;
    nextNote?: string;
    references?: Reference[];
    referencedBy?: Reference[];
}

export interface Reference {
    type: string;
    targetId: string;
    marker?: string;
    relayHint?: string;
    position?: number;
}

export interface NoteFrontmatter {
    id: string;
    pubkey: string;
    author?: string;
    created: number;
    kind: number;
    nostr_tags: string[][];
    tags: string[];
    root?: string;
    reply_to?: string;
    mentions?: string[];
    topics?: string[];
    [key: string]: any;  // Allow additional fields
}

export interface ProfileFrontmatter {
    aliases: string[];
    name?: string;
    display_name?: string;
    nip05?: string;
    picture?: string;
    [key: string]: any;  // Allow additional fields
}

export interface ReactionCounts {
    likes: number;
    zaps: number;
    zap_amount: number;
}

export interface ProfileStats {
    noteCount: number;
    oldestNote?: number;
    newestNote?: number;
}

export interface RelayConnection {
    status: 'connected' | 'disconnected';
}
