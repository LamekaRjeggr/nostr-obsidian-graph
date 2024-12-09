import { NostrEvent } from '../../types';
import { BaseEventHandler, EventKinds, ProcessingPriority } from '../../services/core/base-event-handler';
import { EventService } from '../../services/core/event-service';
import { TagProcessor } from '../../services/tags/tag-processor';
import { ReferenceStore } from '../../services/references/reference-store';
import { TemporalEventStore } from '../../services/temporal-event-store';

export class NoteHandler extends BaseEventHandler {
    private tagProcessor: TagProcessor;
    private referenceStore: ReferenceStore;
    protected eventService: EventService;

    constructor(
        eventService: EventService,
        private temporalStore: TemporalEventStore
    ) {
        super(eventService, EventKinds.NOTE, ProcessingPriority.NOTE);
        this.tagProcessor = new TagProcessor();
        this.referenceStore = new ReferenceStore();
        this.eventService = eventService;
    }

    protected validate(event: NostrEvent): boolean {
        return super.validate(event) && event.kind === EventKinds.NOTE;
    }

    async process(event: NostrEvent): Promise<void> {
        if (!this.validate(event)) return;
        
        // Process tags first
        const references = this.tagProcessor.processEventTags(event);
        this.referenceStore.addReferences(event.id, references);
        
        // Store in temporal store for chronological ordering
        this.temporalStore.storeEvent(event);
        
        // Get chronological links
        const links = this.temporalStore.getConnectedEvents(event.id);
        
        // Get all references for this note
        const outgoingRefs = this.referenceStore.getOutgoingReferences(event.id);
        const incomingRefs = this.referenceStore.getIncomingReferences(event.id);
        
        // Emit with all metadata
        this.eventService.emitNote(event, {
            previousNote: links.precedingEvent?.id,
            nextNote: links.subsequentEvent?.id,
            references: outgoingRefs,
            referencedBy: incomingRefs
        });
    }

    onHistoricalComplete(): void {
        // Process any final linking after all historical data is in
        // This ensures we have all references before saving notes
    }

    reset(): void {
        this.referenceStore.clear();
    }
}
