import { NostrSettings } from '../../types';
import { RelayService } from '../core/relay-service';
import { EventService } from '../core/event-service';
import { FileService } from '../core/file-service';
import { EventStreamHandler } from '../core/event-stream-handler';
import { EventKinds } from '../core/base-event-handler';
import { TemporalEventStore } from '../temporal-event-store';
import { ProfileEventHandler } from './handlers/profile-handler';
import { NoteEventHandler } from './handlers/note-handler';
import { ContactEventHandler } from './handlers/contact-handler';
import { BatchProcessor } from './processors/batch-processor';
import { ReferenceStore } from '../references/reference-store';
import { ReactionProcessor } from '../reactions/reaction-processor';
import { Filter } from 'nostr-tools';
import { App, Notice } from 'obsidian';
import { NoteCacheManager } from '../file/cache/note-cache-manager';

export class FetchProcessor {
    private streamHandler: EventStreamHandler;
    private settings: NostrSettings;
    private contactHandler: ContactEventHandler;
    private temporalStore: TemporalEventStore;
    private batchProcessor: BatchProcessor;
    private referenceStore: ReferenceStore;
    private reactionProcessor: ReactionProcessor;
    private noteCacheManager: NoteCacheManager;

    constructor(
        settings: NostrSettings,
        private relayService: RelayService,
        private eventService: EventService,
        private fileService: FileService,
        private app: App
    ) {
        this.settings = settings;
        this.streamHandler = new EventStreamHandler();
        this.temporalStore = new TemporalEventStore();
        this.referenceStore = new ReferenceStore();
        this.noteCacheManager = new NoteCacheManager();
        
        // Initialize handlers
        this.contactHandler = new ContactEventHandler(eventService);
        this.reactionProcessor = new ReactionProcessor(eventService, app, settings, this.noteCacheManager);
        
        // Register handlers
        this.streamHandler.registerHandler(this.contactHandler);
        this.streamHandler.registerHandler(new ProfileEventHandler(eventService, fileService));
        this.streamHandler.registerHandler(new NoteEventHandler(
            eventService,
            this.temporalStore,
            this.referenceStore,
            this.reactionProcessor,
            this.noteCacheManager,
            this.app
        ));
        this.streamHandler.registerHandler(this.reactionProcessor);

        // Initialize batch processor
        this.batchProcessor = new BatchProcessor(
            settings,
            relayService,
            this.streamHandler,
            this.temporalStore
        );
    }

    getReferenceStore(): ReferenceStore {
        return this.referenceStore;
    }

    async processMainUser(hex: string, currentCount: number, includeContacts: boolean = true): Promise<number> {
        if (!this.relayService.isConnected()) {
            new Notice('No relay connection available');
            return currentCount;
        }

        // Get contact list only if includeContacts is true
        let contacts: string[] = [];
        if (includeContacts) {
            new Notice('Fetching contacts...');
            const contactFilter: Partial<Filter> = {
                authors: [hex],
                kinds: [EventKinds.CONTACT],
                since: 0  // Get all historical contact events
            };

            try {
                const contactEvents = await this.relayService.subscribe([contactFilter]);
                for (const event of contactEvents) {
                    await this.streamHandler.handleEvent(event);
                }
                contacts = this.contactHandler.getContacts();
                if (contacts.length > 0) {
                    new Notice(`Found ${contacts.length} contacts`);
                }
            } catch (error) {
                console.error('Error fetching contacts:', error);
                new Notice('Error fetching contacts');
            }
        }

        // Use only hex or include contacts based on flag
        const authors = includeContacts ? [hex, ...contacts] : [hex];
        
        // First get all profiles without limit
        new Notice('Fetching profiles...');
        const profileFilter: Partial<Filter> = {
            authors: authors,
            kinds: [EventKinds.METADATA]
        };

        try {
            const profileEvents = await this.relayService.subscribe([profileFilter]);
            if (profileEvents.length > 0) {
                new Notice(`Found ${profileEvents.length} profiles`);
            }
            for (const event of profileEvents) {
                await this.streamHandler.handleEvent(event);
            }
        } catch (error) {
            console.error('Error fetching profiles:', error);
            new Notice('Error fetching profiles');
        }

        // Process notes in batches with weighted distribution
        const count = await this.batchProcessor.processBatch(authors, currentCount);

        this.streamHandler.handleEOSE();
        return count;
    }

    async processFollows(pubkeys: string[], currentCount: number): Promise<number> {
        if (pubkeys.length === 0) return currentCount;

        if (!this.relayService.isConnected()) {
            new Notice('No relay connection available');
            return currentCount;
        }

        // Get profiles without limit
        new Notice('Fetching profiles...');
        const profileFilter: Partial<Filter> = {
            authors: pubkeys,
            kinds: [EventKinds.METADATA]
        };

        try {
            const profileEvents = await this.relayService.subscribe([profileFilter]);
            if (profileEvents.length > 0) {
                new Notice(`Found ${profileEvents.length} profiles`);
            }
            for (const event of profileEvents) {
                await this.streamHandler.handleEvent(event);
            }
        } catch (error) {
            console.error('Error fetching profiles:', error);
            new Notice('Error fetching profiles');
        }

        // Process notes in batches with weighted distribution
        const count = await this.batchProcessor.processBatch(pubkeys, currentCount);

        this.streamHandler.handleEOSE();
        return count;
    }

    clearChain(): void {
        this.streamHandler.reset();
        this.temporalStore.resetStore();
        this.referenceStore.clear();
        this.noteCacheManager.clear();
    }
}
