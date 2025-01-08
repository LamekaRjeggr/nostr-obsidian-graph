import { NostrEvent } from '../../interfaces';
import { IIndexService } from '../../interfaces';
import { IObsidianFileService } from './obsidian-file.service';
import { FrontmatterService } from '../core/frontmatter.service';

export interface IProfileFileService {
    saveProfile(event: NostrEvent, directory?: string): Promise<void>;
    getProfile(pubkey: string): Promise<NostrEvent>;
    getProfileByDisplayName(displayName: string): Promise<NostrEvent | null>;
}

export class ProfileFileService implements IProfileFileService {
    private readonly defaultProfileDir = 'nostr/user profile';

    constructor(
        private obsidianFileService: IObsidianFileService,
        private indexService: IIndexService
    ) {}

    async saveProfile(event: NostrEvent, directory?: string): Promise<void> {
        if (event.kind !== 0) {
            throw new Error('Not a profile event');
        }

        try {
            const profileData = JSON.parse(event.content);
            const displayName = profileData.display_name || profileData.name || event.pubkey;
            const targetDir = directory || this.defaultProfileDir;
            const filepath = `${targetDir}/${displayName}.md`;

            // Create frontmatter with metadata and ensure pubkey is preserved
            const frontmatter = {
                ...FrontmatterService.createBaseFrontmatter(event),
                name: profileData.name || '',
                display_name: profileData.display_name || '',
                nip05: profileData.nip05 || '',
                pubkey: event.pubkey,  // Store pubkey for verification
                aliases: [displayName] // Use display name for graph view
            };

            // Create markdown content with collapsible JSON section
            const content = [
                this.obsidianFileService.createFrontmatter(frontmatter),
                '',
                `# ${displayName}`,
                '',
                profileData.about || '',
                '',
                profileData.website ? `Website: ${profileData.website}` : '',
                profileData.nip05 ? `NIP-05: ${profileData.nip05}` : '',
                '',
                '---',
                '> [!note]- Raw Event JSON',
                '> ```json',
                `> ${JSON.stringify(event, null, 2).split('\n').join('\n> ')}`,
                '> ```'
            ].filter(line => line !== ''); // Remove empty lines

            const markdown = content.join('\n');

            await this.obsidianFileService.createOrUpdateFile(filepath, markdown);
        } catch (error) {
            console.error('Failed to save profile:', error);
            throw error;
        }
    }

    async getProfile(pubkey: string): Promise<NostrEvent> {
        const files = await this.indexService.findEventsByAuthor(pubkey);
        if (files.length === 0) {
            throw new Error(`No profile found for ${pubkey}`);
        }

        // Find profile event (kind 0)
        for (const file of files) {
            const content = await this.obsidianFileService.readFile(file);
            const frontmatter = this.obsidianFileService.getFrontmatter(content);
            if (frontmatter?.kind === 0 && frontmatter?.pubkey === pubkey) {
                const profileContent = {
                    name: frontmatter.name,
                    display_name: frontmatter.display_name,
                    nip05: frontmatter.nip05
                };
                return FrontmatterService.createEventFromFrontmatter(frontmatter, JSON.stringify(profileContent));
            }
        }

        throw new Error(`No profile found for ${pubkey}`);
    }

    async getProfileByDisplayName(displayName: string): Promise<NostrEvent | null> {
        try {
            const file = this.obsidianFileService.getFileByPath(`${this.defaultProfileDir}/${displayName}.md`);
            if (!file) {
                return null;
            }
            const content = await this.obsidianFileService.readFile(file);
            const frontmatter = this.obsidianFileService.getFrontmatter(content);
            
            // Verify this is a valid profile
            if (frontmatter?.kind === 0 && frontmatter?.pubkey) {
                const profileContent = {
                    name: frontmatter.name,
                    display_name: frontmatter.display_name,
                    nip05: frontmatter.nip05
                };
                return FrontmatterService.createEventFromFrontmatter(frontmatter, JSON.stringify(profileContent));
            }
            return null;
        } catch (error) {
            console.error(`Failed to get profile by display name: ${displayName}`, error);
            return null;
        }
    }
}
