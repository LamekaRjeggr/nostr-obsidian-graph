import { Notice, Plugin, TFile } from 'obsidian';
import { NostrEvent, IIndexService, ILinkService } from './interfaces';
import { DEFAULT_SETTINGS, type Settings } from './types';
import { SearchModal } from './modals/search-modal';
import { RelayService } from './services/core/relay.service';
import { EventService } from './services/core/event.service';
import { KeyService } from './services/core/key.service';
import { MetadataCacheService } from './services/obsidian/metadata-cache.service';
import { LinkService } from './services/obsidian/link.service';
import { ProfileService } from './services/nostr/profile.service';
import { NoteService } from './services/nostr/note.service';
import { FollowService } from './services/nostr/follow.service';
import { VaultService } from './services/obsidian/vault.service';
import { ObsidianFileService } from './services/obsidian/obsidian-file.service';
import { ProfileFileService } from './services/obsidian/profile-file.service';
import { NoteFileService } from './services/obsidian/note-file.service';
import { FollowFileService } from './services/obsidian/follow-file.service';
import { MarkdownService } from './services/core/markdown.service';
import { NostrSettingsTab } from './settings-tab';

export default class NostrPlugin extends Plugin {
    settings: Settings;
    private relayService: RelayService;
    private eventService: EventService;
    private keyService: KeyService;
    private indexService: IIndexService;
    private linkService: ILinkService;
    private profileService: ProfileService;
    private noteService: NoteService;
    private followService: FollowService;
    private vaultService: VaultService;
    private obsidianFileService: ObsidianFileService;
    private profileFileService: ProfileFileService;
    private noteFileService: NoteFileService;
    private followFileService: FollowFileService;

    async onload() {
        try {
            // Initialize settings
            this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

            // Get enabled relays
            const enabledRelays = this.settings.relays
                .filter(r => r.enabled)
                .map(r => r.url);

            // Initialize Obsidian services first
            this.obsidianFileService = new ObsidianFileService(this.app);
            
            // Initialize core services
            this.relayService = new RelayService();
            this.eventService = new EventService(this.relayService);
            this.keyService = new KeyService();
            this.indexService = new MetadataCacheService(this.app);
            this.linkService = new LinkService(this.app);
            
            // Initialize file services
            this.profileFileService = new ProfileFileService(
                this.obsidianFileService,
                this.indexService
            );
            this.noteFileService = new NoteFileService(
                this.obsidianFileService,
                this.indexService
            );
            this.followFileService = new FollowFileService(
                this.obsidianFileService,
                this.indexService
            );
            
            // Initialize vault service with all file services
            this.vaultService = new VaultService(
                this.app,
                this.indexService,
                this.obsidianFileService,
                this.profileFileService,
                this.noteFileService,
                this.followFileService
            );
            
            // Initialize Nostr services
            this.profileService = new ProfileService(
                this.relayService,
                this.eventService
            );
            
            this.noteService = new NoteService(
                this.relayService,
                this.eventService
            );
            
            this.followService = new FollowService(
                this.relayService,
                this.eventService
            );

            // Store relay URLs (connection will happen on first fetch)
            this.relayService.connect(enabledRelays);

            // Ensure directories exist
            await this.vaultService.ensureDirectories();

            // Add settings tab
            this.addSettingTab(new NostrSettingsTab(this.app, this));

            // Add commands
            this.addCommand({
                id: 'search-nostr',
                name: 'Search Nostr Notes',
                callback: async () => {
                    new SearchModal(
                        this.app,
                        this.vaultService,
                        (options) => this.noteService.searchWithOptions(options)
                    ).open();
                }
            });

            this.addCommand({
                id: 'fetch-profile',
                name: 'Fetch Profile',
                callback: async () => {
                    const npub = this.settings.pubkey;
                    if (!npub) {
                        new Notice('No public key set');
                        return;
                    }
                    try {
                        await this.relayService.ensureConnected();
                        const hex = await this.keyService.npubToHex(npub);
                        const event = await this.profileService.fetchEvent(hex);
                        await this.vaultService.saveEvent(event as NostrEvent);
                        new Notice('Profile fetched');
                    } catch (error) {
                        console.error('Failed to fetch profile:', error);
                        new Notice('Failed to fetch profile');
                    }
                }
            });

            this.addCommand({
                id: 'fetch-notes',
                name: 'Fetch Notes',
                callback: async () => {
                    const npub = this.settings.pubkey;
                    if (!npub) {
                        new Notice('No public key set');
                        return;
                    }
                    try {
                        await this.relayService.ensureConnected();
                        const hex = await this.keyService.npubToHex(npub);
                        const events = await this.noteService.fetchEvents({
                            kinds: [1],
                            authors: [hex],
                            limit: 50
                        });
                        for (const event of events) {
                            await this.vaultService.saveEvent(event as NostrEvent);
                            await this.linkService.updateLinks(event as NostrEvent);
                        }
                        new Notice(`${events.length} notes fetched`);
                    } catch (error) {
                        console.error('Failed to fetch notes:', error);
                        new Notice('Failed to fetch notes');
                    }
                }
            });

            this.addCommand({
                id: 'fetch-follows',
                name: 'Fetch Follow List',
                callback: async () => {
                    const npub = this.settings.pubkey;
                    if (!npub) {
                        new Notice('No public key set');
                        return;
                    }
                    try {
                        await this.relayService.ensureConnected();
                        const hex = await this.keyService.npubToHex(npub);
                        const event = await this.followService.fetchEvent(hex);
                        await this.vaultService.saveEvent(event as NostrEvent);
                        new Notice('Follow list fetched');
                    } catch (error) {
                        console.error('Failed to fetch follow list:', error);
                        new Notice('Failed to fetch follow list');
                    }
                }
            });

            this.addCommand({
                id: 'fetch-follow-profiles',
                name: 'Fetch Follow Profiles',
                callback: async () => {
                    const npub = this.settings.pubkey;
                    if (!npub) {
                        new Notice('No public key set');
                        return;
                    }
                    try {
                        await this.relayService.ensureConnected();
                        const hex = await this.keyService.npubToHex(npub);
                        const followEvent = await this.followService.fetchEvent(hex);
                        
                        // Get the list of followed pubkeys from the tags
                        const followedPubkeys = followEvent.tags
                            .filter(tag => tag[0] === 'p')
                            .map(tag => tag[1]);
                        
                        // Fetch and save profile for each followed pubkey
                        let fetchedCount = 0;
                        for (const pubkey of followedPubkeys) {
                            try {
                                const profileEvent = await this.profileService.fetchEvent(pubkey);
                                await this.vaultService.saveEvent(profileEvent as NostrEvent, true);
                                fetchedCount++;
                            } catch (error) {
                                console.error(`Failed to fetch profile for ${pubkey}:`, error);
                            }
                        }
                        
                        new Notice(`Fetched ${fetchedCount} follow profiles`);
                    } catch (error) {
                        console.error('Failed to fetch follow profiles:', error);
                        new Notice('Failed to fetch follow profiles');
                    }
                }
            });

            // Register context menu
            this.registerEvent(
                this.app.workspace.on('file-menu', (menu, file) => {
                    if (file instanceof TFile && file.path.startsWith('nostr/user')) {
                        menu.addItem((item) => {
                            item
                                .setTitle('Fetch Nostr Data')
                                .setIcon('sync')
                                .onClick(async () => {
                                    try {
                                        const content = await this.app.vault.read(file);
                                        const frontmatter = MarkdownService.extractFrontmatter(content, this.obsidianFileService);
                                        if (!frontmatter?.event?.id) {
                                            throw new Error('No event ID found');
                                        }
                                        await this.relayService.ensureConnected();
                                        const event = await this.vaultService.getEvent(frontmatter.event.id);
                                        if (event.kind === 0) {
                                            const hex = await this.keyService.npubToHex(event.pubkey);
                                            const profileEvent = await this.profileService.fetchEvent(hex);
                                            await this.vaultService.saveEvent(profileEvent as NostrEvent);
                                        } else if (event.kind === 1) {
                                            await this.noteService.fetchEvent(event.id);
                                        } else if (event.kind === 3) {
                                            const hex = await this.keyService.npubToHex(event.pubkey);
                                            await this.followService.fetchEvent(hex);
                                        }
                                        new Notice('Data fetched');
                                    } catch (error) {
                                        console.error('Failed to fetch data:', error);
                                        new Notice('Failed to fetch data');
                                    }
                                });
                        });
                    }
                })
            );

            new Notice('Nostr plugin initialized');
        } catch (error) {
            console.error('Failed to initialize Nostr plugin:', error);
            new Notice('Failed to initialize Nostr plugin');
        }
    }

    onunload() {
        this.relayService.disconnect();
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        
        // Update relay URLs (connection will happen on first fetch)
        const enabledRelays = this.settings.relays
            .filter(r => r.enabled)
            .map(r => r.url);
        this.relayService.connect(enabledRelays);
    }
}
