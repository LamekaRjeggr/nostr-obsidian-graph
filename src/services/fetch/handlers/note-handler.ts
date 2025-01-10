import { NostrEvent, Reference, TagType, ChronologicalMetadata } from '../../../types';
import { EventService } from '../../../services/core/event-service';
import { BaseEventHandler, EventKinds, ProcessingPriority } from '../../../services/core/base-event-handler';
import { TagProcessor } from '../../processors/tag-processor';
import { ReferenceProcessor } from '../../processors/reference-processor';
import { App } from 'obsidian';

import { TemporalProcessor } from '../../processors/temporal-processor';
import { ReactionProcessor } from '../../reactions/reaction-processor';
import { NoteCacheManager } from '../../file/cache/note-cache-manager';
import { ContentProcessor } from '../../file/utils/text-processor';
import { PathUtils } from '../../file/utils/path-utils';
import { FileService } from '../../core/file-service';

export class NoteEventHandler extends BaseEventHandler {
    private tagProcessor: TagProcessor;
    private referenceProcessor: ReferenceProcessor;
    private pathUtils: PathUtils;

    private temporalProcessor: TemporalProcessor;

    constructor(
        eventService: EventService,
        private reactionProcessor: ReactionProcessor,
        private noteCacheManager: NoteCacheManager,
        private app: App,
        private fileService: FileService
    ) {
        super(eventService, EventKinds.NOTE, ProcessingPriority.NOTE);
        this.tagProcessor = new TagProcessor();
        this.referenceProcessor = new ReferenceProcessor(app, app.metadataCache);
        this.temporalProcessor = new TemporalProcessor(app);
        this.pathUtils = new PathUtils(app);
    }

    async process(event: NostrEvent): Promise<void> {
        if (!this.validate(event)) return;
        
        console.log(`Processing note: ${event.id}`);

        // Cache the note title
        const title = ContentProcessor.extractTitle(event.content);
        // Get just the filename without directory or extension
        const safeTitle = this.pathUtils.getPath(title, '', { extractTitle: false }).replace(/^.*[/\\](.+?)\.md$/, '$1');
        this.noteCacheManager.cacheTitle(event.id, safeTitle);

        // Process references and temporal data
        const [refResults, temporalResults] = await Promise.all([
            this.referenceProcessor.process(event),
            this.temporalProcessor.process(event)
        ]);
        
        // Create metadata object
        const metadata: ChronologicalMetadata = {
            previousNote: temporalResults.chronological.previousEvent,
            nextNote: temporalResults.chronological.nextEvent,
            references: refResults.nostr.outgoing.map(id => ({ 
                targetId: id, 
                type: TagType.MENTION 
            })),
            referencedBy: refResults.nostr.incoming.map(id => ({ 
                targetId: id, 
                type: TagType.MENTION 
            })),
            ...temporalResults.metadata
        };

        // Save note with metadata
        await this.fileService.saveNote(event, metadata);
        
        // Emit metadata for event bus
        await this.eventService.emitNote(event, metadata);

        // Process any pending reactions for this note
        console.log(`Processing pending reactions for note: ${event.id}`);
        await this.reactionProcessor.processPendingReactions(event.id);
    }
}
