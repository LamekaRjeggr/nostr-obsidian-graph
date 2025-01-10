import { Plugin, Notice, App, Menu, MenuItem, TAbstractFile } from 'obsidian';
import { NostrEvent } from './types';
import { NodeFetchHandler } from './services/fetch/handlers/node-fetch-handler';
import { NostrSettings } from './types';
import { SettingsTab } from './views/settings-tab';
import { RelayService } from './services/core/relay-service';
import { EventService } from './services/core/event-service';
import { FileService } from './services/core/file-service';
import { FetchService } from './services/fetch/fetch-service';
import { ValidationService } from './services/validation-service';
import { EventEmitter } from './services/event-emitter';
import { ProfileManagerService } from './services/profile/profile-manager-service';
import { FetchSettingsModal } from './views/modals/fetch-settings-modal';
import { MentionedProfileFetcher } from './services/fetch/mentioned-profile-fetcher';
import { MentionedNoteFetcher } from './services/fetch/mentioned-note-fetcher';
import { CurrentFileService } from './services/core/current-file-service';
import { ReactionProcessor } from './services/reactions/reaction-processor';
import { NoteCacheManager } from './services/file/cache/note-cache-manager';
import { PollService } from './experimental/polls/poll-service';
import { UnifiedFetchProcessor } from './services/fetch/unified-fetch-processor';
import { KeywordSearchHandler } from './services/fetch/handlers/keyword-search-handler';
import { HexFetchHandler } from './services/fetch/handlers/hex-fetch-handler';
import { ThreadFetchHandler } from './services/fetch/handlers/thread-fetch-handler';
import { NostrEventBus } from './experimental/event-bus/event-bus';
import { NostrEventType } from './experimental/event-bus/types';
import { ContactGraphService } from './services/contacts/contact-graph-service';
import { TemporalEventStore } from './services/temporal-event-store';
import { ReferenceStore } from './services/references/reference-store';
import { NoteEventHandler } from './services/fetch/handlers/note-handler';

const DEFAULT_SETTINGS: NostrSettings = {
    npub: '',
    relays: [
        { url: 'wss://relay.damus.io', enabled: true },
        { url: 'wss://nos.lol', enabled: true },
        { url: 'wss://relay.nostr.band', enabled: true }
    ],
    notesPerProfile: 50,
    batchSize: 50,
    notesDirectory: 'nostr/notes',  // Keep for backwards compatibility
    profilesDirectory: 'nostr/profiles',
    autoUpdate: false,
    updateInterval: 300,
    includeOwnNotes: true,
    usePublicKeyAsFilename: false,
    directories: {
        main: 'nostr/notes',     // Primary directory for notes
        replies: 'nostr/replies' // Optional directory for replies
    },
    polls: {
        enabled: false,          // Disabled by default for safety
        directory: 'nostr/polls', // Separate directory for polls
        autoUpdate: true         // Auto-update polls when enabled
    },
    hexFetch: {
        batchSize: 50           // Default hex fetch batch size
    },
    threadSettings: {
        limit: 50,              // Default thread fetch limit
        includeContext: true    // Include thread context by default
    }
};

export default class NostrPlugin extends Plugin {
    settings: NostrSettings;
    relayService: RelayService;
    eventService: EventService;
    fileService: FileService;
    fetchService: FetchService;
    eventEmitter: EventEmitter;
    profileManager: ProfileManagerService;
    mentionedProfileFetcher: MentionedProfileFetcher;
    currentFileService: CurrentFileService;
    reactionProcessor: ReactionProcessor;
    noteCacheManager: NoteCacheManager;
    pollService: PollService;
    unifiedFetchProcessor: UnifiedFetchProcessor;
    contactGraphService: ContactGraphService;
    private updateInterval: NodeJS.Timeout | null = null;

    private async processNodeContent(filePath: string): Promise<void> {
        try {
            // Get metadata from file
            const metadata = await this.fileService.getNostrMetadata(filePath);
            if (!metadata) {
                throw new Error('No nostr metadata found');
            }

            // For profiles (kind 0), fetch their content
            if (metadata.kind === 0) {
                await this.fetchService.processFollows([metadata.id], 0);
            } else {
                // For notes, process through FetchProcessor's chain
                const noteIds = new Set<string>();
                noteIds.add(metadata.id);
                
                // Add referenced notes from e-tags
                metadata.nostr_tags
                    ?.filter(tag => tag[0] === 'e')
                    .forEach(tag => noteIds.add(tag[1]));

                // Get all profiles involved
                const profileIds = new Set<string>();
                profileIds.add(metadata.pubkey);
                
                // Add mentioned profiles from p-tags
                metadata.nostr_tags
                    ?.filter(tag => tag[0] === 'p')
                    .forEach(tag => profileIds.add(tag[1]));

                // Process through FetchProcessor
                await this.fetchService.processFollows(Array.from(profileIds), 0);
            }
            
            new Notice('Content fetched successfully');
        } catch (error) {
            console.error('Error fetching node content:', error);
            new Notice(`Error: ${error.message}`);
        }
    }

    async onload() {
        console.log('[NostrPlugin] Loading plugin...');
        await this.loadSettings();

        // Initialize core services
        this.eventEmitter = new EventEmitter();
        this.eventService = new EventService();
        this.fileService = new FileService(this.app.vault, this.settings, this.app);
        this.currentFileService = new CurrentFileService(this.app);
        
        // Initialize relay service
        this.relayService = new RelayService(this.settings);
        
        // Initialize profile manager before other services
        this.profileManager = new ProfileManagerService(
            this.settings,
            this.eventEmitter,
            this.fileService
        );

        // Initialize contact graph service
        this.contactGraphService = new ContactGraphService(this.relayService);

        // Initialize fetch service
        this.fetchService = new FetchService(
            this.settings,
            this.relayService,
            this.eventService,
            this.fileService,
            this.app,
            this
        );
        
        // Initialize unified fetch processor
        this.unifiedFetchProcessor = new UnifiedFetchProcessor(
            this.relayService,
            NostrEventBus.getInstance(),
            this.fileService
        );

        // Initialize node fetch handler
        const nodeFetchHandler = new NodeFetchHandler(
            this.eventService,
            this.fetchService.getReferenceStore(),
            this.unifiedFetchProcessor,
            this.app,
            {
                notesPerProfile: this.settings.notesPerProfile,
                batchSize: this.settings.batchSize,
                includeOwnNotes: this.settings.includeOwnNotes,
                hexFetch: {
                    batchSize: this.settings.hexFetch?.batchSize || 50
                },
                threadSettings: {
                    limit: 50,
                    includeContext: true
                }
            }
        );

        // Set node fetch handler in unified processor
        this.unifiedFetchProcessor.setNodeFetchHandler(nodeFetchHandler);

        // Register keyword search handler
        const keywordHandler = new KeywordSearchHandler(
            this.unifiedFetchProcessor,
            this.fileService,
            this.contactGraphService,
            this.settings
        );
        NostrEventBus.getInstance().subscribe(NostrEventType.KEYWORD_SEARCH, keywordHandler);

        // Register hex fetch handler
        const hexHandler = new HexFetchHandler(
            this.unifiedFetchProcessor,
            this.fileService
        );
        NostrEventBus.getInstance().subscribe(NostrEventType.HEX_FETCH, hexHandler);

        // Register thread fetch handler
        const threadHandler = new ThreadFetchHandler(
            this.unifiedFetchProcessor,
            this.fileService
        );
        NostrEventBus.getInstance().subscribe(NostrEventType.THREAD_FETCH, threadHandler);

        // Register node fetch handler with event bus
        NostrEventBus.getInstance().subscribe(NostrEventType.NODE_FETCH, nodeFetchHandler);

        // Register graph menu handler
        this.registerEvent(
            this.app.workspace.on('file-menu', (menu: Menu, file: TAbstractFile) => {
                if (file && file.path.startsWith('nostr/')) {
                    menu.addItem((item: MenuItem) => {
                        item.setTitle('Node based fetch')
                            .setIcon('search')
                            .onClick(async () => {
                                await this.processNodeContent(file.path);
                            });
                    });
                }
            })
        );

        // Add settings tab
        this.addSettingTab(new SettingsTab(this.app, this));

        // Add commands
        this.addCommand({
            id: 'open-fetch-settings',
            name: 'Open Fetch Settings',
            hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'f' }],
            callback: () => {
                new FetchSettingsModal(
                    this.app,
                    this.settings, // Pass entire settings object
                    async (settings) => {
                        // Update settings with spread to maintain all properties
                        this.settings = {
                            ...this.settings,
                            ...settings
                        };
                        await this.saveSettings();
                    },
                    this.fetchService
                ).open();
            }
        });

        this.addCommand({
            id: 'fetch-notes',
            name: 'Fetch Notes',
            callback: async () => {
                if (!ValidationService.validateNpub(this.settings.npub)) {
                    new Notice('Invalid npub format');
                    return;
                }
                await this.fetchService.fetchMainUser();
            }
        });

        this.addCommand({
            id: 'fetch-mentioned-profiles',
            name: 'Fetch Mentioned Profiles',
            callback: async () => {
                const mentions = this.fetchService.getReferenceStore().getAllMentions();
                if (mentions.length === 0) return;
                    
                await this.mentionedProfileFetcher.fetchMentionedProfiles(mentions);
            }
        });

        console.log('[NostrPlugin] Plugin loaded successfully');
    }

    onunload() {
        console.log('[NostrPlugin] Unloading plugin...');
        this.stopAutoUpdate();
        if (this.relayService) this.relayService.disconnect();
        if (this.eventService) this.eventService.clearHandlers();
        if (this.pollService) this.pollService.cleanup();
        console.log('[NostrPlugin] Plugin unloaded');
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);

        // Update services with new settings if they exist
        if (this.relayService) {
            this.relayService.updateSettings(this.settings);
        }

        // Restart auto-update if settings changed
        if (this.settings.autoUpdate) {
            this.startAutoUpdate();
        } else {
            this.stopAutoUpdate();
        }
    }

    private startAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        this.updateInterval = setInterval(
            () => this.fetchService.fetchMainUser(),
            this.settings.updateInterval * 1000
        );
    }

    private stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
}
