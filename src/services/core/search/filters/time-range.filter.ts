import { Filter } from '../../../../interfaces';
import { BaseSearchFilter, SearchOptions } from '../search-options';

/**
 * Filter implementation for time-based searches
 * Uses nostr-tools since/until parameters for time range filtering
 */
export class TimeRangeFilter extends BaseSearchFilter {
    apply(options: SearchOptions): Filter {
        const filter: Filter = {
            kinds: options.kinds || [1]  // Default to text notes
        };

        // Add time range parameters if provided
        if (options.since !== undefined) {
            filter.since = options.since;
        }
        
        if (options.until !== undefined) {
            filter.until = options.until;
        }

        // Add limit if provided
        if (options.limit) {
            filter.limit = options.limit;
        }

        return filter;
    }

    /**
     * Static factory method for creating time range filters
     * @param since Start time (Unix timestamp)
     * @param until End time (Unix timestamp)
     * @returns A new TimeRangeFilter instance
     */
    static forRange(since?: number, until?: number): TimeRangeFilter {
        return new TimeRangeFilter();
    }

    /**
     * Create a filter for the last N seconds
     * @param seconds Number of seconds to look back
     * @returns A new TimeRangeFilter instance
     */
    static forLastSeconds(seconds: number): TimeRangeFilter {
        const now = Math.floor(Date.now() / 1000);
        return this.forRange(now - seconds, now);
    }

    /**
     * Create a filter for the last N hours
     * @param hours Number of hours to look back
     * @returns A new TimeRangeFilter instance
     */
    static forLastHours(hours: number): TimeRangeFilter {
        return this.forLastSeconds(hours * 3600);
    }

    /**
     * Create a filter for the last N days
     * @param days Number of days to look back
     * @returns A new TimeRangeFilter instance
     */
    static forLastDays(days: number): TimeRangeFilter {
        return this.forLastSeconds(days * 86400);
    }
}
