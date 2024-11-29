import { Notice, Plugin } from 'obsidian';
import { NostrSettings, RelayConnection } from './types';
import { NostrService } from './core/nostr-service';
import { FileService } from './services/file-service';
import { NostrSettingTab } from './views/settings-tab';
import { EventEmitter } from './services/event-emitter';
import { NostrUtils } from './utils/nostr-utils';
import { nip19 } from 'nostr-tools';

const DEFAULT_SETTINGS: NostrSettings = {
    npub: '',
    relays: [
        { url: 'wss://relay.damus.io', enabled: true },
        { url: 'wss://relay.nostr.band', enabled: true },
        { url: 'wss://nos.lol', enabled: true }
    ],
    notesPerProfile: 5,
    profilesDirectory: 'nostr/profiles',
    notesDirectory: 'nostr/notes',
    autoUpdate: false,  // Auto-update disabled by default
    updateInterval: 15,  // Default update interval of 15 minutes
    includeOwnNotes: false  // Exclude central user's notes by default
};

export default class NostrObsidianGraphPlugin extends Plugin {
    settings: NostrSettings;
    nostrService: NostrService;
    fileService: FileService;
    eventEmitter: EventEmitter;
    private updateTimer: NodeJS.Timeout | null = null;

    async onload() {
        console.log('Loading Nostr Graph plugin...');
        
        await this.loadSettings();
        
        // Initialize event emitter
        this.eventEmitter = new EventEmitter();
        
        // Initialize Nostr service
        this.nostrService = new NostrService(this.settings, this.eventEmitter);
        
        // Initialize file service
        this.fileService = new FileService(
            this.app.vault,
            this.nostrService,
            this.settings.profilesDirectory,
            this.settings.notesDirectory
        );

        // Initialize file structure
        try {
            await this.fileService.initialize();
            console.log('File service initialized');
        } catch (error) {
            console.error('Failed to initialize file service:', error);
            new Notice('Failed to initialize file service');
        }

        // Add settings tab
        this.addSettingTab(new NostrSettingTab(this.app, this));

        // Register event handlers
        this.registerEventHandlers();

        // Add commands
        this.addCommands();

        // Initialize Nostr connection if settings are configured
        if (this.settings.npub && this.settings.relays.length > 0) {
            this.initializeNostrConnection();
            
            // Start auto-update if enabled
            if (this.settings.autoUpdate) {
                this.startAutoUpdate();
            }
        }

        console.log('Nostr Graph plugin loaded!');
    }

    onunload() {
        console.log('Unloading Nostr Graph plugin...');
        if (this.nostrService) {
            this.nostrService.disconnect();
        }
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
    }

    private startAutoUpdate() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
        }
        
        // Convert minutes to milliseconds
        const interval = this.settings.updateInterval * 60 * 1000;
        
        this.updateTimer = setInterval(async () => {
            try {
                const decoded = nip19.decode(this.settings.npub);
                if (decoded.type === 'npub') {
                    const pubkey = decoded.data as string;
                    await this.nostrService.processAndSaveFollowedNotes(pubkey);
                }
            } catch (error) {
                console.error('Auto-update failed:', error);
            }
        }, interval);
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        // Ensure relays are properly formatted as RelayConnection objects
        this.settings.relays = this.settings.relays.map(relay => 
            typeof relay === 'string' ? { url: relay, enabled: true } : relay
        );
    }

    async saveSettings() {
        await this.saveData(this.settings);
        
        // Update auto-update timer if needed
        if (this.settings.autoUpdate) {
            this.startAutoUpdate();
        } else if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
    }

    private async initializeNostrConnection() {
        try {
            await this.nostrService.initialize();
            const connectedRelays = this.nostrService.getConnectedRelays();
            if (connectedRelays.length > 0) {
                new Notice(`Connected to ${connectedRelays.length} relay(s)`);
            } else {
                new Notice('Failed to connect to any relays');
            }
        } catch (error) {
            console.error('Failed to initialize Nostr connection:', error);
            new Notice('Failed to initialize Nostr connection');
        }
    }

    private registerEventHandlers() {
        // Handle note processing events
        this.eventEmitter.on('note-processed', async (noteData) => {
            try {
                // Skip notes from central user if includeOwnNotes is false
                if (!this.settings.includeOwnNotes) {
                    const decoded = nip19.decode(this.settings.npub);
                    if (decoded.type === 'npub' && noteData.pubkey === decoded.data) {
                        console.log('Skipping own note:', noteData.id);
                        return;
                    }
                }

                await this.fileService.createOrUpdateNoteFile(noteData);
                console.log('Note processed:', noteData.id);
            } catch (error) {
                console.error('Error creating note file:', error);
                new Notice('Error creating note file');
            }
        });

        // Handle profile processing events
        this.eventEmitter.on('profile-processed', async (profileData) => {
            try {
                await this.fileService.createOrUpdateProfileFile(profileData);
                console.log('Profile processed:', profileData.pubkey);
            } catch (error) {
                console.error('Error creating profile file:', error);
                new Notice('Error creating profile file');
            }
        });

        // Handle like processing events
        this.eventEmitter.on('like-processed', async (likeData) => {
            try {
                await this.fileService.addLike(
                    likeData.noteId,
                    likeData.pubkey,
                    likeData.created_at
                );
                console.log('Like processed:', {
                    noteId: likeData.noteId,
                    liker: likeData.pubkey
                });
            } catch (error) {
                console.error('Error processing like:', error);
                new Notice('Error processing like');
            }
        });

        // Handle notes update events
        this.eventEmitter.on('notes-updated', (data) => {
            new Notice(`Processed ${data.count} notes from followed profiles`);
        });
    }

    private addCommands() {
        // Add command to diagnose connection
        this.addCommand({
            id: 'diagnose-nostr',
            name: 'Diagnose Nostr Connection',
            callback: async () => {
                if (!this.settings.npub) {
                    new Notice('Please set your npub in settings first');
                    return;
                }

                const validation = NostrUtils.validateNpub(this.settings.npub);
                if (!validation.isValid) {
                    new Notice(`Invalid npub: ${validation.error}`);
                    return;
                }

                if (this.settings.relays.length === 0) {
                    new Notice('Please add at least one relay in settings');
                    return;
                }

                new Notice('Running diagnostics...');
                
                try {
                    // Test relay connections
                    await this.nostrService.initialize();
                    const connectedRelays = this.nostrService.getConnectedRelays();
                    if (connectedRelays.length > 0) {
                        new Notice(`Connected to ${connectedRelays.length} relay(s)`);
                    } else {
                        const status = this.nostrService.getConnectionStatus();
                        const errors = status
                            .filter((conn: RelayConnection) => conn.status === 'error')
                            .map((conn: RelayConnection) => `${conn.url}: ${conn.error || 'Unknown error'}`);
                        new Notice(`Failed to connect to any relays.\nErrors:\n${errors.join('\n')}`);
                    }

                    // Log environment info
                    console.log('Environment:', {
                        platform: process.platform,
                        arch: process.arch,
                        nodeVersion: process.version,
                        isSecureContext: typeof window !== 'undefined' && window.isSecureContext,
                        protocol: typeof window !== 'undefined' ? window.location.protocol : 'unknown'
                    });

                    // Log settings
                    console.log('Settings:', {
                        npub: this.settings.npub,
                        relayCount: this.settings.relays.length,
                        relays: this.settings.relays,
                        notesPerProfile: this.settings.notesPerProfile,
                        autoUpdate: this.settings.autoUpdate,
                        updateInterval: this.settings.updateInterval,
                        includeOwnNotes: this.settings.includeOwnNotes
                    });

                    // Validate relay URLs
                    const urlValidation = NostrUtils.validateRelayUrls(this.settings.relays.map(r => r.url));
                    console.log('Relay URL validation:', urlValidation);

                    new Notice('Basic diagnostics complete. Check console for details.');

                } catch (error) {
                    console.error('Diagnostic test failed:', error);
                    new Notice(`Diagnostic test failed: ${error.message}`);
                }
            }
        });

        // Add command to fetch all notes
        this.addCommand({
            id: 'fetch-all-notes',
            name: 'Fetch All Notes',
            callback: async () => {
                if (!this.settings.npub) {
                    new Notice('Please set your npub in settings first');
                    return;
                }

                const validation = NostrUtils.validateNpub(this.settings.npub);
                if (!validation.isValid) {
                    new Notice(`Invalid npub: ${validation.error}`);
                    return;
                }

                if (this.settings.relays.length === 0) {
                    new Notice('Please add at least one relay in settings');
                    return;
                }

                new Notice('Fetching notes...');
                
                try {
                    // Ensure connection
                    await this.initializeNostrConnection();
                    
                    // Convert npub to hex pubkey
                    const decoded = nip19.decode(this.settings.npub);
                    if (decoded.type !== 'npub') {
                        throw new Error('Invalid npub format');
                    }

                    const pubkey = decoded.data as string;
                    console.log('Using pubkey:', pubkey);
                    
                    // Fetch own notes if enabled
                    if (this.settings.includeOwnNotes) {
                        this.nostrService.subscribe({
                            filters: [{
                                authors: [pubkey],
                                kinds: [1],
                                limit: this.settings.notesPerProfile
                            }]
                        });
                    }
                    
                    // Fetch and process notes from followed profiles
                    await this.nostrService.processAndSaveFollowedNotes(pubkey);
                    
                    new Notice('Note fetching complete');
                } catch (error) {
                    console.error('Failed to fetch notes:', error);
                    new Notice('Failed to fetch notes');
                }
            }
        });
    }
}
