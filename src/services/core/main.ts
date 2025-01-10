import { Plugin } from 'obsidian';
import { NostrSettings } from './types';
import { RelayService } from './services/core/relay-service';
import { EventService } from './services/core/event-service';
import { FileService } from './services/core/file-service';
import { FetchService } from './services/fetch/fetch-service';

const DEFAULT_SETTINGS: NostrSettings = {
    npub: '',
    relays: [
        { url: 'wss://relay.damus.io', enabled: true },
        { url: 'wss://nos.lol', enabled: true }
    ],
    notesPerProfile: 5,
    globalLimit: 50,
    profilesDirectory: 'nostr/profiles',
    notesDirectory: 'nostr/notes',
    autoUpdate: false,
    updateInterval: 15,
    includeOwnNotes: false,
    directories: {
        main: 'nostr/profiles/main',
        contacts: 'nostr/profiles/contacts',
        mentions: 'nostr/profiles/mentions',
        cache: 'nostr/profiles/cache'
    }
};

export default class NostrPlugin extends Plugin {
    settings: NostrSettings;
    private relayService: RelayService;
    private eventService: EventService;
    private fileService: FileService;
    private fetchService: FetchService;

    async onload() {
        await this.loadSettings();

        // Initialize services
        this.eventService = new EventService();
        this.relayService = new RelayService(this.settings);
        this.fileService = new FileService(this.app.vault, this.settings);
        this.fetchService = new FetchService(
            this.settings,
            this.relayService,
            this.eventService
        );

        // Setup event handlers
        this.eventService.onNote(async (event) => {
            await this.fileService.saveNote(event);
        });

        this.eventService.onLimitReached((count, limit) => {
            console.log(`Fetch limit reached: ${count}/${limit}`);
        });

        // Ensure directories exist
        await this.fileService.ensureDirectories();

        // Add commands
        this.addCommand({
            id: 'fetch-notes',
            name: 'Fetch Notes',
            callback: async () => {
                if (!this.settings.npub) return;
                await this.relayService.connect();
                await this.fetchService.fetchMainUser();
            }
        });
    }

    async onunload() {
        this.relayService?.disconnect();
        this.eventService?.removeAllListeners();
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}
