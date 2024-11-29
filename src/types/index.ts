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

export interface NostrProfile {
    pubkey: HexString;
    name?: string;
    about?: string;
    picture?: string;
    nip05?: string;
    [key: string]: any;
}

export interface NostrSettings {
    relays: RelayConnection[];
    defaultPubkey?: string;
    npub: string;
    notesPerProfile: number;
    profilesDirectory: string;
    notesDirectory: string;
    autoUpdate: boolean;
    updateInterval: number;
    includeOwnNotes: boolean;  // Whether to include notes from the central npub
}

export interface RelayConnection {
    url: string;
    enabled: boolean;
    status?: string;
    error?: string;
    ws?: BasicWebSocket;
}

export interface SubscriptionOptions {
    skipVerification?: boolean;
    id?: string;
    filters?: any;
    relayUrls?: string[];
    timeout?: number;
}

export interface NoteFile {
    id: HexString;
    content: string;
    pubkey: HexString;
    created_at: number;
    tags: string[][];
    mentions: string[];
}

export interface ProfileFile {
    profile: NostrProfile;
    lastUpdated: number;
    noteIds: string[];  // Store note IDs instead of full notes
    connectionIds: string[];  // Store connection pubkeys instead of full connections
}

export interface ProfileData {
    profile: NostrProfile;
    lastUpdated: number;
    notes: NoteFile[];
    connections: RelayConnection[];
}

export interface FileOperationResult {
    success: boolean;
    error?: string;
}

export interface BasicWebSocket {
    send(data: string): void;
    close(): void;
    onmessage?: ((event: MessageEvent) => void) | null;
    onclose?: ((event: CloseEvent) => void) | null;
    onerror?: ((event: ErrorEvent) => void) | null;
    onopen?: (() => void) | null;
    readyState: number;
}

export interface MessageEvent {
    data: any;
}

export interface CloseEvent {
    code: number;
    reason: string;
    wasClean: boolean;
}

export interface ErrorEvent {
    error: any;
    message: string;
    type: string;
}

export interface ValidationDetails {
    hasId: boolean;
    hasPubkey: boolean;
    hasCreatedAt: boolean;
    hasKind: boolean;
    hasTags: boolean;
    hasContent: boolean;
    hasSig: boolean;
    idValid: boolean;
    pubkeyValid: boolean;
    sigValid: boolean;
}

export interface HexFieldValidation {
    isValid: boolean;
    error?: string;
    value?: string;
    length?: number;
    expectedLength?: number;
}

export interface EventValidation {
    isValid: boolean;
    error?: string;
    details: ValidationDetails;
}

export interface ContactList {
    pubkey: string;
    contacts: string[];
}

export interface NotesFilter {
    authors: string[];
    excludeAuthor?: string;
    limit?: number;
    since?: number;
    until?: number;
}
