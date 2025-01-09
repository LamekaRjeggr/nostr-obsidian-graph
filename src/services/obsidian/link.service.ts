import { App, TFile, CachedMetadata, LinkCache } from 'obsidian';
import { NostrEvent, IIndexService } from '../../interfaces';
import { NOSTR_DIRS } from '../../constants';
import { IProfileFileService } from './profile-file.service';

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
    constructor(
        private app: App
    ) {
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
            // Extract references from tags
            const references = {
                profiles: event.tags.filter(tag => tag[0] === 'p').map(tag => tag[1]),
                notes: event.tags.filter(tag => tag[0] === 'e').map(tag => tag[1]),
                replyTo: event.tags.find(tag => tag[0] === 'e' && tag[3] === 'reply')?.slice(1, 2) || []
            };

            // Create markdown sections
            const sections = [];

            // Add reply context if this is a reply
            if (references.replyTo.length > 0) {
                sections.push('### Reply Context', 
                    ...references.replyTo.map(id => `↳ Reply to [[${NOSTR_DIRS.USER_NOTES}/${id}.md]]`));
            }

            // Add references section
            if (references.profiles.length > 0 || references.notes.length > 0) {
                sections.push('### References');
                
                // Add profile references
                for (const id of references.profiles) {
                    // Use pubkey for both link text and path
                    const path = `${NOSTR_DIRS.GLOBAL_PROFILES}/${id}.md`;
                    sections.push(`👤 [[${path}]]`);
                }

                // Add note references
                for (const id of references.notes) {
                    if (!references.replyTo.includes(id)) { // Skip if already in reply context
                        sections.push(`📝 [[${NOSTR_DIRS.USER_NOTES}/${id}.md]]`);
                    }
                }
            }

            // Add backlinks section using metadata cache
            const file = this.app.vault.getAbstractFileByPath(`nostr/user notes/${event.id}.md`);
            if (file instanceof TFile) {
                const backlinks = (this.app.metadataCache as any).getBacklinksForFile(file) as FileBacklinks;
                if (backlinks?.data.size > 0) {
                    sections.push('### Referenced By');
                    for (const [path] of backlinks.data) {
                        if (path.startsWith('nostr/user notes/')) {
                            sections.push(`← [[${path}]]`);
                        }
                    }
                }
            }

            // Update file content
            if (sections.length > 0) {
                const file = this.app.vault.getAbstractFileByPath(`nostr/user notes/${event.id}.md`);
                if (file instanceof TFile) {
                    const content = await this.app.vault.read(file);
                    const newContent = content.includes('### References') ?
                        content.replace(/### References[\s\S]*$/, sections.join('\n')) :
                        content + '\n\n---\n' + sections.join('\n');
                    await this.app.vault.modify(file, newContent);
                }
            }

            // Update frontmatter
            await this.updateNoteFrontmatter(event.id, references);
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
            await this.updateNoteFrontmatter(file.basename, {
                profiles: profileRefs,
                notes: noteRefs,
                replyTo: []
            });
        }
    }

    private async processProfileLinks(file: TFile, cache: CachedMetadata): Promise<void> {
        // Get backlinks from metadata cache
        const backlinks = (this.app.metadataCache as any).getBacklinksForFile(file) as FileBacklinks;
        const mentioningNotes = Array.from(backlinks.data.keys())
            .filter(path => typeof path === 'string' && path.startsWith('nostr/user notes/'));

        // Create markdown sections
        const sections = [];

        // Add mentions section if there are backlinks
        if (mentioningNotes.length > 0) {
            sections.push('### Mentioned In');
            for (const path of mentioningNotes) {
                sections.push(`← [[${path}]]`);
            }
        }

        // Update file content
        if (sections.length > 0) {
            const content = await this.app.vault.read(file);
            const newContent = content.includes('### Mentioned In') ?
                content.replace(/### Mentioned In[\s\S]*$/, sections.join('\n')) :
                content + '\n\n---\n' + sections.join('\n');
            await this.app.vault.modify(file, newContent);

            // Update frontmatter
            const noteIds = mentioningNotes.map(path => 
                path.replace('nostr/user notes/', '').replace('.md', '')
            );
            await this.updateProfileFrontmatter(file.basename, { mentions: noteIds });
        }
    }

    /**
     * Update frontmatter for note files
     */
    private async updateNoteFrontmatter(noteId: string, references: { profiles: string[], notes: string[], replyTo: string[] }): Promise<void> {
        const file = this.app.vault.getAbstractFileByPath(`nostr/user notes/${noteId}.md`);
        if (!(file instanceof TFile)) return;

        const content = await this.app.vault.read(file);
        const newContent = content.replace(/^(---)[\s\S]*?(---)/, (match, p1, p2) => {
            const yaml = match.slice(3, -3);
            const data = yaml ? JSON.parse(yaml) : {};
            data.references = references;
            return `---\n${JSON.stringify(data, null, 2)}\n---`;
        });
        await this.app.vault.modify(file, newContent);
    }

    /**
     * Update frontmatter for profile files
     */
    private async updateProfileFrontmatter(profileId: string, data: { mentions: string[] }): Promise<void> {
        const file = this.app.vault.getAbstractFileByPath(`${NOSTR_DIRS.USER_PROFILE}/${profileId}.md`);
        if (!(file instanceof TFile)) return;

        const content = await this.app.vault.read(file);
        const newContent = content.replace(/^(---)[\s\S]*?(---)/, (match, p1, p2) => {
            const yaml = match.slice(3, -3);
            const frontmatter = yaml ? JSON.parse(yaml) : {};
            frontmatter.mentions = data.mentions;
            return `---\n${JSON.stringify(frontmatter, null, 2)}\n---`;
        });
        await this.app.vault.modify(file, newContent);
    }
}
