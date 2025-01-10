import { NostrEvent } from '../../../types';
import { EventService } from '../../../services/core/event-service';
import { BaseEventHandler, EventKinds, ProcessingPriority } from '../../../services/core/base-event-handler';
import { TagProcessor } from '../../../services/tags/tag-processor';
import { ReferenceStore } from '../../../services/references/reference-store';
import { TemporalEventStore } from '../../../services/temporal-event-store';
import { ReactionProcessor } from '../../reactions/reaction-processor';
import { NoteCacheManager } from '../../file/cache/note-cache-manager';
import { TextProcessor } from '../../file/utils/text-processor';

export class NoteEventHandler extends BaseEventHandler {
    private tagProcessor: TagProcessor;

    constructor(
        eventService: EventService,
        private temporalStore: TemporalEventStore,
        private referenceStore: ReferenceStore,
        private reactionProcessor: ReactionProcessor,
        private noteCacheManager: NoteCacheManager
    ) {
        super(eventService, EventKinds.NOTE, ProcessingPriority.NOTE);
        this.tagProcessor = new TagProcessor();
    }

    async process(event: NostrEvent): Promise<void> {
        if (!this.validate(event)) return;
        
        console.log(`Processing note: ${event.id}`);

        // Cache the note title
        const safeTitle = TextProcessor.sanitizeFilename(
            TextProcessor.extractFirstSentence(event.content)
        );
        this.noteCacheManager.cacheTitle(event.id, safeTitle);

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
        await this.eventService.emitNote(event, {
            previousNote: links.precedingEvent?.id,
            nextNote: links.subsequentEvent?.id,
            references: outgoingRefs,
            referencedBy: incomingRefs
        });

        // Process any pending reactions for this note
        console.log(`Processing pending reactions for note: ${event.id}`);
        await this.reactionProcessor.processPendingReactions(event.id);
    }
}
