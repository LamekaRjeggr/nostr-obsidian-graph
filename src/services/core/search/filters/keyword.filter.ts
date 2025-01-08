import { Filter } from '../../../../interfaces';
import { BaseSearchFilter, SearchOptions } from '../search-options';

/**
 * Filter implementation for keyword-based searches
 * Uses nostr-tools search parameter for text matching
 */
export class KeywordFilter extends BaseSearchFilter {
    private constructor(private keyword: string) {
        super();
    }

    apply(options: SearchOptions): Filter {
        const filter: Filter = {};

        // Only add search parameter if keyword is provided
        if (this.keyword?.trim()) {
            filter.search = this.keyword.trim();
        }

        return filter;
    }

    /**
     * Static factory method for creating keyword filters
     * @param keyword Search term to use
     * @returns A new KeywordFilter instance
     */
    static forKeyword(keyword: string): KeywordFilter {
        return new KeywordFilter(keyword);
    }
}
