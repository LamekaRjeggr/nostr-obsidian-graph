import { Plugin, Notice } from 'obsidian';
import { NostrSettings } from './types';
import { SettingsTab } from './views/settings-tab';
import { RelayService } from './services/core/relay-service';
import { EventService } from './services/core/event-service';
import { FileService } from './services/core/file-service';
import { FetchService } from './services/fetch/fetch-service';
import { ValidationService } from './services/validation-service';
import { EventEmitter } from './services/event-emitter';
import { ProfileManagerService } from './services/profile/profile-manager-service';
import { HexInputModal } from './views/hex-input-modal';

const DEFAULT_SETTINGS: NostrSettings = {
    npub: '',
    relays: [
        { url: 'wss://relay.damus.io', enabled: true },
        { url: 'wss://nos.lol', enabled: true },
        { url: 'wss://relay.nostr.band', enabled: true }
    ],
    notesPerProfile: 50,
    batchSize: 50,        // Default batch size for incremental fetching
    notesDirectory: 'nostr/notes',
    profilesDirectory: 'nostr/profiles',
    autoUpdate: false,
    updateInterval: 300,
    includeOwnNotes: true,
    usePublicKeyAsFilename: false,
    directories: {
        main: 'nostr',
        replies: 'nostr/replies'  // Add default replies directory
    }
};

export default class NostrPlugin extends Plugin {
    settings: NostrSettings;
    private relayService: RelayService;
    private eventService: EventService;
    private fileService: FileService;
    private fetchService: FetchService;
    private eventEmitter: EventEmitter;
    private profileManager: ProfileManagerService;
    private updateInterval: NodeJS.Timeout | null = null;

    async onload() {
        await this.loadSettings();

        // Initialize services
        this.eventEmitter = new EventEmitter();
        this.eventService = new EventService();
        this.relayService = new RelayService(this.settings);
        this.fileService = new FileService(this.app.vault, this.settings);
        this.profileManager = new ProfileManagerService(
            this.settings,
            this.eventEmitter,
            this.fileService
        );
        this.fetchService = new FetchService(
            this.settings,
            this.relayService,
            this.eventService,
            this.fileService
        );

        // Add settings tab
        this.addSettingTab(new SettingsTab(this.app, this));

        // Register event handlers
        this.eventService.onNote(async (event, metadata) => {
            try {
                await this.fileService.saveNote(event, metadata);
            } catch (error) {
                console.error('Error saving note:', error);
            }
        });

        this.eventService.onProfile(async (event) => {
            try {
                if (event.kind === 0) {
                    const metadata = JSON.parse(event.content);
                    await this.profileManager.processProfile(event.pubkey, metadata);
                }
            } catch (error) {
                console.error('Error processing profile:', error);
            }
        });

        // Add commands
        this.addCommand({
            id: 'fetch-notes',
            name: 'Fetch Notes',
            callback: async () => {
                if (!ValidationService.validateNpub(this.settings.npub)) {
                    return;
                }
                await this.fetchService.fetchMainUser();
            }
        });

        this.addCommand({
            id: 'fetch-hex-notes',
            name: 'Fetch Notes by Hex Key',
            callback: () => {
                new HexInputModal(this.app, async (hex) => {
                    try {
                        await this.fetchService.fetchByHex(hex);
                    } catch (error) {
                        new Notice(`Error fetching notes: ${error.message}`);
                    }
                }).open();
            }
        });

        this.addCommand({
            id: 'clear-notes',
            name: 'Clear Notes',
            callback: () => {
                this.fetchService.reset();
                this.profileManager.clear();
            }
        });

        // Setup auto-update if enabled
        if (this.settings.autoUpdate) {
            this.startAutoUpdate();
        }
    }

    onunload() {
        this.stopAutoUpdate();
        this.relayService.disconnect();
        this.eventService.clearHandlers();
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);

        // Update services with new settings
        this.relayService.updateSettings(this.settings);

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
