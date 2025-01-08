// Export all search-related components
export * from './search-options';
export * from './search.service';
export * from './filters/keyword.filter';
export * from './filters/time-range.filter';

// Re-export commonly used types
export type { SearchOptions } from './search-options';

// Import filter classes for the Filters object
import { KeywordFilter } from './filters/keyword.filter';
import { TimeRangeFilter } from './filters/time-range.filter';

// Export pre-configured filters
export const Filters = {
    Keyword: {
        create: (keyword: string) => KeywordFilter.forKeyword(keyword)
    },
    TimeRange: {
        lastHour: () => TimeRangeFilter.forLastHours(1),
        lastDay: () => TimeRangeFilter.forLastHours(24),
        lastWeek: () => TimeRangeFilter.forLastDays(7),
        lastMonth: () => TimeRangeFilter.forLastDays(30),
        range: (since?: number, until?: number) => TimeRangeFilter.forRange(since, until)
    }
};
