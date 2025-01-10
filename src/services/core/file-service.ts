import { Vault, TFile } from 'obsidian';
import { NostrEvent, NostrSettings, ProfileData, ChronologicalMetadata, TagReference, TagType, PollFrontmatter, GroupedReferences } from '../../types';
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
        this.directoryManager = new DirectoryManager(vault, settings);
        this.noteCacheManager = new NoteCacheManager();
        this.tagProcessor = new TagProcessor();
        this.pathUtils = new PathUtils(app);
    }

    private isUserContent(pubkey: string): boolean {
        const userHex = KeyService.npubToHex(this.settings.npub);
        return userHex === pubkey;
    }

    private getNotePath(event: NostrEvent): string {
        // Check if this is user's own note
        if (this.isUserContent(event.pubkey)) {
            return this.pathUtils.getNotePath(event.content, 'nostr/User Notes');
        }

        // Check if this is a reply to the user
        const userHex = KeyService.npubToHex(this.settings.npub);
        const isReplyToUser = event.tags.some((tag: string[]) => 
            tag[0] === 'p' && tag[1] === userHex
        );
        if (isReplyToUser) {
            return this.pathUtils.getNotePath(event.content, 'nostr/Replies to User');
        }

        // Default to original notes directory for other content
        return this.pathUtils.getNotePath(event.content, this.settings.notesDirectory);
    }

    private getPollPath(poll: PollFrontmatter): string {
        return this.pathUtils.getPollPath(poll.question, this.settings.polls.directory);
    }

    private convertToTagReferences(references: ChronologicalMetadata['references']): TagReference[] {
        if (!references) return [];
        return references.map((ref: TagReference) => ({
            ...ref,
            type: ref.type as TagType
        }));
    }

    async saveNote(event: NostrEvent, metadata?: ChronologicalMetadata): Promise<void> {
        await this.directoryManager.ensureDirectories();

        const title = ContentProcessor.extractTitle(event.content);
        // Get just the filename without directory or extension
        const safeTitle = this.pathUtils.getPath(title, '', { extractTitle: false }).replace(/^.*[/\\](.+?)\.md$/, '$1');
        this.noteCacheManager.cacheTitle(event.id, safeTitle);
        
        const filePath = this.getNotePath(event);
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
            metadata?.previousNote || metadata?.nextNote 
                ? await this.noteFormatter.formatChronologicalLinks(metadata)
                : '',
            metadata?.references?.length 
                ? await this.noteFormatter.formatReferences(this.convertToTagReferences(metadata.references))
                : '',
            metadata?.referencedBy?.length 
                ? await this.noteFormatter.formatBacklinks(this.convertToTagReferences(metadata.referencedBy))
                : ''
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

        // Update links
        if (metadata?.previousNote) {
            this.noteCacheManager.addLink(metadata.previousNote, event.id);
        }
        if (metadata?.nextNote) {
            this.noteCacheManager.addLink(event.id, metadata.nextNote);
        }
    }

    async savePoll(poll: PollFrontmatter, content: string): Promise<void> {
        await this.directoryManager.ensureDirectories();

        const filePath = this.getPollPath(poll);
        const file = this.app.vault.getAbstractFileByPath(filePath);

        // Save file with race condition handling
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
            profile.about || ''
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

        // Check profiles
        const profileFiles = await this.directoryManager.listFiles(this.settings.profilesDirectory);
        for (const filePath of profileFiles) {
            const file = this.app.vault.getAbstractFileByPath(filePath);
            if (!(file instanceof TFile)) continue;

            const cache = this.app.metadataCache.getFileCache(file);
            if (cache?.frontmatter?.aliases?.includes(id)) {
                const title = cache.frontmatter.display_name || 
                            cache.frontmatter.name || 
                            `Nostr User ${id.slice(0, 8)}`;
                this.titleCache.set(id, title);
                return title;
            }
        }

        // Check notes in all relevant directories
        const directories = [
            this.settings.notesDirectory,
            this.settings.directories.replies,
            'nostr/User Notes',
            'nostr/Replies to User'
        ].filter((dir): dir is string => typeof dir === 'string');

        for (const dir of directories) {
            const files = await this.directoryManager.listFiles(dir);
            for (const filePath of files) {
                const file = this.app.vault.getAbstractFileByPath(filePath);
                if (!(file instanceof TFile)) continue;

                const cache = this.app.metadataCache.getFileCache(file);
                if (cache?.frontmatter?.id === id && cache.headings?.[0]?.heading) {
                    const title = cache.headings[0].heading;
                    this.titleCache.set(id, title);
                    this.noteCacheManager.cacheTitle(id, title);
                    return title;
                }
            }
        }

        return null;
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

    async getNostrMetadata(filePath: string): Promise<NoteMeta | null> {
        console.log('Getting metadata for file:', filePath);
        
        const file = this.app.vault.getAbstractFileByPath(filePath);
        console.log('File object:', file);
        
        if (!file || !(file instanceof TFile)) {
            console.log('File is not a TFile instance');
            return null;
        }

        const cache = this.app.metadataCache.getFileCache(file);
        console.log('Metadata cache:', cache);
        
        const frontmatter = cache?.frontmatter;
        if (!frontmatter) {
            console.log('No frontmatter found');
            return null;
        }

        // If it's a profile file (in any profile directory)
        if (filePath.startsWith(this.settings.profilesDirectory) || 
            filePath.startsWith('nostr/User Profile')) {
            // For profiles, the pubkey is stored in aliases array
            const pubkey = frontmatter.aliases?.[0];
            if (!pubkey) {
                console.log('No pubkey found in profile');
                return null;
            }
            return {
                id: pubkey,
                pubkey,
                kind: 0, // Profile kind
                nostr_tags: [],
                tags: [],
                likes: 0,
                zaps: 0,
                zap_amount: 0,
                created: frontmatter.created || 0
            };
        }

        // For regular notes
        if (!frontmatter.id) {
            console.log('No nostr event ID found');
            return null;
        }

        return frontmatter;
    }
}
