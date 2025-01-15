import { App } from 'obsidian';
import { NostrEvent, FetchOptions, ThreadContext } from '../../types';
import { RelayService } from '../core/relay-service';
import { NostrEventBus } from '../../experimental/event-bus/event-bus';
import { FileService } from '../core/file-service';
import { EventService } from '../core/event-service';
import { ReactionProcessor } from '../processors/reaction-processor';
import { EventStreamManager } from './managers/event-stream-manager';
import { FetchManager } from './managers/fetch-manager';
import { NodeFetchHandler } from './handlers/node-fetch-handler';

export class UnifiedFetchProcessor {
    private eventStreamManager: EventStreamManager;
    private fetchManager: FetchManager;

    constructor(
        private relayService: RelayService,
        private eventBus: NostrEventBus,
        private fileService: FileService,
        private app: App,
        private eventService: EventService
    ) {
        const reactionProcessor = new ReactionProcessor(eventService, app, fileService);
        
        // Initialize core managers
        this.eventStreamManager = new EventStreamManager(app, fileService, eventService, reactionProcessor);
        this.fetchManager = new FetchManager(relayService, fileService, app, reactionProcessor, eventService);
    }

    async fetchWithOptions(options: FetchOptions & { useStream?: boolean }): Promise<NostrEvent[]> {
        const events = await this.fetchManager.fetchWithOptions(options);
        if (options.useStream) {
            await this.eventStreamManager.processEvents(events);
        }
        return events;
    }

    async fetchThreadContext(eventId: string, limit: number = 50): Promise<ThreadContext> {
        const events = await this.fetchWithOptions({
            kinds: [1],
            tags: [['e', eventId]],
            limit
        });

        const rootEvent = await this.fetchCompleteNote(eventId);
        return {
            root: rootEvent?.id,
            replies: events.map(event => event.id)
        };
    }

    async fetchCompleteNote(eventId: string): Promise<NostrEvent | null> {
        const events = await this.fetchWithOptions({
            kinds: [1],
            ids: [eventId],
            limit: 1
        });
        return events.length > 0 ? events[0] : null;
    }

    setNodeFetchHandler(handler: NodeFetchHandler) {
        // Maintain compatibility with existing code
    }

    getReferenceProcessor() {
        return this.eventStreamManager.getReferenceProcessor();
    }

    reset(): void {
        this.eventStreamManager.reset();
        this.fetchManager.reset();
    }
}
