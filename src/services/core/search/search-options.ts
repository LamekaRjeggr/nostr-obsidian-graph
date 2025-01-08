import { Filter } from '../../../interfaces';

/**
 * Base search options that all searches support
 */
export interface BaseSearchOptions {
    /** Maximum number of results to return */
    limit?: number;
    /** Event kinds to search for (defaults to [1] for text notes) */
    kinds?: number[];
}

/**
 * Options for time-based filtering
 */
export interface TimeRangeOptions {
    /** Start time in Unix timestamp */
    since?: number;
    /** End time in Unix timestamp */
    until?: number;
}

/**
 * Options for keyword-based searching
 */
export interface KeywordOptions {
    /** Search term to look for (optional) */
    keyword?: string;
}

/**
 * Combined search options type that can include any combination of:
 * - Base options (limit, kinds)
 * - Time range options (since, until)
 * - Keyword options (search term)
 */
export type SearchOptions = BaseSearchOptions & 
    Partial<TimeRangeOptions> & 
    Partial<KeywordOptions>;

/**
 * Interface for search filter implementations
 */
export interface ISearchFilter {
    /**
     * Apply the filter to create a nostr-tools compatible Filter
     * @param options Search options to use
     * @returns A Filter object for nostr-tools
     */
    apply(options: SearchOptions): Filter;

    /**
     * Combine this filter with another filter
     * @param filter Filter to combine with
     * @returns A new filter that combines both filters
     */
    combine(filter: ISearchFilter): ISearchFilter;
}

/**
 * Base class for search filters with common functionality
 */
export abstract class BaseSearchFilter implements ISearchFilter {
    abstract apply(options: SearchOptions): Filter;

    combine(filter: ISearchFilter): ISearchFilter {
        return new CombinedFilter([this, filter]);
    }
}

/**
 * Filter that combines multiple other filters
 */
export class CombinedFilter implements ISearchFilter {
    constructor(private filters: ISearchFilter[]) {}

    apply(options: SearchOptions): Filter {
        // Combine all filters into a single nostr-tools Filter
        return this.filters.reduce((combined, filter) => {
            const next = filter.apply(options);
            return {
                ...combined,
                ...next,
                // Merge arrays if they exist
                kinds: [...(combined.kinds || []), ...(next.kinds || [])],
                authors: [...(combined.authors || []), ...(next.authors || [])],
                tags: [...(combined.tags || []), ...(next.tags || [])]
            };
        }, {} as Filter);
    }

    combine(filter: ISearchFilter): ISearchFilter {
        return new CombinedFilter([...this.filters, filter]);
    }
}
