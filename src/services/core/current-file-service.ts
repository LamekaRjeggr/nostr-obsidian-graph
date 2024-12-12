import { App, TFile } from 'obsidian';

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
}
