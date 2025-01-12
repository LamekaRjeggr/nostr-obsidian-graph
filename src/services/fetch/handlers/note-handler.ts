import { NostrEvent, Reference, TagType, NoteMetadata } from '../../../types';
import { EventService } from '../../../services/core/event-service';
import { BaseEventHandler, EventKinds, ProcessingPriority } from '../../../services/core/base-event-handler';
import { TagProcessor } from '../../processors/tag-processor';
import { ReferenceProcessor } from '../../processors/reference-processor';
import { App } from 'obsidian';

import { ReactionProcessor } from '../../processors/reaction-processor';
import { NoteCacheManager } from '../../file/cache/note-cache-manager';
import { ContentProcessor } from '../../file/utils/text-processor';
import { PathUtils } from '../../file/utils/path-utils';
import { FileService } from '../../core/file-service';

export class NoteEventHandler extends BaseEventHandler {
    private tagProcessor: TagProcessor;
    private referenceProcessor: ReferenceProcessor;
    private pathUtils: PathUtils;

    constructor(
        eventService: EventService,
        private reactionProcessor: ReactionProcessor,
        private noteCacheManager: NoteCacheManager,
        private app: App,
        private fileService: FileService,
        referenceProcessor: ReferenceProcessor
    ) {
        super(eventService, EventKinds.NOTE, ProcessingPriority.NOTE);
        this.tagProcessor = new TagProcessor();
        this.referenceProcessor = referenceProcessor;
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

        // Process references
        const refResults = await this.referenceProcessor.process(event);
        
        // Create metadata object
        const metadata: NoteMetadata = {
            references: refResults.nostr.outgoing.map(id => ({ 
                targetId: id, 
                type: TagType.MENTION 
            })),
            referencedBy: refResults.nostr.incoming.map(id => ({ 
                targetId: id, 
                type: TagType.MENTION 
            })),
            created_at: new Date(event.created_at * 1000).toISOString(),
            created: event.created_at
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
