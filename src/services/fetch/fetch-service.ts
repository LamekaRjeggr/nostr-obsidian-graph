import { NostrSettings } from '../../types';
import { RelayService } from '../core/relay-service';
import { EventService } from '../core/event-service';
import { FileService } from '../core/file-service';
import { FetchProcessor } from './fetch-processor';
import { ValidationService } from '../validation-service';
import { ReferenceProcessor } from '../processors/reference-processor';
import { App, Notice } from 'obsidian';
import { KeyService } from '../core/key-service';
import { EventEmitter } from '../event-emitter';
import { ProfileManagerService } from '../profile/profile-manager-service';
import { MentionedProfileFetcher } from './mentioned-profile-fetcher';
import { ReactionProcessor } from '../reactions/reaction-processor';
import { NoteCacheManager } from '../file/cache/note-cache-manager';
import { PollService } from '../../experimental/polls/poll-service';
import NostrPlugin from '../../main';

export class FetchService {
    private processor: FetchProcessor;
    private currentCount: number = 0;
    private initialized = false;

    constructor(
        private settings: NostrSettings,
        private relayService: RelayService,
        private eventService: EventService,
        private fileService: FileService,
        private app: App,
        private plugin: NostrPlugin
    ) {
        this.processor = new FetchProcessor(settings, relayService, eventService, fileService, app);
    }

    getReferenceStore(): ReferenceProcessor {
        return this.processor.getReferenceStore();
    }

    private async initialize() {
        if (this.initialized) return;

        new Notice('Initializing services...');

        // Initialize core services
        this.plugin.eventEmitter = new EventEmitter();
        this.plugin.eventService = new EventService();
        this.plugin.noteCacheManager = new NoteCacheManager();

        // Initialize relay service
        this.plugin.relayService = new RelayService(this.plugin.settings);
        await this.plugin.relayService.initialize();

        // Update service references
        this.relayService = this.plugin.relayService;
        this.eventService = this.plugin.eventService;

        // Initialize dependent services
        this.plugin.profileManager = new ProfileManagerService(
            this.plugin.settings,
            this.plugin.eventEmitter,
            this.plugin.fileService
        );

        this.plugin.mentionedProfileFetcher = new MentionedProfileFetcher(
            this.plugin.relayService,
            this.plugin.eventService,
            this.plugin.profileManager,
            this.plugin.fileService
        );

        this.plugin.reactionProcessor = new ReactionProcessor(
            this.plugin.eventService,
            this.plugin.app,
            this.plugin.settings,
            this.plugin.noteCacheManager
        );

        // Initialize poll service if enabled
        if (this.plugin.settings.polls.enabled) {
            this.plugin.pollService = new PollService(
                this.plugin.app,
                this.plugin.settings,
                this.plugin.eventEmitter,
                this.plugin.fileService,
                this.plugin.relayService
            );
            await this.plugin.pollService.initialize();
        }

        // Register event handlers
        this.plugin.eventService.onNote(async (event, metadata) => {
            try {
                await this.plugin.fileService.saveNote(event, metadata);
                await this.plugin.reactionProcessor.processPendingReactions(event.id);
            } catch (error) {
                console.error('[NostrPlugin] Error saving note:', error);
            }
        });

        this.plugin.eventService.onProfile(async (event) => {
            try {
                if (event.kind === 0) {
                    const metadata = JSON.parse(event.content);
                    await this.plugin.profileManager.processProfile(event.pubkey, metadata);
                }
            } catch (error) {
                console.error('[NostrPlugin] Error processing profile:', error);
            }
        });

        this.plugin.eventService.onReaction(async (event) => {
            try {
                await this.plugin.reactionProcessor.process(event);
            } catch (error) {
                console.error('[NostrPlugin] Error processing reaction:', error);
            }
        });

        this.plugin.eventService.onZap(async (event) => {
            try {
                await this.plugin.reactionProcessor.process(event);
            } catch (error) {
                console.error('[NostrPlugin] Error processing zap:', error);
            }
        });

        // Update processor with new services
        this.processor = new FetchProcessor(
            this.plugin.settings,
            this.plugin.relayService,
            this.plugin.eventService,
            this.plugin.fileService,
            this.plugin.app
        );

        this.initialized = true;
        new Notice('Services initialized');
    }

    async fetchMainUser(): Promise<void> {
        if (!ValidationService.validateNpub(this.settings.npub)) {
            new Notice('Invalid npub format');
            return;
        }

        const hex = KeyService.npubToHex(this.settings.npub);
        if (!hex) {
            new Notice('Failed to decode npub');
            return;
        }

        // Initialize services if needed
        if (!this.initialized) {
            await this.initialize();
        }

        new Notice('Fetching notes and reactions...');
        
        try {
            const includeContacts = true;
            this.currentCount = await this.processor.processMainUser(hex, this.currentCount, includeContacts);
            new Notice('Fetch completed successfully');
        } catch (error) {
            console.error('Error fetching data:', error);
            new Notice('Error fetching data');
        }
    }

    reset(): void {
        this.currentCount = 0;
        this.processor.clearChain();
    }

    async processFollows(pubkeys: string[], currentCount: number): Promise<void> {
        // Initialize services if needed
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            this.currentCount = await this.processor.processFollows(pubkeys, currentCount);
        } catch (error) {
            console.error('Error processing follows:', error);
            new Notice('Error processing follows');
        }
    }
}
