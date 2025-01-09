import { App, TFile, CachedMetadata, LinkCache } from 'obsidian';
import { NostrEvent } from '../../interfaces';
import { NOSTR_DIRS } from '../../constants';

export interface ILinkService {
    getReferencedProfiles(noteId: string): Promise<string[]>;
    getReferencedNotes(noteId: string): Promise<string[]>;
    getProfileMentions(profileId: string): Promise<string[]>;
    updateLinks(event: NostrEvent): Promise<void>;
}

interface FileBacklinks {
    data: Map<string, LinkCache[]>;
}

export class LinkService implements ILinkService {
    constructor(private app: App) {
        // Listen for metadata changes to update links
        this.app.metadataCache.on('changed', (file: TFile) => {
            this.processFileLinks(file);
        });
    }

    /**
     * Get profiles referenced in a note
     */
    async getReferencedProfiles(noteId: string): Promise<string[]> {
        const file = this.app.vault.getAbstractFileByPath(`nostr/user notes/${noteId}.md`);
        if (!(file instanceof TFile)) return [];

        const cache = this.app.metadataCache.getFileCache(file);
        if (!cache?.links) return [];

        return cache.links
            .filter(link => (link as any).link.startsWith(NOSTR_DIRS.USER_PROFILE) || 
                           (link as any).link.startsWith(NOSTR_DIRS.GLOBAL_PROFILES))
            .map(link => {
                const path = (link as any).link;
                return path.replace(`${NOSTR_DIRS.USER_PROFILE}/`, '')
                          .replace(`${NOSTR_DIRS.GLOBAL_PROFILES}/`, '')
                          .replace('.md', '');
            });
    }

    /**
     * Get notes that reference a profile
     */
    async getProfileMentions(profileId: string): Promise<string[]> {
        // Try user profile first, then global profiles
        let profileFile = this.app.vault.getAbstractFileByPath(`${NOSTR_DIRS.USER_PROFILE}/${profileId}.md`);
        if (!profileFile) {
            profileFile = this.app.vault.getAbstractFileByPath(`${NOSTR_DIRS.GLOBAL_PROFILES}/${profileId}.md`);
        }
        if (!(profileFile instanceof TFile)) return [];

        const backlinks = (this.app.metadataCache as any).getBacklinksForFile(profileFile) as FileBacklinks;
        return Array.from(backlinks.data.keys())
            .filter(path => typeof path === 'string' && path.startsWith('nostr/user notes/'))
            .map(path => path.replace('nostr/user notes/', '').replace('.md', ''));
    }

    /**
     * Get notes referenced by another note
     */
    async getReferencedNotes(noteId: string): Promise<string[]> {
        const file = this.app.vault.getAbstractFileByPath(`nostr/user notes/${noteId}.md`);
        if (!(file instanceof TFile)) return [];

        const cache = this.app.metadataCache.getFileCache(file);
        if (!cache?.links) return [];

        return cache.links
            .filter(link => (link as any).link.startsWith('nostr/user notes/'))
            .map(link => (link as any).link.replace('nostr/user notes/', '').replace('.md', ''));
    }

    /**
     * Update links when saving a new event
     */
    async updateLinks(event: NostrEvent): Promise<void> {
        if (event.kind === 1) { // Text note
            // Extract profile mentions from tags
            const profileRefs = event.tags
                .filter(tag => tag[0] === 'p')
                .map(tag => tag[1]);

            // Extract note references from tags
            const noteRefs = event.tags
                .filter(tag => tag[0] === 'e')
                .map(tag => tag[1]);

            // Create markdown content with links
            const links = await Promise.all([
                ...profileRefs.map(async id => {
                    // Check if profile exists in user profiles first
                    const userProfilePath = `${NOSTR_DIRS.USER_PROFILE}/${id}.md`;
                    const globalProfilePath = `${NOSTR_DIRS.GLOBAL_PROFILES}/${id}.md`;
                    
                    if (this.app.vault.getAbstractFileByPath(userProfilePath)) {
                        return `[[${userProfilePath}]]`;
                    } else {
                        return `[[${globalProfilePath}]]`;
                    }
                }),
                ...noteRefs.map(id => `[[${NOSTR_DIRS.USER_NOTES}/${id}.md]]`)
            ]);

            if (links.length > 0) {
                const footer = '\n\n---\n### References\n' + links.join('\n');
                // Append links to note content
                const file = this.app.vault.getAbstractFileByPath(`nostr/user notes/${event.id}.md`);
                if (file instanceof TFile) {
                    const content = await this.app.vault.read(file);
                    await this.app.vault.modify(file, content + footer);
                }
            }
        }
    }

    /**
     * Process links in a file when it changes
     */
    private async processFileLinks(file: TFile): Promise<void> {
        const cache = this.app.metadataCache.getFileCache(file);
        if (!cache?.links) return;

        // Process links based on file type
        if (file.path.startsWith('nostr/user notes/')) {
            await this.processNoteLinks(file, cache);
        } else if (file.path.startsWith('nostr/user profile/')) {
            await this.processProfileLinks(file, cache);
        }
    }

    private async processNoteLinks(file: TFile, cache: CachedMetadata): Promise<void> {
        // Update note's frontmatter with referenced profiles and notes
        const profileRefs = cache.links
            .filter(link => (link as any).link.startsWith(NOSTR_DIRS.USER_PROFILE) || 
                           (link as any).link.startsWith(NOSTR_DIRS.GLOBAL_PROFILES))
            .map(link => {
                const path = (link as any).link;
                return path.replace(`${NOSTR_DIRS.USER_PROFILE}/`, '')
                          .replace(`${NOSTR_DIRS.GLOBAL_PROFILES}/`, '')
                          .replace('.md', '');
            });

        const noteRefs = cache.links
            .filter(link => (link as any).link.startsWith('nostr/user notes/'))
            .map(link => (link as any).link.replace('nostr/user notes/', '').replace('.md', ''));

        if (profileRefs.length > 0 || noteRefs.length > 0) {
            // Update frontmatter with references
            const content = await this.app.vault.read(file);
            const newContent = content.replace(/^(---)[\s\S]*?(---)/, (match, p1, p2) => {
                const yaml = match.slice(3, -3);
                const data = yaml ? JSON.parse(yaml) : {};
                data.references = {
                    profiles: profileRefs,
                    notes: noteRefs
                };
                return `---\n${JSON.stringify(data, null, 2)}\n---`;
            });
            await this.app.vault.modify(file, newContent);
        }
    }

    private async processProfileLinks(file: TFile, cache: CachedMetadata): Promise<void> {
        // Update profile's frontmatter with notes that mention it
        const backlinks = (this.app.metadataCache as any).getBacklinksForFile(file) as FileBacklinks;
        const mentioningNotes = Array.from(backlinks.data.keys())
            .filter(path => typeof path === 'string' && path.startsWith('nostr/user notes/'))
            .map(path => path.replace('nostr/user notes/', '').replace('.md', ''));

        if (mentioningNotes.length > 0) {
            // Update frontmatter with mentions
            const content = await this.app.vault.read(file);
            const newContent = content.replace(/^(---)[\s\S]*?(---)/, (match, p1, p2) => {
                const yaml = match.slice(3, -3);
                const data = yaml ? JSON.parse(yaml) : {};
                data.mentions = mentioningNotes;
                return `---\n${JSON.stringify(data, null, 2)}\n---`;
            });
            await this.app.vault.modify(file, newContent);
        }
    }
}
