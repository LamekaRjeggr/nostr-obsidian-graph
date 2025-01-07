import { App, TFile, CachedMetadata } from 'obsidian';
import { IIndexService, NostrEvent } from '../../interfaces';

/**
 * Service that uses Obsidian's MetadataCache for efficient file operations
 */
export class MetadataCacheService implements IIndexService {
    private fileCache: Map<string, TFile> = new Map();
    private metadataCache: Map<string, CachedMetadata> = new Map();

    constructor(private app: App) {
        // Subscribe to metadata cache changes
        this.app.metadataCache.on('changed', (file: TFile) => {
            this.updateCache(file);
        });

        // Initial cache population
        this.app.vault.getMarkdownFiles().forEach(file => {
            this.updateCache(file);
        });
    }

    private updateCache(file: TFile): void {
        if (file.path.startsWith('nostr/')) {
            const cache = this.app.metadataCache.getCache(file.path);
            if (cache?.frontmatter?.event) {
                this.fileCache.set(file.path, file);
                this.metadataCache.set(file.path, cache);
            }
        }
    }

    /**
     * Find a file by event ID using metadata cache
     */
    async findEventFile(eventId: string): Promise<TFile | null> {
        // Search in cache first
        for (const [path, cache] of this.metadataCache.entries()) {
            if (cache.frontmatter?.event?.id === eventId) {
                return this.fileCache.get(path) || null;
            }
        }
        return null;
    }

    /**
     * Find all files by author pubkey using metadata cache
     */
    async findEventsByAuthor(pubkey: string): Promise<TFile[]> {
        const results: TFile[] = [];
        for (const [path, cache] of this.metadataCache.entries()) {
            if (cache.frontmatter?.event?.pubkey === pubkey) {
                const file = this.fileCache.get(path);
                if (file) results.push(file);
            }
        }
        return results;
    }

    /**
     * Find all files by event kind using metadata cache
     */
    async findEventsByKind(kind: number): Promise<TFile[]> {
        const results: TFile[] = [];
        for (const [path, cache] of this.metadataCache.entries()) {
            if (cache.frontmatter?.event?.kind === kind) {
                const file = this.fileCache.get(path);
                if (file) results.push(file);
            }
        }
        return results;
    }

    /**
     * Get events from files using metadata cache
     */
    async getEventsFromFiles(files: TFile[]): Promise<NostrEvent[]> {
        return files
            .map(file => this.metadataCache.get(file.path)?.frontmatter?.event)
            .filter((event): event is NostrEvent => event !== undefined);
    }

    /**
     * Helper method to get cached metadata for a file
     */
    private getCachedMetadata(file: TFile): CachedMetadata | null {
        return this.app.metadataCache.getCache(file.path);
    }
}
