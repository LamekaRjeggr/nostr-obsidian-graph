import { Event } from 'nostr-tools';
import { App, TFile, MetadataCache } from 'obsidian';
import { TagProcessor } from './tag-processor';
import { IReference } from '../../core/interfaces/IReference';

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
export class ReferenceProcessor implements IReference {
    private tagProcessor: TagProcessor;
    private references: Map<string, Set<string>> = new Map();
    private mentions: Set<string> = new Set();

    constructor(
        private app: App,
        private metadataCache: MetadataCache
    ) {
        this.tagProcessor = new TagProcessor();
    }

    /**
     * Clear all stored references
     */
    clear(): void {
        this.references.clear();
        this.mentions.clear();
    }

    /**
     * Add a reference between two events
     */
    addReference(from: string, to: string): void {
        if (!this.references.has(from)) {
            this.references.set(from, new Set());
        }
        this.references.get(from)?.add(to);
    }

    /**
     * Add multiple references for an event
     */
    addReferences(from: string, to: string[]): void {
        to.forEach(ref => this.addReference(from, ref));
    }

    /**
     * Get outgoing references for an event
     */
    getOutgoingReferences(eventId: string): string[] {
        return Array.from(this.references.get(eventId) || []);
    }

    /**
     * Get incoming references for an event
     */
    getIncomingReferences(eventId: string): string[] {
        const incoming: string[] = [];
        this.references.forEach((refs, from) => {
            if (refs.has(eventId)) {
                incoming.push(from);
            }
        });
        return incoming;
    }

    /**
     * Add a profile mention
     */
    addMention(pubkey: string): void {
        this.mentions.add(pubkey);
    }

    /**
     * Get all mentioned profiles
     */
    getAllMentions(): string[] {
        return Array.from(this.mentions);
    }

    /**
     * Get thread context for a note
     */
    getThreadContext(eventId: string): {
        root?: string;
        replyTo?: string;
        replies: string[];
    } {
        const outgoing = this.getOutgoingReferences(eventId);
        const incoming = this.getIncomingReferences(eventId);
        
        // Find root and reply references
        const root = outgoing.find(ref => 
            this.references.get(eventId)?.has(ref) && 
            this.tagProcessor.isRoot(eventId, ref)
        );
        const replyTo = outgoing.find(ref =>
            this.references.get(eventId)?.has(ref) && 
            this.tagProcessor.isReply(eventId, ref)
        );

        // Get replies (incoming references that mark this as root or replyTo)
        const replies = incoming.filter(ref =>
            this.tagProcessor.isReply(ref, eventId) ||
            this.tagProcessor.isRoot(ref, eventId)
        );

        return { root, replyTo, replies };
    }

    /**
     * Get references by type (root, reply, mention)
     */
    getReferencesByType(eventId: string): {
        roots: string[];
        replies: string[];
        mentions: string[];
    } {
        const outgoing = this.getOutgoingReferences(eventId);
        
        return {
            roots: outgoing.filter(ref => this.tagProcessor.isRoot(eventId, ref)),
            replies: outgoing.filter(ref => this.tagProcessor.isReply(eventId, ref)),
            mentions: outgoing.filter(ref => !this.tagProcessor.isRoot(eventId, ref) && !this.tagProcessor.isReply(eventId, ref))
        };
    }

    /**
     * Clear references for a specific note
     */
    clearNote(eventId: string): void {
        this.references.delete(eventId);
        // Also remove any references to this note from other notes
        this.references.forEach((refs) => {
            refs.delete(eventId);
        });
    }

    /**
     * Process references for a nostr event
     */
    async process(event: Event): Promise<ReferenceResult> {
        // Get tag-based references using TagProcessor
        const tagResults = this.tagProcessor.process(event);

        // Add mentions to the mentions set
        tagResults.mentions.forEach(pubkey => this.addMention(pubkey));

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
