import { Plugin, Notice, App, Menu, MenuItem, TAbstractFile } from 'obsidian';
import { NostrEvent } from './types';
import { EventKinds } from './services/core/base-event-handler';
import { NodeFetchHandler } from './services/fetch/handlers/node-fetch-handler';
import { NostrSettings } from './types';
import { SettingsTab } from './views/settings-tab';
import { RelayService } from './services/core/relay-service';
import { EventService } from './services/core/event-service';
import { FileService } from './services/core/file-service';
import { UnifiedFetchService } from './services/fetch/unified-fetch-service';
import { ValidationService } from './services/validation-service';
import { KeyService } from './services/core/key-service';
import { EventEmitter } from './services/event-emitter';
import { ProfileManagerService } from './services/profile/profile-manager-service';
import { UnifiedFetchModal } from './views/modals/unified-fetch-modal';
import { HexFetchModal } from './views/modals/hex-fetch-modal';
import { UnifiedFetchSettings, DEFAULT_UNIFIED_SETTINGS, migrateSettings } from './views/modals/unified-settings';
import { MentionedProfileFetcher } from './services/fetch/mentioned-profile-fetcher';
import { MentionedNoteFetcher } from './services/fetch/mentioned-note-fetcher';
import { CurrentFileService } from './services/core/current-file-service';
import { EnhancedNoteCacheManager } from './services/file/cache/enhanced-note-cache-manager';
import { PollService } from './experimental/polls/poll-service';
import { UnifiedFetchProcessor } from './services/fetch/unified-fetch-processor';
import { KeywordSearchHandler } from './services/fetch/handlers/keyword-search-handler';
import { HexFetchHandler } from './services/fetch/handlers/hex-fetch-handler';
import { ThreadFetchHandler } from './services/fetch/handlers/thread-fetch-handler';
import { NostrEventBus } from './experimental/event-bus/event-bus';
import { NostrEventType, NostrErrorEvent } from './experimental/event-bus/types';
import { ContactGraphService } from './services/contacts/contact-graph-service';
import { ReferenceProcessor } from './services/processors/reference-processor';
import { NoteEventHandler } from './services/fetch/handlers/note-handler';
import { ReactionProcessor } from './services/processors/reaction-processor';
import { ThreadFetchService } from './services/fetch/thread-fetch-service';

const DEFAULT_PLUGIN_SETTINGS: NostrSettings = {
    npub: '',
    relays: [
        { url: 'wss://relay.damus.io', enabled: true },
        { url: 'wss://nos.lol', enabled: true },
        { url: 'wss://relay.nostr.band', enabled: true }
    ],
    autoUpdate: false,
    updateInterval: 300,
    usePublicKeyAsFilename: false,
    notesPerProfile: 50,  // Default from UnifiedFetchSettings
    batchSize: 50,       // Default from UnifiedFetchSettings
    includeOwnNotes: true, // Default from UnifiedFetchSettings
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
    },
    cache: {
        maxSize: 10000,         // Default max cache entries
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        enabled: true,          // Enable cache by default
        persistToDisk: true     // Enable cache persistence by default
    }
};

export default class NostrPlugin extends Plugin {
    settings: NostrSettings;
    relayService: RelayService;
    eventService: EventService;
    fileService: FileService;
    unifiedFetchService: UnifiedFetchService;
    eventEmitter: EventEmitter;
    profileManager: ProfileManagerService;
    mentionedProfileFetcher: MentionedProfileFetcher;
    currentFileService: CurrentFileService;
    reactionProcessor: ReactionProcessor;
    noteCacheManager: EnhancedNoteCacheManager;
    pollService: PollService | null;
    unifiedFetchProcessor: UnifiedFetchProcessor;
    contactGraphService: ContactGraphService;
    private updateInterval: NodeJS.Timeout | null = null;
    threadFetchService: ThreadFetchService;

    private async processNodeContent(filePath: string): Promise<void> {
        try {
            // Get metadata from file
            const metadata = await this.fileService.getNostrMetadata(filePath);
            if (!metadata) {
                throw new Error('No nostr metadata found');
            }

            // Use the same methods as thread fetch commands
            if (metadata.kind === EventKinds.METADATA) {
                // For profiles, use ThreadFetchService's author threads method
                await this.threadFetchService.fetchAuthorThreads(
                    metadata.pubkey,
                    this.settings.hexFetch?.batchSize || 50
                );
            } else {
                // For notes, use ThreadFetchService's single thread method
                await this.threadFetchService.fetchSingleThread(
                    metadata.id,
                    this.settings.threadSettings?.limit || 50,
                    this.settings.threadSettings?.includeContext || true
                );
            }
            
            new Notice('Content fetched successfully');
        } catch (error) {
            console.error('Error fetching node content:', error);
            new Notice(`Error: ${error.message}`);
            
            // Publish error event
            await NostrEventBus.getInstance().publish(NostrEventType.ERROR, {
                message: error.message,
                context: 'processNodeContent',
                details: error
            } as NostrErrorEvent);
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

        // Initialize cache manager
        this.noteCacheManager = new EnhancedNoteCacheManager(
            this,
            this.settings.cache?.maxSize || 10000,
            this.settings.cache?.maxAge || 24 * 60 * 60 * 1000
        );

        // Initialize unified fetch service and processor
        this.unifiedFetchService = new UnifiedFetchService(
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
            this.fileService,
            this.app,
            this.eventService
        );

        // Create reference processor
        const referenceProcessor = new ReferenceProcessor(this.app, this.app.metadataCache);

        // Initialize thread fetch service
        this.threadFetchService = new ThreadFetchService(
            this.unifiedFetchProcessor,
            this.fileService,
            referenceProcessor,
            this.app,
            {
                thread: {
                    limit: this.settings.threadSettings?.limit || 50,
                    includeContext: this.settings.threadSettings?.includeContext || true
                }
            }
        );

        // Initialize reaction processor
        this.reactionProcessor = new ReactionProcessor(
            this.eventService,
            this.app,
            this.fileService
        );

        // Initialize poll service
        if (this.settings.polls?.enabled) {
            this.pollService = new PollService(
                this.app,
                this.settings,
                this.eventEmitter,
                this.fileService,
                this.relayService
            );
            await this.pollService.initialize();
            console.log('[NostrPlugin] Poll service initialized');
        } else {
            console.log('[NostrPlugin] Poll service disabled in settings');
        }

        // Initialize mentioned note fetcher for profile handling
        const mentionedNoteFetcher = new MentionedNoteFetcher(
            this.relayService,
            this.app,
            this.settings,
            this.fileService
        );

        // Register profile handler
        this.eventService.onProfile(async (event) => {
            try {
                if (event.kind === 0) {
                    const metadata = JSON.parse(event.content);
                    await this.profileManager.processProfile(event.pubkey, metadata);
                }
            } catch (error) {
                console.error('[NostrPlugin] Error processing profile:', error);
            }
        });

        // Register reaction processor with event bus
        NostrEventBus.getInstance().subscribe(NostrEventType.REACTION, this.reactionProcessor);
        NostrEventBus.getInstance().subscribe(NostrEventType.ZAP, this.reactionProcessor);

        // Initialize node fetch handler with plugin settings
        const nodeFetchHandler = new NodeFetchHandler(
            this.eventService,
            this.unifiedFetchProcessor.getReferenceProcessor(),
            this.unifiedFetchProcessor,
            this.app,
            this.settings // Pass the full plugin settings
        );

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
            id: 'open-hex-fetch',
            name: 'Fetch Notes by Hex Key',
            callback: () => {
                new HexFetchModal(
                    this.app,
                    this.unifiedFetchProcessor,
                    this.fileService,
                    this.currentFileService
                ).open();
            }
        });

        this.addCommand({
            id: 'open-fetch-settings',
            name: 'Open Fetch Settings',
            hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'f' }],
            callback: () => {
                // Convert legacy settings to unified format
                const unifiedSettings = migrateSettings({
                    notesPerProfile: this.settings.notesPerProfile,
                    batchSize: this.settings.batchSize,
                    includeOwnNotes: this.settings.includeOwnNotes,
                    hexFetch: this.settings.hexFetch,
                    threadSettings: this.settings.threadSettings
                });

                new UnifiedFetchModal(
                    this.app,
                    unifiedSettings,
                    async (settings) => {
                        // Extract thread settings with defaults
                        const threadSettings = {
                            limit: settings.thread?.limit ?? DEFAULT_PLUGIN_SETTINGS.threadSettings!.limit,
                            includeContext: settings.thread?.includeContext ?? DEFAULT_PLUGIN_SETTINGS.threadSettings!.includeContext
                        };

                        // Create unified settings with complete thread object
                        const unifiedThreadSettings = {
                            ...DEFAULT_UNIFIED_SETTINGS.thread!,
                            ...threadSettings
                        };
                        
                        // Update plugin settings
                        this.settings = {
                            ...this.settings,
                            notesPerProfile: settings.notesPerProfile,
                            batchSize: settings.batchSize,
                            includeOwnNotes: settings.includeOwnNotes,
                            hexFetch: settings.hexFetch,
                            threadSettings
                        };
                        await this.saveSettings();

                        // Update thread fetch service with complete settings
                        this.threadFetchService.updateSettings({
                            ...settings,
                            thread: unifiedThreadSettings
                        });
                    },
                    this.unifiedFetchProcessor
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
                const pubkey = KeyService.npubToHex(this.settings.npub);
                if (!pubkey) {
                    new Notice('Failed to decode npub');
                    return;
                }
                await this.unifiedFetchService.fetchMainUser();
            }
        });

        this.addCommand({
            id: 'fetch-mentioned-profiles',
            name: 'Fetch Mentioned Profiles',
            callback: async () => {
                await mentionedNoteFetcher.fetchMentionedProfiles();
            }
        });

        // Add thread fetch commands
        this.addCommand({
            id: 'fetch-thread',
            name: 'Fetch Thread for Current Note',
            checkCallback: (checking: boolean) => {
                const file = this.app.workspace.getActiveFile();
                if (!file || !file.path.startsWith('nostr/')) {
                    return false;
                }
                
                if (!checking) {
                    this.fileService.getNostrMetadata(file.path).then(metadata => {
                        if (metadata?.id) {
                            this.threadFetchService.fetchSingleThread(metadata.id);
                        } else {
                            new Notice('No nostr event ID found in file metadata');
                        }
                    });
                }
                
                return true;
            }
        });

        this.addCommand({
            id: 'fetch-author-threads',
            name: 'Fetch All Threads for Current Profile',
            checkCallback: (checking: boolean) => {
                const file = this.app.workspace.getActiveFile();
                if (!file || !file.path.startsWith('nostr/profiles')) {
                    return false;
                }
                
                if (!checking) {
                    this.fileService.getNostrMetadata(file.path).then(metadata => {
                        if (metadata?.id) {
                            this.threadFetchService.fetchAuthorThreads(metadata.id);
                        } else {
                            new Notice('No nostr pubkey found in profile metadata');
                        }
                    });
                }
                
                return true;
            }
        });

        // Add vault-wide thread fetch command
        this.addCommand({
            id: 'fetch-vault-threads',
            name: 'Fetch All Threads in Vault',
            callback: async () => {
                const proceed = confirm('This will fetch threads for all notes in the vault. Continue?');
                if (proceed) {
                    await this.threadFetchService.fetchVaultThreads(
                        this.settings.batchSize
                    );
                }
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
        this.settings = Object.assign({}, DEFAULT_PLUGIN_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);

        // Update services with new settings if they exist
        if (this.relayService) {
            this.relayService.updateSettings(this.settings);
        }

        // Update cache settings if they exist
        if (this.noteCacheManager && this.settings.cache) {
            if (this.settings.cache.maxSize) {
                this.noteCacheManager.setMaxSize(this.settings.cache.maxSize);
            }
            if (this.settings.cache.maxAge) {
                this.noteCacheManager.setMaxAge(this.settings.cache.maxAge);
            }
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
            async () => {
                const pubkey = KeyService.npubToHex(this.settings.npub);
                if (!pubkey) {
                    new Notice('Failed to decode npub');
                    return;
                }
                await this.unifiedFetchService.fetchMainUser();
            },
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
