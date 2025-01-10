export enum NostrEventType {
    NOTE = 'note',
    PROFILE = 'profile',
    REACTION = 'reaction',
    ZAP = 'zap',
    POLL = 'poll',
    VOTE = 'vote',
    KEYWORD_SEARCH = 'keyword_search',
    HEX_FETCH = 'hex_fetch',
    THREAD_FETCH = 'thread_fetch',  // Added for thread fetching
    NODE_FETCH = 'node_fetch'       // Added for node-based fetching
}

export interface NodeFetchEvent {
    nodeId: string;           // The node ID to fetch content for
    limit?: number;           // Max number of related events to fetch
}

export interface EventHandler<T = any> {
    handle(event: T): Promise<void>;
    priority: number;
    filter?(event: T): boolean;
    cleanup?(): Promise<void>;
}

export interface EventBusOptions {
    enableLogging?: boolean;
    maxHandlers?: number;
    handlerTimeout?: number;
}

export enum EventError {
    HANDLER_TIMEOUT = 'HANDLER_TIMEOUT',
    HANDLER_ERROR = 'HANDLER_ERROR',
    INVALID_EVENT = 'INVALID_EVENT',
    MAX_HANDLERS_EXCEEDED = 'MAX_HANDLERS_EXCEEDED'
}

export interface EventErrorDetails {
    type: EventError;
    message: string;
    details?: any;
}

export interface EventResult {
    success: boolean;
    error?: EventErrorDetails;
}

export enum SearchScope {
    DIRECT_FOLLOWS = "Direct follows (1 degree)",
    FOLLOWS_OF_FOLLOWS = "Follows of follows (2 degrees)",
    GLOBAL = "Global"
}

export enum TimeRange {
    ALL_TIME = "All time",
    LAST_WEEK = "Last week",
    LAST_MONTH = "Last month",
    LAST_YEAR = "Last year",
    CUSTOM = "Custom range"
}

export enum ContentType {
    ALL = "All types",
    TEXT_ONLY = "Text only",
    WITH_MEDIA = "With media",
    WITH_MENTIONS = "With mentions"
}

export interface SearchSettings {
    scope: SearchScope;
    timeRange: TimeRange;
    contentType: ContentType;
    customStartDate?: number;
    customEndDate?: number;
}

export interface KeywordSearchEvent {
    keywords: string[];
    limit: number;
    searchSettings: SearchSettings;
}

export interface HexFetchEvent {
    hexKey: string;
    limit: number;
}

// New interfaces for thread fetching
export interface ThreadContext {
    root?: string;      // Root event ID
    parent?: string;    // Parent event ID
    replies?: string[]; // Reply event IDs
}

export interface ThreadFetchEvent {
    eventId: string;           // The event ID to fetch thread for
    limit?: number;            // Max number of replies to fetch
    includeContext?: boolean;  // Whether to fetch root/parent
}
