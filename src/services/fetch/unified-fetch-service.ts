import { NostrSettings } from '../../types';
import { RelayService } from '../core/relay-service';
import { EventService } from '../core/event-service';
import { FileService } from '../core/file-service';
import { ValidationService } from '../validation-service';
import { App, Notice } from 'obsidian';
import { KeyService } from '../core/key-service';
import { EventEmitter } from '../event-emitter';
import { ProfileManagerService } from '../profile/profile-manager-service';
import { MentionedProfileFetcher } from './mentioned-profile-fetcher';
import { ReactionProcessor } from '../processors/reaction-processor';
import { NoteCacheManager } from '../file/cache/note-cache-manager';
import { PollService } from '../../experimental/polls/poll-service';
import NostrPlugin from '../../main';
import { UnifiedFetchProcessor } from './unified-fetch-processor';
import { EventKinds } from '../core/base-event-handler';
import { NostrEventBus } from '../../experimental/event-bus/event-bus';

export class UnifiedFetchService {
    private processor: UnifiedFetchProcessor;
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
        const eventBus = NostrEventBus.getInstance({ enableLogging: true });
        this.processor = new UnifiedFetchProcessor(relayService, eventBus, fileService, app, eventService);
    }

    private async initialize() {
        if (this.initialized) return;

        new Notice('Initializing services...');

        // Initialize core services
        this.plugin.eventEmitter = new EventEmitter();
        this.plugin.noteCacheManager = this.plugin.noteCacheManager || new NoteCacheManager();

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
            this.plugin.fileService,
            this.plugin.app,
            this.processor
        );

        this.plugin.reactionProcessor = new ReactionProcessor(
            this.plugin.eventService,
            this.plugin.app,
            this.plugin.fileService
        );

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

        // Register note handler
        this.eventService.onNote(async (event, metadata) => {
            try {
                await this.plugin.fileService.saveNote(event, metadata);
                await this.plugin.reactionProcessor.processPendingReactions(event.id);
            } catch (error) {
                console.error('[NostrPlugin] Error saving note:', error);
            }
        });

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
            await this.processor.fetchWithOptions({
                kinds: [EventKinds.NOTE],
                author: hex,
                limit: this.currentCount,
                contacts: {
                    include: true,
                    fetchProfiles: true,
                    linkInGraph: true
                },
                useStream: true,
                enhanced: {
                    titles: true,
                    reactions: true
                }
            });
            new Notice('Fetch completed successfully');
        } catch (error) {
            console.error('Error fetching data:', error);
            new Notice('Error fetching data');
        }
    }

    async processFollows(pubkeys: string[], currentCount: number): Promise<void> {
        // Initialize services if needed
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            await this.processor.fetchWithOptions({
                kinds: [EventKinds.METADATA, EventKinds.NOTE],
                authors: pubkeys,
                limit: currentCount,
                useStream: true,
                enhanced: {
                    titles: true,
                    reactions: true
                }
            });
        } catch (error) {
            console.error('Error processing follows:', error);
            new Notice('Error processing follows');
        }
    }

    reset(): void {
        this.currentCount = 0;
        this.processor.reset();
    }
}
