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
    searchBatchSize: number;
}

export interface ThreadSettings {
    limit: number;
    includeContext: boolean;
}
