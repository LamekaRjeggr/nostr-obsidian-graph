import { RelayService } from '../core/relay-service';
import { EventKinds } from '../core/base-event-handler';
import { Notice, App, TFile } from 'obsidian';
import { NostrSettings, ProfileData } from '../../types';
import { FileService } from '../core/file-service';
import { FrontmatterUtil } from '../file/utils/frontmatter-util';

export class MentionedNoteFetcher {
    constructor(
        private relayService: RelayService,
        private app: App,
        private settings: NostrSettings,
        private fileService: FileService
    ) {}

    async fetchMentionedProfiles() {
        try {
            // First pass: Scan files and collect profiles
            const files = this.app.vault.getMarkdownFiles();
            const profileKeys = new Set<string>();
            const notesWithProfiles = new Map<TFile, string[]>(); // file -> pubkeys
            let scannedCount = 0;

            // Scan each file for p tags
            for (const file of files) {
                const cache = this.app.metadataCache.getFileCache(file);
                if (!cache?.frontmatter?.nostr_tags) continue;

                // Get p tags from note
                const pTags = cache.frontmatter.nostr_tags
                    .filter((tag: string[]) => Array.isArray(tag) && tag[0] === 'p' && tag[1])
                    .map((tag: string[]) => tag[1]);

                if (pTags.length > 0) {
                    pTags.forEach((pubkey: string) => profileKeys.add(pubkey));
                    notesWithProfiles.set(file, pTags);
                }
                scannedCount++;
            }

            if (profileKeys.size === 0) {
                new Notice(`No profile mentions found in ${scannedCount} files`);
                return;
            }

            new Notice(`Found ${profileKeys.size} profiles in ${scannedCount} files...`);

            // Second pass: Fetch and create profiles
            const profiles = new Map<string, string>(); // pubkey -> display name
            const batchSize = 10;
            let processedCount = 0;
            const profileArray = Array.from(profileKeys);

            for (let i = 0; i < profileArray.length; i += batchSize) {
                const batch = profileArray.slice(i, i + batchSize);
                const filters = batch.map(pubkey => ({
                    kinds: [0],
                    authors: [pubkey]
                }));

                try {
                    // Fetch profiles in batch
                    const events = await this.relayService.subscribe(filters);
                    
                    // Process each profile
                    for (const event of events) {
                        try {
                            const profile = JSON.parse(event.content);
                            const displayName = profile.display_name || profile.name || `Nostr User ${event.pubkey.slice(0, 8)}`;

                            // Save profile using FileService
                            await this.fileService.saveProfile({
                                pubkey: event.pubkey,
                                name: profile.name,
                                displayName: profile.display_name,
                                about: profile.about,
                                nip05: profile.nip05,
                                picture: profile.picture
                            });

                            profiles.set(event.pubkey, displayName);
                            processedCount++;
                        } catch (error) {
                            console.error(`Error processing profile ${event.pubkey}:`, error);
                            continue;
                        }
                    }

                    new Notice(`Processed ${processedCount} of ${profileKeys.size} profiles...`);
                } catch (error) {
                    console.error('Error fetching profile batch:', error);
                    continue;
                }
            }

            // Third pass: Update notes with proper profile links
            let updatedCount = 0;
            for (const [file, pubkeys] of notesWithProfiles.entries()) {
                try {
                    const content = await this.app.vault.read(file);
                    const cache = this.app.metadataCache.getFileCache(file);
                    if (!cache?.frontmatter) continue;

                    // Update frontmatter with proper profile links
                    const mentions = pubkeys.map(pubkey => {
                        const displayName = profiles.get(pubkey);
                        return displayName ? `[[${displayName}]]` : pubkey;
                    });

                    const updatedFrontmatter = {
                        ...cache.frontmatter,
                        mentions
                    };

                    // Replace frontmatter in content
                    const newContent = content.replace(
                        /^---\n([\s\S]*?)\n---/,
                        `---\n${FrontmatterUtil.formatFrontmatter(updatedFrontmatter)}\n---`
                    );

                    await this.app.vault.modify(file, newContent);
                    updatedCount++;
                } catch (error) {
                    console.error(`Error updating note ${file.path}:`, error);
                    continue;
                }
            }

            new Notice(`Completed: ${processedCount} profiles created and ${updatedCount} notes updated`);
        } catch (error) {
            console.error('Error fetching mentioned profiles:', error);
            new Notice('Error fetching mentioned profiles');
        }
    }
}
