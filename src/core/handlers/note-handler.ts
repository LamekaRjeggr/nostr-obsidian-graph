import { NostrEvent } from '../../types';
import { BaseEventHandler, EventKinds, ProcessingPriority } from '../../services/core/base-event-handler';
import { EventService } from '../../services/core/event-service';
import { TagProcessor } from '../../services/tags/tag-processor';
import { ReferenceStore } from '../../services/references/reference-store';
import { TemporalEventStore } from '../../services/temporal-event-store';
import { NoteEventValidator } from './validators/NoteEventValidator';
import { NoteReferenceManager } from './references/NoteReferenceManager';
import { NoteTemporalManager } from './temporal/NoteTemporalManager';

export class NoteHandler extends BaseEventHandler {
    private validator: NoteEventValidator;
    private referenceManager: NoteReferenceManager;
    private temporalManager: NoteTemporalManager;

    constructor(
        eventService: EventService,
        tagProcessor: TagProcessor,
        referenceStore: ReferenceStore,
        temporalStore: TemporalEventStore
    ) {
        super(eventService, EventKinds.NOTE, ProcessingPriority.NOTE);
        
        this.validator = new NoteEventValidator();
        this.referenceManager = new NoteReferenceManager(tagProcessor, referenceStore);
        this.temporalManager = new NoteTemporalManager(temporalStore);
    }

    protected validate(event: NostrEvent): boolean {
        return this.validator.validate(event);
    }

    async process(event: NostrEvent): Promise<void> {
        if (!this.validate(event)) return;
        
        const references = this.referenceManager.processReferences(event);
        const temporalLinks = this.temporalManager.processTemporalOrder(event);
        
        this.eventService.emitNote(event, {
            previousNote: temporalLinks.precedingEvent?.id,
            nextNote: temporalLinks.subsequentEvent?.id,
            references: references.outgoing,
            referencedBy: references.incoming
        });
    }

    onHistoricalComplete(): void {
        // Historical data processing complete
        // No additional actions needed as each component handles its own state
    }

    reset(): void {
        this.referenceManager.reset();
        this.temporalManager.reset();
    }
}
