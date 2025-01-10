export interface NostrSettings {
    npub: string;
    relays: RelaySettings[];
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
        replies: string;
    };
    polls: {
        enabled: boolean;
        directory: string;
        autoUpdate: boolean;
    };
    hexFetch?: {
        batchSize: number;  // Must have a value when hexFetch exists
    };
    threadSettings?: {
        limit: number;
        includeContext: boolean;
    };
}

export interface RelaySettings {
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
    sig: string;
}

export interface ProfileData {
    pubkey: string;
    name?: string;
    displayName?: string;
    nip05?: string;
    picture?: string;
    about?: string;
}

export interface ChronologicalMetadata {
    previousNote?: string;
    nextNote?: string;
    references?: Reference[];
    referencedBy?: Reference[];
}

export interface PollFrontmatter {
    id: string;
    question: string;
    options: string[];
    multiple_choice?: boolean;
    created_at: number;
    closed_at?: number;
}

export type TagReference = Reference;

export interface Reference {
    id?: string;
    type: TagType;
    marker?: string;
    targetId?: string;
}

export enum TagType {
    EVENT = 'e',
    PUBKEY = 'p',
    TAG = 't',
    REFERENCE = 'r',
    ROOT = 'root',
    REPLY = 'reply',
    MENTION = 'mention',
    TOPIC = 'topic'
}

export interface ThreadContext {
    root?: string;
    parent?: string;
    replies?: string[];
}

export interface EventMetadata {
    references: Reference[];
    referencedBy: Reference[];
    threadContext?: ThreadContext;
}
