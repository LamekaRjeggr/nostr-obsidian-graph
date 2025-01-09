import { App, TFile, CachedMetadata } from 'obsidian';
import { IIndexService, NostrEvent, RelationshipCache } from '../../interfaces';

/**
 * Service that uses Obsidian's MetadataCache for efficient file operations
 */
export class MetadataCacheService implements IIndexService {
    private fileCache: Map<string, TFile> = new Map();
    private metadataCache: Map<string, CachedMetadata> = new Map();
    private relationships: RelationshipCache = {
        references: new Map(),
        backlinks: new Map(),
        pending: new Map()
    };

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
                
                // Process references from frontmatter
                const eventId = cache.frontmatter.event.id;
                const refs = cache.frontmatter.references || {};
                
                // Clear existing references for this file
                this.clearReferences(eventId);
                
                // Add new references
                if (refs.notes) {
                    for (const noteId of refs.notes) {
                        this.addReference(eventId, noteId);
                    }
                }
                if (refs.profiles) {
                    for (const profileId of refs.profiles) {
                        this.addReference(eventId, profileId);
                    }
                }
            }
        }
    }

    private clearReferences(eventId: string): void {
        // Clear forward references
        const oldRefs = this.relationships.references.get(eventId) || new Set();
        for (const ref of oldRefs) {
            this.relationships.backlinks.get(ref)?.delete(eventId);
        }
        this.relationships.references.delete(eventId);
        
        // Clear backlinks
        this.relationships.backlinks.delete(eventId);
        
        // Clear from pending if it exists
        this.relationships.pending.delete(eventId);
    }

    /**
     * Add a reference from one event to another
     */
    async addReference(fromId: string, toId: string): Promise<void> {
        // Add forward reference
        if (!this.relationships.references.has(fromId)) {
            this.relationships.references.set(fromId, new Set());
        }
        this.relationships.references.get(fromId)?.add(toId);

        // If target exists, add backlink
        const targetFile = await this.findEventFile(toId);
        if (targetFile) {
            if (!this.relationships.backlinks.has(toId)) {
                this.relationships.backlinks.set(toId, new Set());
            }
            this.relationships.backlinks.get(toId)?.add(fromId);
        } else {
            // Target doesn't exist yet, add to pending
            if (!this.relationships.pending.has(toId)) {
                this.relationships.pending.set(toId, new Set());
            }
            this.relationships.pending.get(toId)?.add(fromId);
        }
    }

    /**
     * Remove a reference between events
     */
    async removeReference(fromId: string, toId: string): Promise<void> {
        // Remove forward reference
        this.relationships.references.get(fromId)?.delete(toId);
        if (this.relationships.references.get(fromId)?.size === 0) {
            this.relationships.references.delete(fromId);
        }

        // Remove backlink
        this.relationships.backlinks.get(toId)?.delete(fromId);
        if (this.relationships.backlinks.get(toId)?.size === 0) {
            this.relationships.backlinks.delete(toId);
        }

        // Remove from pending if it exists
        this.relationships.pending.get(toId)?.delete(fromId);
        if (this.relationships.pending.get(toId)?.size === 0) {
            this.relationships.pending.delete(toId);
        }
    }

    /**
     * Get all references from an event
     */
    async getReferences(eventId: string): Promise<string[]> {
        return Array.from(this.relationships.references.get(eventId) || []);
    }

    /**
     * Get all backlinks to an event
     */
    async getBacklinks(eventId: string): Promise<string[]> {
        return Array.from(this.relationships.backlinks.get(eventId) || []);
    }

    /**
     * Get all pending references waiting for an event
     */
    async getPendingReferences(eventId: string): Promise<string[]> {
        return Array.from(this.relationships.pending.get(eventId) || []);
    }

    /**
     * Handle when content arrives that has pending references
     */
    async onContentArrived(eventId: string): Promise<void> {
        const waitingRefs = this.relationships.pending.get(eventId);
        if (waitingRefs) {
            // Move references from pending to backlinks
            if (!this.relationships.backlinks.has(eventId)) {
                this.relationships.backlinks.set(eventId, new Set());
            }
            for (const fromId of waitingRefs) {
                this.relationships.backlinks.get(eventId)?.add(fromId);
            }
            // Clear pending
            this.relationships.pending.delete(eventId);
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
