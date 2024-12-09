import { Vault } from 'obsidian';
import { NostrEvent, NostrSettings, ProfileData, ChronologicalMetadata } from '../../types';
import { KeyService } from './key-service';
import { NoteCacheManager } from '../file/cache/note-cache-manager';
import { NoteFormatter, LinkResolver } from '../file/formatters/note-formatter';
import { ProfileFormatter } from '../file/formatters/profile-formatter';
import { DirectoryManager } from '../file/system/directory-manager';
import { TextProcessor } from '../file/utils/text-processor';
import { TagProcessor } from '../tags/tag-processor';

export class FileService implements LinkResolver {
    private noteFormatter: NoteFormatter;
    private profileFormatter: ProfileFormatter;
    private directoryManager: DirectoryManager;
    private noteCacheManager: NoteCacheManager;
    private tagProcessor: TagProcessor;

    constructor(
        private vault: Vault,
        private settings: NostrSettings
    ) {
        this.noteFormatter = new NoteFormatter(this);
        this.profileFormatter = new ProfileFormatter();
        this.directoryManager = new DirectoryManager(vault, settings);
        this.noteCacheManager = new NoteCacheManager();
        this.tagProcessor = new TagProcessor();
    }

    private getNotePath(event: NostrEvent): string {
        const isReply = this.tagProcessor.isReply(event);
        const baseDir = isReply && this.settings.directories.replies 
            ? this.settings.directories.replies 
            : this.settings.notesDirectory;

        const firstSentence = TextProcessor.extractFirstSentence(event.content);
        const safeTitle = TextProcessor.sanitizeFilename(firstSentence);
        const fileName = `${safeTitle}.md`;

        return `${baseDir}/${fileName}`;
    }

    async saveNote(event: NostrEvent, metadata?: ChronologicalMetadata): Promise<void> {
        await this.directoryManager.ensureDirectories();

        const firstSentence = TextProcessor.extractFirstSentence(event.content);
        const safeTitle = TextProcessor.sanitizeFilename(firstSentence);
        
        this.noteCacheManager.cacheTitle(event.id, safeTitle);
        
        const filePath = this.getNotePath(event);
        
        // Get author name from profile
        const authorName = await this.getTitleById(event.pubkey);
        
        const noteFile = {
            id: event.id,
            content: event.content,
            pubkey: event.pubkey,
            authorName: authorName || undefined,  // Include author name if found
            created_at: event.created_at,
            kind: event.kind,
            tags: event.tags,
            mentions: KeyService.extractMentions(event.tags),
            title: firstSentence,
            previousNote: metadata?.previousNote,
            nextNote: metadata?.nextNote,
            references: metadata?.references || [],
            referencedBy: metadata?.referencedBy || []
        };

        if (metadata?.previousNote) {
            this.noteCacheManager.addLink(metadata.previousNote, event.id);
        }
        if (metadata?.nextNote) {
            this.noteCacheManager.addLink(event.id, metadata.nextNote);
        }

        const content = await this.noteFormatter.formatNote(
            noteFile,
            this.noteCacheManager.getBacklinks(event.id)
        );

        await this.directoryManager.writeFile(filePath, content);
    }

    async saveProfile(profile: ProfileData): Promise<void> {
        await this.directoryManager.ensureDirectories();

        const fileName = this.profileFormatter.getFileName(profile);
        const filePath = `${this.settings.profilesDirectory}/${fileName}`;
        const content = this.profileFormatter.formatProfile(profile);

        await this.directoryManager.writeFile(filePath, content);
    }

    async getTitleById(id: string): Promise<string | null> {
        const cached = this.noteCacheManager.getCachedTitle(id);
        if (cached) return cached;

        try {
            // First check profiles directory for pubkey matches
            const profileFiles = await this.directoryManager.listFiles(this.settings.profilesDirectory);
            for (const file of profileFiles) {
                const content = await this.directoryManager.readFile(file);
                if (content.includes(`aliases:\n  - ${id}`)) {
                    const titleMatch = content.match(/^# (.+)$/m);
                    if (titleMatch) {
                        return titleMatch[1];
                    }
                }
            }

            // Then check notes directories
            const directories = [
                this.settings.notesDirectory,
                this.settings.directories.replies
            ].filter((dir): dir is string => !!dir);

            for (const dir of directories) {
                const files = await this.directoryManager.listFiles(dir);
                for (const file of files) {
                    const content = await this.directoryManager.readFile(file);
                    if (content.includes(`id: ${id}`)) {
                        const titleMatch = content.match(/^# (.+)$/m);
                        if (titleMatch) {
                            const title = titleMatch[1];
                            this.noteCacheManager.cacheTitle(id, title);
                            return title;
                        }
                    }
                }
            }
        } catch (error) {
            return null;
        }
        return null;
    }

    async checkDirectories(): Promise<boolean> {
        return this.directoryManager.checkDirectories();
    }

    async ensureDirectories(): Promise<void> {
        return this.directoryManager.ensureDirectories();
    }
}
