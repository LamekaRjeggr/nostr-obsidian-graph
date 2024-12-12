import { NoteFrontmatter } from '../../types';

/**
 * Utility class for handling temporal operations in the Nostr Graph plugin
 */
export class TemporalUtils {
    /**
     * Formats a Unix timestamp into both human-readable and Unix formats
     * for use in note frontmatter
     * 
     * @param timestamp Unix timestamp in seconds
     * @returns Object with formatted frontmatter fields
     */
    static formatNoteTimestamp(timestamp: number): Pick<NoteFrontmatter, 'created' | 'created_at'> {
        return {
            created: timestamp,  // Preserve original Unix timestamp
            created_at: new Date(timestamp * 1000).toLocaleString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
        };
    }
}
