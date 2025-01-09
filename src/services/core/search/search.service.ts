import { NostrEvent } from '../../../interfaces';
import { RelayService } from '../relay.service';
import { EventService } from '../event.service';
import { SearchOptions, ISearchFilter } from './search-options';
import { KeywordFilter } from './filters/keyword.filter';
import { TimeRangeFilter } from './filters/time-range.filter';

/**
 * Service for executing searches across Nostr relays
 * Uses composable filters to build search queries
 */
export class SearchService {
    constructor(
        private relayService: RelayService,
        private eventService: EventService
    ) {}

    /**
     * Execute a search using the provided options
     * @param options Search criteria
     * @returns Array of matching NostrEvent objects
     */
    async search(options: SearchOptions): Promise<NostrEvent[]> {
        await this.relayService.ensureConnected();
        
        const filters = this.buildFilters(options);
        return this.executeSearch(filters, options);
    }

    /**
     * Build appropriate filters based on the search options
     * @param options Search criteria
     * @returns Array of filters to apply
     */
    private buildFilters(options: SearchOptions): ISearchFilter[] {
        const filters: ISearchFilter[] = [];
        
        // Add keyword filter if search term provided
        if (options.keyword) {
            filters.push(KeywordFilter.forKeyword(options.keyword));
        }
        
        // Add time range filter if either since or until provided
        if (options.since !== undefined || options.until !== undefined) {
            filters.push(TimeRangeFilter.forRange(options.since, options.until));
        }
        
        return filters;
    }

    /**
     * Execute search using the provided filters
     * @param filters Filters to apply
     * @returns Array of matching NostrEvent objects
     */
    private async executeSearch(filters: ISearchFilter[], options: SearchOptions): Promise<NostrEvent[]> {
        return new Promise((resolve, reject) => {
            const events: NostrEvent[] = [];
            let timeout: NodeJS.Timeout;

            const onEvent = (event: NostrEvent) => {
                events.push(event);
            };

            const onEose = () => {
                cleanup();
                resolve(events);
            };

            const cleanup = () => {
                this.eventService.off('event', onEvent);
                this.eventService.off('eose', onEose);
                clearTimeout(timeout);
            };

            // Set timeout for search operation
            timeout = setTimeout(() => {
                cleanup();
                resolve(events);
            }, 5000);  // 5 second timeout

            // Register event handlers
            this.eventService.on('event', onEvent);
            this.eventService.on('eose', onEose);

            // Create base filter
            const baseFilter = {
                kinds: [1],  // Default to text notes
                limit: options.limit || 1000   // Use provided limit or default to 1000
            };

            // Apply each filter in sequence
            const finalFilter = filters.reduce((acc, filter) => {
                const filterResult = filter.apply(acc);
                return {
                    ...acc,
                    ...filterResult,
                    // Preserve arrays by concatenating
                    kinds: [...new Set([...(acc.kinds || []), ...(filterResult.kinds || [])])],
                    // Preserve the lowest limit if specified
                    limit: filterResult.limit ? 
                        (acc.limit ? Math.min(acc.limit, filterResult.limit) : filterResult.limit) :
                        acc.limit
                };
            }, baseFilter);

            // If no specific filters, add time range
            if (filters.length === 0) {
                const defaultTimeFilter = TimeRangeFilter.forLastDays(7);
                Object.assign(finalFilter, defaultTimeFilter.apply({}));
            }
            
            // Execute the search
            this.eventService.subscribe(finalFilter);
        });
    }

    /**
     * Create a search for recent notes
     * @param days Number of days to look back
     * @param limit Maximum number of results
     * @returns Search results
     */
    async searchRecent(days: number = 7, limit: number = 1000): Promise<NostrEvent[]> {
        return this.search({
            limit,
            ...TimeRangeFilter.forLastDays(days).apply({})
        });
    }

    /**
     * Create a keyword search with time limit
     * @param keyword Search term
     * @param hours Number of hours to look back
     * @param limit Maximum number of results
     * @returns Search results
     */
    async searchKeywordWithTime(
        keyword: string,
        hours: number = 24,
        limit: number = 1000
    ): Promise<NostrEvent[]> {
        return this.search({
            keyword,
            limit,
            ...TimeRangeFilter.forLastHours(hours).apply({})
        });
    }
}
