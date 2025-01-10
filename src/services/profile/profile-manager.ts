import { App, MetadataCache, TFile } from 'obsidian';
import { NostrProfile, NostrSettings } from '../../types';
import { Event } from 'nostr-tools';
import { PathUtils } from '../file/utils/path-utils';

export class ProfileManager {
    private pathUtils: PathUtils;
    private metadataCache: MetadataCache;

    constructor(
        private app: App,
        private settings: NostrSettings
    ) {
        this.pathUtils = new PathUtils(app);
        this.metadataCache = app.metadataCache;
    }

    /**
     * Process a profile metadata event and save to vault
     */
    async processProfileMetadata(event: Event): Promise<NostrProfile> {
        try {
            const metadata = JSON.parse(event.content);
            const profile: NostrProfile = {
                pubkey: event.pubkey,
                name: metadata.name || 'Unknown',
                about: metadata.about,
                picture: metadata.picture,
                nip05: metadata.nip05
            };

            // Save profile to vault
            await this.saveProfile(profile);
            
            return profile;
        } catch (error) {
            console.error('Error processing profile metadata:', error);
            return this.createDefaultProfile(event.pubkey);
        }
    }

    /**
     * Get a profile from the vault by pubkey
     */
    async getProfile(pubkey: string): Promise<NostrProfile | undefined> {
        const files = this.app.vault.getMarkdownFiles();
        
        for (const file of files) {
            if (!file.path.startsWith(this.settings.profilesDirectory)) continue;

            const cache = this.metadataCache.getFileCache(file);
            if (!cache?.frontmatter) continue;

            const { aliases } = cache.frontmatter;
            if (Array.isArray(aliases) && aliases.includes(pubkey)) {
                return {
                    pubkey,
                    name: cache.frontmatter.name || 'Unknown',
                    about: cache.frontmatter.about,
                    picture: cache.frontmatter.picture,
                    nip05: cache.frontmatter.nip05
                };
            }
        }

        return undefined;
    }

    /**
     * Fetch and process profiles for multiple pubkeys
     */
    async fetchProfiles(pubkeys: string[]): Promise<void> {
        for (const pubkey of pubkeys) {
            // Check if profile already exists
            const existingProfile = await this.getProfile(pubkey);
            if (!existingProfile) {
                // If not, create a default profile
                const defaultProfile = this.createDefaultProfile(pubkey);
                await this.saveProfile(defaultProfile);
            }
        }
    }

    /**
     * Save a profile to the vault
     */
    private async saveProfile(profile: NostrProfile): Promise<void> {
        const displayName = profile.name || `Nostr User ${profile.pubkey.slice(0, 8)}`;
        const filePath = this.pathUtils.getPath(displayName, this.settings.profilesDirectory);

        const content = [
            '---',
            'aliases:',
            `  - ${profile.pubkey}`,
            `name: "${profile.name || ''}"`,
            profile.about ? `about: "${profile.about}"` : null,
            profile.picture ? `picture: "${profile.picture}"` : null,
            profile.nip05 ? `nip05: "${profile.nip05}"` : null,
            '---\n',
            `# ${displayName}\n`,
            profile.about || ''
        ].filter(line => line !== null).join('\n');

        const file = this.app.vault.getAbstractFileByPath(filePath);
        if (file instanceof TFile) {
            await this.app.vault.modify(file, content);
        } else {
            await this.app.vault.create(filePath, content);
        }
    }

    /**
     * Create a default profile for a pubkey
     */
    private createDefaultProfile(pubkey: string): NostrProfile {
        return {
            pubkey,
            name: `Nostr User ${pubkey.slice(0, 8)}`
        };
    }
}
