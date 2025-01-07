import { App, TFile } from 'obsidian';
import { NostrEvent } from '../../interfaces';
import { IIndexService } from '../../interfaces';
import { MarkdownService } from './markdown.service';
import { ObsidianFileService } from '../obsidian/obsidian-file.service';

interface EventIndex {
    byId: Map<string, string>;         // event ID -> file path
    byPubkey: Map<string, Set<string>>;// pubkey -> file paths
    byKind: Map<number, Set<string>>;  // kind -> file paths
}

export class IndexService implements IIndexService {
    private index: EventIndex = {
        byId: new Map(),
        byPubkey: new Map(),
        byKind: new Map()
    };

    constructor(
        private app: App,
        private obsidianFileService: ObsidianFileService
    ) {
        // Listen for file changes
        this.app.vault.on('create', this.onFileCreated.bind(this));
        this.app.vault.on('modify', this.onFileModified.bind(this));
        this.app.vault.on('delete', this.onFileDeleted.bind(this));
        
        // Build initial index
        this.buildIndex();
    }

    /**
     * Builds the initial index from existing files
     */
    private async buildIndex(): Promise<void> {
        const files = this.app.vault.getFiles();
        for (const file of files) {
            await this.indexFile(file);
        }
    }

    /**
     * Indexes a single file
     */
    private async indexFile(file: TFile): Promise<void> {
        if (file.extension !== 'md') return;
        
        try {
            const content = await this.app.vault.read(file);
            const frontmatter = MarkdownService.extractFrontmatter(content, this.obsidianFileService);
            const eventData = frontmatter?.event;
            if (eventData?.id && eventData?.pubkey && eventData?.kind !== undefined) {
                // Index by ID
                this.index.byId.set(eventData.id, file.path);
                
                // Index by pubkey
                let pubkeyPaths = this.index.byPubkey.get(eventData.pubkey);
                if (!pubkeyPaths) {
                    pubkeyPaths = new Set();
                    this.index.byPubkey.set(eventData.pubkey, pubkeyPaths);
                }
                pubkeyPaths.add(file.path);
                
                // Index by kind
                let kindPaths = this.index.byKind.get(eventData.kind);
                if (!kindPaths) {
                    kindPaths = new Set();
                    this.index.byKind.set(eventData.kind, kindPaths);
                }
                kindPaths.add(file.path);
            }
        } catch (error) {
            console.error(`Failed to index file ${file.path}:`, error);
        }
    }

    /**
     * Removes a file from all indexes
     */
    private removeFromIndex(path: string): void {
        // Remove from ID index
        for (const [id, filePath] of this.index.byId.entries()) {
            if (filePath === path) {
                this.index.byId.delete(id);
                break;
            }
        }
        
        // Remove from pubkey index
        for (const paths of this.index.byPubkey.values()) {
            paths.delete(path);
        }
        
        // Remove from kind index
        for (const paths of this.index.byKind.values()) {
            paths.delete(path);
        }
    }

    /**
     * File event handlers
     */
    private async onFileCreated(file: TFile): Promise<void> {
        await this.indexFile(file);
    }

    private async onFileModified(file: TFile): Promise<void> {
        this.removeFromIndex(file.path);
        await this.indexFile(file);
    }

    private onFileDeleted(file: TFile): void {
        this.removeFromIndex(file.path);
    }

    /**
     * Public lookup methods
     */
    async findEventFile(eventId: string): Promise<TFile | null> {
        const path = this.index.byId.get(eventId);
        if (!path) return null;
        
        const file = this.app.vault.getAbstractFileByPath(path);
        return file instanceof TFile ? file : null;
    }

    async findEventsByAuthor(pubkey: string): Promise<TFile[]> {
        const paths = this.index.byPubkey.get(pubkey);
        if (!paths) return [];
        
        const files: TFile[] = [];
        for (const path of paths) {
            const file = this.app.vault.getAbstractFileByPath(path);
            if (file instanceof TFile) {
                files.push(file);
            }
        }
        return files;
    }

    async findEventsByKind(kind: number): Promise<TFile[]> {
        const paths = this.index.byKind.get(kind);
        if (!paths) return [];
        
        const files: TFile[] = [];
        for (const path of paths) {
            const file = this.app.vault.getAbstractFileByPath(path);
            if (file instanceof TFile) {
                files.push(file);
            }
        }
        return files;
    }

    async getEventsFromFiles(files: TFile[]): Promise<NostrEvent[]> {
        const events: NostrEvent[] = [];
        
        for (const file of files) {
            const content = await this.app.vault.read(file);
            const frontmatter = MarkdownService.extractFrontmatter(content, this.obsidianFileService);
            
            if (frontmatter?.event) {
                events.push(frontmatter.event as NostrEvent);
            }
        }
        
        return events;
    }
}
