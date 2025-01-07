import { NostrEvent } from '../../interfaces';
import { TimestampService } from './timestamp.service';
import { ObsidianFileService } from '../obsidian/obsidian-file.service';

/**
 * Core service for markdown formatting and parsing
 */
export class MarkdownService {
    /**
     * Generates markdown content for a note
     * @param event The Nostr event
     * @param obsidianFileService The ObsidianFileService instance
     * @returns Formatted markdown content with frontmatter
     */
    static generateNoteContent(event: NostrEvent, obsidianFileService: ObsidianFileService): string {
        const timestamp = TimestampService.formatTimestamp(event);
        
        const frontmatter = {
            event: {
                id: event.id,
                pubkey: event.pubkey,
                created_at: event.created_at,
                kind: event.kind,
                tags: event.tags,
                sig: event.sig
            },
            created: timestamp
        };
        
        return [
            obsidianFileService.createFrontmatter(frontmatter),
            '',
            event.content
        ].join('\n');
    }

    /**
     * Extracts event data from markdown content
     * @param content Markdown content
     * @returns Parsed event data or null if invalid
     */
    static extractEventData(content: string, obsidianFileService: ObsidianFileService): NostrEvent | null {
        const frontmatter = obsidianFileService.getFrontmatter(content);
        if (!frontmatter?.event) return null;

        try {
            return {
                ...frontmatter.event,
                content: content.split('\n---\n')[1]?.trim() || ''
            };
        } catch {
            return null;
        }
    }

    /**
     * Extracts frontmatter from markdown content
     * @param content Markdown content
     * @returns Parsed frontmatter or null if invalid
     */
    static extractFrontmatter(content: string, obsidianFileService: ObsidianFileService): Record<string, any> | null {
        return obsidianFileService.getFrontmatter(content);
    }
}
