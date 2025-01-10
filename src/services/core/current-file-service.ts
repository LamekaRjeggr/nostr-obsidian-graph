import { App, TFile } from 'obsidian';

interface ThreadContext {
    eventId: string | null;
    root: string | null;
    replyTo: string | null;
    mentions: string[];
    nostrTags: string[][];
}

export class CurrentFileService {
    constructor(private app: App) {}

    getCurrentFilePubkey(): string | null {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
            console.log('NostrGraph: No active file');
            return null;
        }

        const cache = this.app.metadataCache.getFileCache(activeFile);
        if (!cache?.frontmatter) {
            console.log('NostrGraph: No frontmatter found in active file');
            return null;
        }

        // Handle pubkey from note frontmatter
        let pubkey = cache.frontmatter.pubkey;
        if (typeof pubkey === 'string') {
            // Remove both quotes and wiki-link brackets
            pubkey = pubkey.replace(/["\[\]]/g, '');
            console.log('NostrGraph: Found pubkey in note:', pubkey);
            return pubkey;
        }

        // Handle aliases from profile frontmatter
        const aliases = cache.frontmatter.aliases;
        if (Array.isArray(aliases) && aliases.length > 0) {
            // Remove quotes if present
            const firstAlias = aliases[0].replace(/"/g, '');
            console.log('NostrGraph: Found pubkey in profile aliases:', firstAlias);
            return firstAlias;
        }

        console.log('NostrGraph: No pubkey found in frontmatter');
        return null;
    }

    getCurrentFileEventId(): string | null {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
            console.log('NostrGraph: No active file');
            return null;
        }

        // Check frontmatter first
        const cache = this.app.metadataCache.getFileCache(activeFile);
        if (cache?.frontmatter) {
            // Check for eventId in frontmatter
            let eventId = cache.frontmatter.id;
            if (typeof eventId === 'string') {
                // Remove quotes if present
                eventId = eventId.replace(/"/g, '');
                console.log('NostrGraph: Found event ID in frontmatter:', eventId);
                return eventId;
            }
        }

        // Check filename for hex pattern (64 characters)
        const hexMatch = activeFile.basename.match(/^([a-f0-9]{64})/);
        if (hexMatch) {
            console.log('NostrGraph: Found event ID in filename:', hexMatch[1]);
            return hexMatch[1];
        }

        console.log('NostrGraph: No event ID found');
        return null;
    }

    getCurrentFileThreadContext(): ThreadContext {
        const activeFile = this.app.workspace.getActiveFile();
        const context: ThreadContext = {
            eventId: null,
            root: null,
            replyTo: null,
            mentions: [],
            nostrTags: []
        };

        if (!activeFile) {
            console.log('NostrGraph: No active file');
            return context;
        }

        const cache = this.app.metadataCache.getFileCache(activeFile);
        if (!cache?.frontmatter) {
            console.log('NostrGraph: No frontmatter found in active file');
            return context;
        }

        // Extract event ID
        context.eventId = this.getCurrentFileEventId();

        // Extract root and reply_to, removing wiki-link brackets if present
        if (cache.frontmatter.root) {
            context.root = cache.frontmatter.root.replace(/[\[\]]/g, '');
        }
        if (cache.frontmatter.reply_to) {
            context.replyTo = cache.frontmatter.reply_to.replace(/[\[\]]/g, '');
        }

        // Extract mentions
        if (Array.isArray(cache.frontmatter.mentions)) {
            context.mentions = cache.frontmatter.mentions.map((mention: string) => 
                mention.replace(/[\[\]]/g, '')
            );
        }

        // Extract nostr_tags
        if (Array.isArray(cache.frontmatter.nostr_tags)) {
            context.nostrTags = cache.frontmatter.nostr_tags;
        }

        console.log('NostrGraph: Thread context:', context);
        return context;
    }

    getLinkedNotes(eventId: string): string[] {
        const linkedNotes: string[] = [];
        const files = this.app.vault.getMarkdownFiles();

        for (const file of files) {
            const cache = this.app.metadataCache.getFileCache(file);
            if (!cache?.frontmatter) continue;

            // Check root and reply_to fields
            const root = cache.frontmatter.root?.replace(/[\[\]]/g, '');
            const replyTo = cache.frontmatter.reply_to?.replace(/[\[\]]/g, '');
            const fileEventId = cache.frontmatter.id;

            if (root === eventId || replyTo === eventId || fileEventId === eventId) {
                linkedNotes.push(file.path);
            }
        }

        return linkedNotes;
    }
}
