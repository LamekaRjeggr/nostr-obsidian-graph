export type HexString = string;

export interface RelayConnection {
    url: string;
    enabled: boolean;
    status?: 'connecting' | 'connected' | 'disconnected' | 'error';
}

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
    notesPerProfile: number;
    globalLimit?: number;
    // File paths
    profilesDirectory: string;
    notesDirectory: string;
    // Auto-update settings
    autoUpdate: boolean;
    updateInterval: number;
    includeOwnNotes: boolean;
    // Directory structure
    directories: {
        main: string;
        contacts: string;
        mentions: string;
        cache: string;
    };
}

export interface BasicWebSocket {
    send(data: string): void;
    close(): void;
    onmessage?: ((event: {data: any}) => void) | null;
    onclose?: (() => void) | null;
    onerror?: ((error: any) => void) | null;
    onopen?: (() => void) | null;
    readyState: number;
}
