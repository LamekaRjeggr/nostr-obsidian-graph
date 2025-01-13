import { SearchScope, TimeRange, ContentType } from './types';

export interface UnifiedFetchSettings {
    // Core settings
    notesPerProfile: number;
    batchSize: number;
    includeOwnNotes: boolean;

    // Enhanced settings
    enhanced?: {
        titles?: boolean;
        reactions?: boolean;
        metadata?: boolean;
    };

    // Contact settings
    contacts?: {
        include: boolean;
        fetchProfiles: boolean;
        linkInGraph: boolean;
    };

    // Thread settings
    thread?: {
        limit: number;
        includeContext: boolean;
        fetchReplies: boolean;
    };

    // Search settings
    search?: {
        scope: SearchScope;
        timeRange: TimeRange;
        contentType: ContentType;
        customStartDate?: number;
        customEndDate?: number;
        batchSize: number;
        keywords?: string[];
    };

    // Hex fetch settings
    hexFetch?: {
        batchSize: number;
        includeContext: boolean;
    };

    // Stream settings
    stream?: {
        useStream: boolean;
        skipSave: boolean;
    };

    // Filter settings
    filter?: {
        since?: number;
        until?: number;
        kinds?: number[];
        authors?: string[];
        tags?: string[][];
    };
}

export const DEFAULT_UNIFIED_SETTINGS: UnifiedFetchSettings = {
    notesPerProfile: 50,
    batchSize: 50,
    includeOwnNotes: true,
    enhanced: {
        titles: true,
        reactions: true,
        metadata: true
    },
    contacts: {
        include: true,
        fetchProfiles: true,
        linkInGraph: true
    },
    thread: {
        limit: 50,
        includeContext: true,
        fetchReplies: true
    },
    search: {
        scope: SearchScope.DIRECT_FOLLOWS,
        timeRange: TimeRange.ALL_TIME,
        contentType: ContentType.ALL,
        batchSize: 1000,
        keywords: []
    },
    hexFetch: {
        batchSize: 50,
        includeContext: true
    },
    stream: {
        useStream: true,
        skipSave: false
    }
};

export function migrateSettings(oldSettings: any): UnifiedFetchSettings {
    return {
        ...DEFAULT_UNIFIED_SETTINGS,
        notesPerProfile: oldSettings.notesPerProfile ?? DEFAULT_UNIFIED_SETTINGS.notesPerProfile,
        batchSize: oldSettings.batchSize ?? DEFAULT_UNIFIED_SETTINGS.batchSize,
        includeOwnNotes: oldSettings.includeOwnNotes ?? DEFAULT_UNIFIED_SETTINGS.includeOwnNotes,
        hexFetch: oldSettings.hexFetch ?? DEFAULT_UNIFIED_SETTINGS.hexFetch,
        thread: {
            ...DEFAULT_UNIFIED_SETTINGS.thread,
            ...(oldSettings.threadSettings ?? {})
        }
    };
}
