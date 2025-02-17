export type HexString = string;

export interface NostrSettings {
    npub: string;
    relays: RelaySettings[];
    notesPerProfile: number;
    batchSize: number;
    autoUpdate: boolean;
    updateInterval: number;
    includeOwnNotes: boolean;
    usePublicKeyAsFilename: boolean;
    polls: {
        enabled: boolean;
        autoUpdate: boolean;
    };
    hexFetch?: {
        batchSize: number;  // Must have a value when hexFetch exists
    };
    threadSettings?: {
        limit: number;
        includeContext: boolean;
    };
    cache?: {
        maxSize: number;        // Maximum number of entries in cache
        maxAge: number;         // Maximum age of cache entries in milliseconds
        enabled: boolean;       // Whether to use cache
        persistToDisk: boolean; // Whether to save cache to disk
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

export interface NostrProfile {
    pubkey: string;
    name?: string;
    nip05?: string;
    picture?: string;
    about?: string;
}

export interface ProfileData extends NostrProfile {
    displayName?: string;
}

export interface NoteMetadata {
    references?: Reference[];
    referencedBy?: Reference[];
    created_at?: string;
    created?: number;
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

export interface ThreadContextWithReplies extends ThreadContext {
    replies: string[];
}

export interface ContactOptions {
    include: boolean;           // Include contact fetching
    fetchProfiles: boolean;     // Fetch contact profiles
    linkInGraph: boolean;       // Create bidirectional links
}

export interface EnhancedMetadataOptions {
    reactions?: boolean;    // Process reactions
    titles?: boolean;       // Cache titles
}

export interface EventMetadata {
    references: Reference[];
    referencedBy: Reference[];
    threadContext?: ThreadContext;
    contacts?: string[];        // Contact pubkeys
    contactProfiles?: string[]; // Contact profile references
}

export interface NoteFile {
    id: string;
    pubkey: string;
    title?: string;
    content: string;
    created_at: number;
    kind?: number;
    tags: string[][];
    authorName?: string;
    references?: Reference[];
    referencedBy?: Reference[];
    mentions?: string[];
}

export interface RelayConnection {
    url: string;
    enabled: boolean;
    status: 'connected' | 'disconnected';
}

export interface SubscriptionOptions {
    filters?: {
        kinds?: number[];
        authors?: string[];
        '#e'?: string[];
        limit?: number;
    }[];
}

export interface GroupedReferences {
    [TagType.EVENT]?: TagReference[];
    [TagType.PUBKEY]?: TagReference[];
    [TagType.TAG]?: TagReference[];
    [TagType.REFERENCE]?: TagReference[];
    [TagType.ROOT]?: TagReference[];
    [TagType.REPLY]?: TagReference[];
    [TagType.MENTION]?: TagReference[];
    [TagType.TOPIC]?: TagReference[];
}

export interface FetchOptions {
    kinds: number[];
    limit: number;
    filter?: (event: NostrEvent) => boolean;
    since?: number;
    until?: number;
    author?: string;
    authors?: string[];        // Multiple authors (e.g. for contacts)
    ids?: string[];
    tags?: [string, string][];
    search?: string[];
    skipSave?: boolean;
    enhanced?: EnhancedMetadataOptions;  // Optional enhanced features
    contacts?: ContactOptions;  // Optional contact handling
}

// New types for thread fetching
export enum ThreadFetchMode {
    SINGLE = 'single',
    AUTHOR = 'author',
    VAULT = 'vault'
}

export interface ThreadFetchOptions {
    mode: ThreadFetchMode;
    eventId?: string;          // For single mode
    authorId?: string;         // For author mode
    limit?: number;            // Max number of notes to process
    batchSize?: number;        // Batch size for processing
    includeContext?: boolean;  // Include root/parent notes
}

export interface ThreadFetchProgress {
    total: number;
    processed: number;
    succeeded: number;
    failed: number;
}

export interface CacheStats {
    hits: number;
    misses: number;
    evictions: number;
    size: number;
    maxSize: number;
}

export interface UnifiedFetchSettings {
    thread: {
        limit: number;
        includeContext?: boolean;
    };
}
