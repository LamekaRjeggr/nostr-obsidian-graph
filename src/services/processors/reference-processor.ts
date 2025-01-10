import { Event } from 'nostr-tools';
import { App, TFile, MetadataCache } from 'obsidian';
import { TagProcessor } from './tag-processor';

export interface ReferenceResult {
    nostr: {
        outgoing: string[];     // Events we reference
        incoming: string[];     // Events referencing us
    };
    obsidian: {
        files: TFile[];         // Related Obsidian files
        links: string[];        // Wiki-style links
    };
    metadata: {
        root?: string;          // Root note in thread
        replyTo?: string;       // Direct reply reference
        topics: string[];       // Topic tags
    };
}

/**
 * Processes references between nostr events and Obsidian files.
 * Handles bi-directional linking and metadata extraction.
 */
export class ReferenceProcessor {
    private tagProcessor: TagProcessor;

    constructor(
        private app: App,
        private metadataCache: MetadataCache
    ) {
        this.tagProcessor = new TagProcessor();
    }

    /**
     * Process references for a nostr event
     */
    async process(event: Event): Promise<ReferenceResult> {
        // Get tag-based references using TagProcessor
        const tagResults = this.tagProcessor.process(event);

        // Process Obsidian links from content
        const obsidianRefs = await this.processObsidianRefs(event.content);

        return {
            nostr: {
                outgoing: [
                    ...tagResults.references,
                    ...(tagResults.root ? [tagResults.root] : []),
                    ...(tagResults.replyTo ? [tagResults.replyTo] : [])
                ],
                incoming: [] // To be populated by reference store
            },
            obsidian: obsidianRefs,
            metadata: {
                root: tagResults.root,
                replyTo: tagResults.replyTo,
                topics: tagResults.topics
            }
        };
    }

    /**
     * Extract Obsidian references from content
     */
    private async processObsidianRefs(content: string): Promise<{
        files: TFile[];
        links: string[];
    }> {
        const links: string[] = [];
        const files: TFile[] = [];

        // Extract wiki-style links [[link]]
        const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
        let match;
        while ((match = wikiLinkRegex.exec(content)) !== null) {
            const link = match[1];
            links.push(link);

            // Try to find corresponding file
            const file = this.app.metadataCache.getFirstLinkpathDest(link, '');
            if (file) {
                files.push(file);
            }
        }

        return { files, links };
    }

    /**
     * Format references as Obsidian markdown
     */
    formatAsMarkdown(result: ReferenceResult): string {
        const sections: string[] = [];

        // Add thread context
        if (result.metadata.root) {
            sections.push(`Root: [[${result.metadata.root}]]`);
        }
        if (result.metadata.replyTo) {
            sections.push(`Reply to: [[${result.metadata.replyTo}]]`);
        }

        // Add nostr references
        if (result.nostr.outgoing.length > 0) {
            sections.push('References:');
            result.nostr.outgoing.forEach(ref => {
                sections.push(`- [[${ref}]]`);
            });
        }

        // Add topics
        if (result.metadata.topics.length > 0) {
            sections.push('Topics:');
            result.metadata.topics.forEach(topic => {
                sections.push(`- #${topic}`);
            });
        }

        return sections.join('\n');
    }
}
