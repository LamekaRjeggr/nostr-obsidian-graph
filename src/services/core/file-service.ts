import { Vault, TFile } from 'obsidian';
import { NostrEvent, NostrSettings, ProfileData, NoteMetadata, TagReference, TagType, PollFrontmatter, GroupedReferences } from '../../types';
import { NoteCacheManager } from '../file/cache/note-cache-manager';
import { NoteFormatter, LinkResolver } from '../file/formatters/note-formatter';
import { ProfileFormatter } from '../file/formatters/profile-formatter';
import { DirectoryManager } from '../file/system/directory-manager';
import { ContentProcessor } from '../file/utils/text-processor';
import { TagProcessor } from '../processors/tag-processor';
import { FrontmatterUtil } from '../file/utils/frontmatter-util';
import { TemporalUtils } from '../temporal/temporal-utils';
import { logger } from './logger';
import { KeyService } from './key-service';
import { PathUtils } from '../file/utils/path-utils';

interface NoteMeta {
    id: string;
    pubkey: string;
    author?: string;
    created: number;
    created_at?: string;
    kind: number;
    nostr_tags: string[][];
    tags: string[];
    root?: string;
    reply_to?: string;
    mentions?: string[];
    topics?: string[];
    likes: number;      // Initialize reaction fields
    zaps: number;       // Initialize reaction fields
    zap_amount: number; // Initialize reaction fields
    [key: string]: any;
}

export class FileService implements LinkResolver {
    private noteFormatter: NoteFormatter;
    private profileFormatter: ProfileFormatter;
    private directoryManager: DirectoryManager;
    private noteCacheManager: NoteCacheManager;
    private tagProcessor: TagProcessor;
    private titleCache: Map<string, string> = new Map();

    private pathUtils: PathUtils;

    constructor(
        private vault: Vault,
        private settings: NostrSettings,
        private app: any
    ) {
        this.noteFormatter = new NoteFormatter(this);
        this.profileFormatter = new ProfileFormatter();
        this.directoryManager = new DirectoryManager(vault, settings, app);
        this.noteCacheManager = new NoteCacheManager();
        this.tagProcessor = new TagProcessor();
        this.pathUtils = new PathUtils(app);
    }

    private isUserContent(pubkey: string): boolean {
        const userHex = KeyService.npubToHex(this.settings.npub);
        return userHex === pubkey;
    }

    private async isReplyNote(event: NostrEvent): Promise<boolean> {
        const tagResults = this.tagProcessor.process(event);
        return (
            tagResults.replyTo !== undefined ||
            event.tags.some(tag => 
                tag[0] === 'p' && 
                tag[1] === KeyService.npubToHex(this.settings.npub)
            )
        );
    }

    private async getNotePath(event: NostrEvent): Promise<string> {
        if (this.isUserContent(event.pubkey)) {
            return this.pathUtils.getNotePath(event.content, 'nostr/User Notes');
        }
        
        const isReply = await this.isReplyNote(event);
        if (isReply) {
            return this.pathUtils.getNotePath(
                event.content, 
                this.settings.directories.replies
            );
        }
        
        return this.pathUtils.getNotePath(
            event.content, 
            this.settings.notesDirectory
        );
    }

    private getPollPath(poll: PollFrontmatter): string {
        return this.pathUtils.getPollPath(poll.question, this.settings.polls.directory);
    }

    private convertToTagReferences(references: NoteMetadata['references']): TagReference[] {
        if (!references) return [];
        return references.map((ref: TagReference) => ({
            ...ref,
            type: ref.type as TagType
        }));
    }

    async saveNote(event: NostrEvent, metadata?: NoteMetadata): Promise<void> {
        await this.directoryManager.ensureDirectories();

        const title = ContentProcessor.extractTitle(event.content);
        // Get just the filename without directory or extension
        const safeTitle = this.pathUtils.getPath(title, '', { extractTitle: false }).replace(/^.*[/\\](.+?)\.md$/, '$1');
        this.noteCacheManager.cacheTitle(event.id, safeTitle);
        
        const filePath = await this.getNotePath(event);
        const authorName = await this.getTitleById(event.pubkey);

        // Extract tags
        const nostrTopics = new Set(
            event.tags
                .filter((tag: string[]) => tag[0] === 't')
                .map((tag: string[]) => tag[1]?.toLowerCase())
                .filter((tag: string | undefined): tag is string => Boolean(tag))
        );
        const inlineHashtags = new Set(ContentProcessor.extractHashtags(event.content));
        
        // Get existing content and frontmatter
        const file = this.app.vault.getAbstractFileByPath(filePath);
        const existingFrontmatter = file instanceof TFile
            ? this.app.metadataCache.getFileCache(file)?.frontmatter || {}
            : {};

        // Create frontmatter with formatted timestamp
        const timeData = TemporalUtils.formatNoteTimestamp(event.created_at);
        const frontmatterData: NoteMeta = {
            id: event.id,
            pubkey: `[[${event.pubkey}]]`,
            ...timeData,  // Spread operator adds both created and created_at
            kind: event.kind,
            nostr_tags: event.tags,
            tags: [...nostrTopics, ...inlineHashtags],
            likes: existingFrontmatter.likes || 0,       // Initialize or preserve reaction counts
            zaps: existingFrontmatter.zaps || 0,         // Initialize or preserve reaction counts
            zap_amount: existingFrontmatter.zap_amount || 0  // Initialize or preserve reaction counts
        };

        if (authorName) {
            frontmatterData.author = `[[${authorName}]]`;
        }

        // Add references if they exist
        if (metadata?.references?.length) {
            const tagReferences = this.convertToTagReferences(metadata.references);
            const grouped = this.noteFormatter.groupReferencesByType(tagReferences);
            
            if (grouped[TagType.ROOT]?.[0]?.targetId) {
                const rootTitle = await this.getTitleById(grouped[TagType.ROOT][0].targetId);
                if (rootTitle) {
                    frontmatterData.root = `[[${rootTitle}]]`;
                }
            }
            
            if (grouped[TagType.REPLY]?.[0]?.targetId) {
                const replyTitle = await this.getTitleById(grouped[TagType.REPLY][0].targetId);
                if (replyTitle) {
                    frontmatterData.reply_to = `[[${replyTitle}]]`;
                }
            }

            if (grouped[TagType.MENTION]?.length) {
                frontmatterData.mentions = grouped[TagType.MENTION]
                    .map((ref: TagReference) => ref.targetId)
                    .filter((id: string | undefined): id is string => id !== undefined);
            }

            if (grouped[TagType.TOPIC]?.length) {
                frontmatterData.topics = grouped[TagType.TOPIC]
                    .map((ref: TagReference) => ref.targetId)
                    .filter((id: string | undefined): id is string => id !== undefined);
            }
        }

        // Format content sections
        const sections = [
            `# ${title}`,
            event.content,
            metadata?.references?.length 
                ? await this.noteFormatter.formatReferences(this.convertToTagReferences(metadata.references))
                : '',
            metadata?.referencedBy?.length 
                ? await this.noteFormatter.formatBacklinks(this.convertToTagReferences(metadata.referencedBy))
                : '',
            '\n```json\n' + JSON.stringify(event, null, 2) + '\n```'
        ].filter((section: string) => section !== '');

        // Create full content
        const fullContent = [
            '---',
            FrontmatterUtil.formatFrontmatter(frontmatterData),
            '---\n',
            ...sections
        ].join('\n');

        // Save file with race condition handling
        try {
            if (file instanceof TFile) {
                await this.vault.modify(file, fullContent);
            } else {
                await this.vault.create(filePath, fullContent);
            }
        } catch (error) {
            if (error.message === 'File already exists.') {
                // Another process created the file while we were preparing content
                const newFile = this.app.vault.getAbstractFileByPath(filePath);
                if (newFile instanceof TFile) {
                    await this.vault.modify(newFile, fullContent);
                } else {
                    throw new Error('File exists but cannot be accessed');
                }
            } else {
                throw error;
            }
        }

    }

    async savePoll(poll: PollFrontmatter, content: string): Promise<void> {
        await this.directoryManager.ensureDirectories();

        const filePath = this.getPollPath(poll);
        const file = this.app.vault.getAbstractFileByPath(filePath);

        // Add raw JSON to content
        const fullContent = [
            content,
            '\n```json\n' + JSON.stringify(poll, null, 2) + '\n```'
        ].join('');

        // Save file with race condition handling
        try {
            if (file instanceof TFile) {
                await this.vault.modify(file, fullContent);
            } else {
                await this.vault.create(filePath, fullContent);
            }
        } catch (error) {
            if (error.message === 'File already exists.') {
                // Another process created the file while we were preparing content
                const newFile = this.app.vault.getAbstractFileByPath(filePath);
                if (newFile instanceof TFile) {
                    await this.vault.modify(newFile, fullContent);
                } else {
                    throw new Error('File exists but cannot be accessed');
                }
            } else {
                throw error;
            }
        }

        // Cache the poll title
        const safeTitle = this.pathUtils.getPath(poll.question, '', { extractTitle: false }).replace(/^.*[/\\](.+?)\.md$/, '$1');
        this.noteCacheManager.cacheTitle(poll.id, safeTitle);
    }

    async saveProfile(profile: ProfileData): Promise<void> {
        await this.directoryManager.ensureDirectories();

        // Generate display name and path
        const displayName = profile.displayName || profile.name || `Nostr User ${profile.pubkey.slice(0, 8)}`;
        const filePath = this.isUserContent(profile.pubkey)
            ? this.pathUtils.getPath(displayName, 'nostr/User Profile')
            : this.pathUtils.getPath(displayName, this.settings.profilesDirectory);
        const file = this.app.vault.getAbstractFileByPath(filePath);

        const existingFrontmatter = file instanceof TFile
            ? this.app.metadataCache.getFileCache(file)?.frontmatter || {}
            : {};

        const frontmatterData = FrontmatterUtil.createProfileFrontmatter({
            aliases: [profile.pubkey],
            name: profile.name,
            display_name: profile.displayName,
            nip05: profile.nip05,
            picture: profile.picture
        }, existingFrontmatter);
        const content = [
            '---',
            FrontmatterUtil.formatFrontmatter(frontmatterData),
            '---\n',
            `# ${displayName}\n`,
            profile.about || '',
            '\n```json\n' + JSON.stringify(profile, null, 2) + '\n```'
        ].join('\n');

        // Save profile with race condition handling
        try {
            if (file instanceof TFile) {
                await this.vault.modify(file, content);
            } else {
                await this.vault.create(filePath, content);
            }
        } catch (error) {
            if (error.message === 'File already exists.') {
                // Another process created the file while we were preparing content
                const newFile = this.app.vault.getAbstractFileByPath(filePath);
                if (newFile instanceof TFile) {
                    await this.vault.modify(newFile, content);
                } else {
                    throw new Error('File exists but cannot be accessed');
                }
            } else {
                throw error;
            }
        }
    }

    async getTitleById(id: string): Promise<string | null> {
        try {
            // Check cache first
            if (this.titleCache.has(id)) {
                return this.titleCache.get(id)!;
            }

            // Check note cache
            const cached = this.noteCacheManager.getCachedTitle(id);
            if (cached) {
                this.titleCache.set(id, cached);
                return cached;
            }

            // Use Obsidian's metadata cache to find files with matching ID
            const files = this.app.vault.getMarkdownFiles();
            for (const file of files) {
                const cache = this.app.metadataCache.getFileCache(file);
                
                // Check for profile files (using aliases)
                if (cache?.frontmatter?.aliases?.includes(id)) {
                    const title = cache.frontmatter.display_name || 
                                cache.frontmatter.name || 
                                `Nostr User ${id.slice(0, 8)}`;
                    this.titleCache.set(id, title);
                    return title;
                }
                
                // Check for note files (using frontmatter id)
                if (cache?.frontmatter?.id === id && cache.headings?.[0]?.heading) {
                    const title = cache.headings[0].heading;
                    this.titleCache.set(id, title);
                    this.noteCacheManager.cacheTitle(id, title);
                    return title;
                }
            }

            return null;
        } catch (error) {
            console.error(`Error resolving title for ID ${id}:`, error);
            return null;
        }
    }

    async moveProfileToMentions(pubkey: string, name: string): Promise<void> {
        await this.directoryManager.ensureDirectories();

        const sourceFileName = this.profileFormatter.getFileName({ pubkey, name });
        const sourcePath = `${this.settings.profilesDirectory}/${sourceFileName}`;
        const targetPath = `${this.settings.profilesDirectory}/mentions/${sourceFileName}`;

        const sourceFile = this.app.vault.getAbstractFileByPath(sourcePath);
        if (!(sourceFile instanceof TFile)) return;

        try {
            const content = await this.vault.read(sourceFile);
            await this.vault.create(targetPath, content);
            await this.vault.delete(sourceFile);
        } catch (error) {
            if (error.message === 'File already exists.') {
                // Profile already moved, just delete the source
                await this.vault.delete(sourceFile);
            } else {
                throw error;
            }
        }
    }

    async checkDirectories(): Promise<boolean> {
        return this.directoryManager.checkDirectories();
    }

    async ensureDirectories(): Promise<void> {
        return this.directoryManager.ensureDirectories();
    }

    // Public methods for directory operations
    async getNotesDirectories(): Promise<string[]> {
        return [
            this.settings.directories.main,
            this.settings.directories.replies
        ].filter((dir): dir is string => typeof dir === 'string');
    }

    async listFilesInDirectory(directory: string): Promise<string[]> {
        return this.directoryManager.listFiles(directory);
    }

    async hasNote(eventId: string): Promise<boolean> {
        try {
            // Use Obsidian's metadata cache to efficiently search all files
            const files = this.app.vault.getMarkdownFiles();
            for (const file of files) {
                const cache = this.app.metadataCache.getFileCache(file);
                if (cache?.frontmatter?.id === eventId) {
                    return true;
                }
            }
            return false;
        } catch (error) {
            console.error(`Error checking for note ${eventId}:`, error);
            return false;
        }
    }

    async getNostrMetadata(filePath: string): Promise<NoteMeta | null> {
        try {
            const file = this.app.vault.getAbstractFileByPath(filePath);
            if (!file || !(file instanceof TFile)) {
                return null;
            }

            // Use Obsidian's metadata cache
            const cache = this.app.metadataCache.getFileCache(file);
            const frontmatter = cache?.frontmatter;
            if (!frontmatter) {
                return null;
            }

            // Handle profile files
            if (filePath.startsWith(this.settings.profilesDirectory) || 
                filePath.startsWith('nostr/User Profile')) {
                const pubkey = frontmatter.aliases?.[0];
                if (!pubkey) {
                    return null;
                }

                // Use Obsidian's cache for profile metadata
                return {
                    id: pubkey,
                    pubkey,
                    kind: 0,
                    nostr_tags: [],
                    tags: [],
                    likes: frontmatter.likes || 0,
                    zaps: frontmatter.zaps || 0,
                    zap_amount: frontmatter.zap_amount || 0,
                    created: frontmatter.created || 0,
                    name: frontmatter.name,
                    display_name: frontmatter.display_name,
                    nip05: frontmatter.nip05,
                    about: cache?.sections?.[0]?.text || ''
                };
            }

            // Handle regular notes
            if (!frontmatter.id) {
                return null;
            }

            // Use Obsidian's cache for note metadata
            return {
                ...frontmatter,
                content: cache?.sections?.[0]?.text || '',
                title: cache?.headings?.[0]?.heading || 'Untitled Note'
            };
        } catch (error) {
            console.error(`Error getting metadata for ${filePath}:`, error);
            return null;
        }
    }
}
