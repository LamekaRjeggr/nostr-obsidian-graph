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
import { type Filter } from 'nostr-tools';

export class FetchProcessor {
    private streamHandler: EventStreamHandler;
    private settings: NostrSettings;
    private contactHandler: ContactEventHandler;
    private temporalStore: TemporalEventStore;
    private batchProcessor: BatchProcessor;

    constructor(
        settings: NostrSettings,
        private relayService: RelayService,
        private eventService: EventService,
        private fileService: FileService
    ) {
        this.settings = settings;
        this.streamHandler = new EventStreamHandler();
        this.temporalStore = new TemporalEventStore();
        
        // Initialize handlers
        this.contactHandler = new ContactEventHandler(eventService);
        
        // Register handlers
        this.streamHandler.registerHandler(this.contactHandler);
        this.streamHandler.registerHandler(new ProfileEventHandler(eventService, fileService));
        this.streamHandler.registerHandler(new NoteEventHandler(eventService, this.temporalStore));

        // Initialize batch processor
        this.batchProcessor = new BatchProcessor(
            settings,
            relayService,
            this.streamHandler,
            this.temporalStore
        );
    }

    async processMainUser(hex: string, currentCount: number, includeContacts: boolean = true): Promise<number> {
        // Get contact list only if includeContacts is true
        let contacts: string[] = [];
        if (includeContacts) {
            const contactFilter: Filter = {
                authors: [hex],
                kinds: [EventKinds.CONTACT],
                since: 0  // Get all historical contact events
            };

            const contactEvents = await this.relayService.subscribe([contactFilter]);
            for (const event of contactEvents) {
                await this.streamHandler.handleEvent(event);
            }
            contacts = this.contactHandler.getContacts();
        }

        // Use only hex or include contacts based on flag
        const authors = includeContacts ? [hex, ...contacts] : [hex];
        
        // First get all profiles without limit
        const profileFilter: Filter = {
            authors: authors,
            kinds: [EventKinds.METADATA]
        };

        const profileEvents = await this.relayService.subscribe([profileFilter]);
        for (const event of profileEvents) {
            await this.streamHandler.handleEvent(event);
        }

        // Process notes in batches with weighted distribution
        const count = await this.batchProcessor.processBatch(authors, currentCount);

        this.streamHandler.handleEOSE();
        return count;
    }

    async processFollows(pubkeys: string[], currentCount: number): Promise<number> {
        if (pubkeys.length === 0) return currentCount;

        // Get profiles without limit
        const profileFilter: Filter = {
            authors: pubkeys,
            kinds: [EventKinds.METADATA]
        };

        const profileEvents = await this.relayService.subscribe([profileFilter]);
        for (const event of profileEvents) {
            await this.streamHandler.handleEvent(event);
        }

        // Process notes in batches with weighted distribution
        const count = await this.batchProcessor.processBatch(pubkeys, currentCount);

        this.streamHandler.handleEOSE();
        return count;
    }

    clearChain(): void {
        this.streamHandler.reset();
        this.temporalStore.resetStore();
    }
}
