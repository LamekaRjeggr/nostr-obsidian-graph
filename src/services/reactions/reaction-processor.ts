import { NostrEvent, ReactionCounts, NoteFrontmatter } from '../../types';
import { EventService } from '../core/event-service';
import { BaseEventHandler, EventKinds, ProcessingPriority } from '../core/base-event-handler';
import { FrontmatterUtil } from '../file/utils/frontmatter-util';
import { App, TFile, FrontMatterCache } from 'obsidian';
import { NostrSettings } from '../../types';
import { ReactionStore } from './reaction-store';
import { DirectoryManager } from '../file/system/directory-manager';
import { NoteCacheManager } from '../file/cache/note-cache-manager';

export class ReactionProcessor extends BaseEventHandler {
    private pendingReactions: Map<string, NostrEvent[]> = new Map();
    private settings: NostrSettings;
    private reactionStore: ReactionStore;
    private directoryManager: DirectoryManager;

    constructor(
        eventService: EventService,
        private app: App,
        settings: NostrSettings,
        private noteCacheManager: NoteCacheManager
    ) {
        // Use REACTION as default kind, but handle both REACTION and ZAPS
        super(eventService, EventKinds.REACTION, ProcessingPriority.REACTION);
        this.settings = settings;
        this.reactionStore = new ReactionStore();
        this.directoryManager = new DirectoryManager(app.vault, settings);
    }

    // Override to handle both kinds
    getKinds(): number[] {
        return [EventKinds.REACTION, EventKinds.ZAPS];
    }

    // Override validate to accept both reaction and zap events
    protected validate(event: NostrEvent): boolean {
        return event && (event.kind === EventKinds.REACTION || event.kind === EventKinds.ZAPS);
    }

    async process(event: NostrEvent): Promise<void> {
        if (!this.validate(event)) return;

        try {
            const targetId = this.getTargetId(event);
            if (!targetId) return;

            console.log(`Processing reaction for note ${targetId}:`, event);

            // Add to reaction store regardless of note existence
            this.reactionStore.addReaction(event);

            // Check if target note exists
            if (await this.noteExists(targetId)) {
                await this.updateNoteFrontmatter(targetId);
            } else {
                // Queue reaction for later processing
                this.queuePendingReaction(targetId, event);
            }
        } catch (error) {
            console.error('Error processing reaction:', error);
        }
    }

    private async noteExists(noteId: string): Promise<boolean> {
        // Get cached title for the note
        const title = this.noteCacheManager.getCachedTitle(noteId);
        if (!title) {
            console.log(`No cached title found for note ${noteId}`);
            return false;
        }

        // Ensure directories exist
        await this.directoryManager.ensureDirectories();

        // Check both notes and replies directories
        const notePaths = [
            `${this.settings.notesDirectory}/${title}.md`
        ];
        
        // Add replies path if configured
        if (this.settings.directories.replies) {
            notePaths.push(`${this.settings.directories.replies}/${title}.md`);
        }

        for (const path of notePaths) {
            if (await this.directoryManager.fileExists(path)) {
                console.log(`Found note at path: ${path}`);
                return true;
            }
        }
        console.log(`Note ${noteId} (${title}) not found in paths:`, notePaths);
        return false;
    }

    private queuePendingReaction(targetId: string, event: NostrEvent): void {
        console.log(`Queueing reaction for note ${targetId}:`, event);
        if (!this.pendingReactions.has(targetId)) {
            this.pendingReactions.set(targetId, []);
        }
        this.pendingReactions.get(targetId)!.push(event);
    }

    // Called when a new note is created
    public async processPendingReactions(noteId: string): Promise<void> {
        const pending = this.pendingReactions.get(noteId);
        if (pending) {
            console.log(`Processing ${pending.length} pending reactions for note ${noteId}`);
            for (const event of pending) {
                this.reactionStore.addReaction(event);
            }
            await this.updateNoteFrontmatter(noteId);
            this.pendingReactions.delete(noteId);
        }
    }

    private getTargetId(event: NostrEvent): string | null {
        const eTags = event.tags.filter(tag => tag[0] === 'e');
        return eTags.length > 0 ? eTags[0][1] : null;
    }

    private async updateNoteFrontmatter(noteId: string): Promise<void> {
        try {
            // Get cached title for the note
            const title = this.noteCacheManager.getCachedTitle(noteId);
            if (!title) {
                console.log(`No cached title found for note ${noteId}`);
                return;
            }

            // Ensure directories exist
            await this.directoryManager.ensureDirectories();

            // Check both notes and replies directories
            const notePaths = [
                `${this.settings.notesDirectory}/${title}.md`
            ];
            
            // Add replies path if configured
            if (this.settings.directories.replies) {
                notePaths.push(`${this.settings.directories.replies}/${title}.md`);
            }

            let filePath: string | null = null;
            let file: TFile | null = null;

            // Find the file
            for (const path of notePaths) {
                if (await this.directoryManager.fileExists(path)) {
                    filePath = path;
                    file = this.directoryManager.getAbstractFile(path);
                    break;
                }
            }

            if (!file || !filePath) {
                console.log(`No file found for note ${noteId} (${title}) in paths:`, notePaths);
                return;
            }

            // Get existing content and frontmatter
            const content = await this.directoryManager.readFile(filePath);
            const cache = this.app.metadataCache.getFileCache(file);
            if (!cache) {
                console.log(`No cache found for note ${noteId}`);
                return;
            }

            const existingFrontmatter = cache.frontmatter || {} as FrontMatterCache;
            const [_, ...contentParts] = content.split('---\n').filter(Boolean);

            // Get reaction stats
            const stats = this.reactionStore.getReactionStats(noteId);

            // Create updated frontmatter preserving existing fields
            const updatedFrontmatter = {
                ...existingFrontmatter,
                likes: stats.likes,
                zaps: stats.zaps,
                zap_amount: stats.zap_amount
            };

            console.log(`Updating frontmatter for note ${noteId} (${title}):`, updatedFrontmatter);

            // Create new content with updated frontmatter
            const newContent = [
                '---',
                FrontmatterUtil.formatFrontmatter(updatedFrontmatter),
                '---',
                ...contentParts
            ].join('\n');

            // Use DirectoryManager to write file
            await this.directoryManager.writeFile(filePath, newContent);
        } catch (error) {
            console.error(`Error updating frontmatter for note ${noteId}:`, error);
        }
    }

    public reset(): void {
        this.pendingReactions.clear();
        this.reactionStore.clear();
    }
}
