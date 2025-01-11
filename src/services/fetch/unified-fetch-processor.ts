import { NostrEvent, TagType, ChronologicalMetadata, FetchOptions, EnhancedMetadataOptions } from '../../types';
import { TagProcessor } from '../processors/tag-processor';
import { ReferenceProcessor } from '../processors/reference-processor';
import { RelayService } from '../core/relay-service';
import { NostrEventBus } from '../../experimental/event-bus/event-bus';
import { App, Notice } from 'obsidian';
import { ValidationService } from '../validation-service';
import { FileService } from '../core/file-service';
import { EventKinds } from '../core/base-event-handler';
import { ThreadContext } from '../../experimental/event-bus/types';
import { NodeFetchHandler } from './handlers/node-fetch-handler';
import { TemporalProcessor } from '../processors/temporal-processor';
import { NoteCacheManager } from '../file/cache/note-cache-manager';
import { ContentProcessor } from '../file/utils/text-processor';
import { PathUtils } from '../file/utils/path-utils';
import { ReactionProcessor } from '../processors/reaction-processor';
import { EventService } from '../core/event-service';

export class UnifiedFetchProcessor {
    private nodeFetchHandler: NodeFetchHandler | null = null;
    private tagProcessor: TagProcessor;
    private referenceProcessor: ReferenceProcessor;
    private temporalProcessor: TemporalProcessor;
    private noteCacheManager: NoteCacheManager;
    private pathUtils: PathUtils;
    private reactionProcessor: ReactionProcessor;
    private eventService: EventService;

    constructor(
        private relayService: RelayService,
        private eventBus: NostrEventBus,
        private fileService: FileService,
        private app: App
    ) {
        this.tagProcessor = new TagProcessor();
        this.referenceProcessor = new ReferenceProcessor(app, app.metadataCache);
        this.eventService = new EventService();
        
        // Initialize enhanced processors (lazy loaded)
        this.temporalProcessor = new TemporalProcessor(app);
        this.noteCacheManager = new NoteCacheManager();
        this.pathUtils = new PathUtils(app);
        this.reactionProcessor = new ReactionProcessor(this.eventService, app, fileService);
    }

    setNodeFetchHandler(handler: NodeFetchHandler) {
        this.nodeFetchHandler = handler;
    }

    private async fetchContacts(hex: string): Promise<string[]> {
        const contactFilter = {
            authors: [hex],
            kinds: [EventKinds.CONTACT],
            since: 0
        };
        
        const events = await this.relayService.subscribe([contactFilter]);
        return events.flatMap(event => 
            event.tags
                .filter(tag => tag[0] === 'p')
                .map(tag => tag[1])
        );
    }

    private async processEnhancedMetadata(
        event: NostrEvent,
        options: EnhancedMetadataOptions,
        baseMetadata: any
    ): Promise<any> {
        let metadata = { ...baseMetadata };

        // Add temporal metadata if requested
        if (options.temporal) {
            const temporalResults = await this.temporalProcessor.process(event);
            metadata = {
                ...metadata,
                previousNote: temporalResults.chronological.previousEvent,
                nextNote: temporalResults.chronological.nextEvent,
                ...temporalResults.metadata
            };
        }

        // Cache title if requested
        if (options.titles) {
            const title = ContentProcessor.extractTitle(event.content);
            const safeTitle = this.pathUtils.getPath(title, '', { extractTitle: false })
                .replace(/^.*[/\\](.+?)\.md$/, '$1');
            this.noteCacheManager.cacheTitle(event.id, safeTitle);
        }

        return metadata;
    }

    async fetchWithOptions(options: FetchOptions): Promise<NostrEvent[]> {
        try {
            if (options.author && !ValidationService.validateHex(options.author)) {
                throw new Error('Invalid hex key format');
            }

            // Handle contacts if requested
            let authors: string[] | undefined;
            if (options.contacts?.include && options.author) {
                const contacts = await this.fetchContacts(options.author);
                
                if (options.contacts.fetchProfiles) {
                    await this.fetchWithOptions({
                        kinds: [EventKinds.METADATA],
                        limit: contacts.length,
                        authors: contacts,
                        skipSave: !options.contacts.linkInGraph
                    });
                }
                
                authors = [options.author, ...contacts];
            } else if (options.authors) {
                authors = options.authors;
            } else if (options.author) {
                authors = [options.author];
            }

            const filter = {
                kinds: options.kinds,
                limit: options.limit,
                since: options.since,
                until: options.until,
                authors: authors,
                ids: options.ids,
                '#e': options.tags?.filter(t => t[0] === 'e').map(t => t[1]),
                '#p': options.tags?.filter(t => t[0] === 'p').map(t => t[1]),
                search: options.search ? options.search.join(' ') : undefined
            };

            new Notice(`Fetching events with limit ${options.limit}...`);
            
            const events = await this.relayService.subscribe([filter]);
            const filteredEvents = options.filter 
                ? events.filter(options.filter)
                : events;

            new Notice(`Found ${filteredEvents.length} matching events`);

            if (!options.skipSave) {
                for (const event of filteredEvents) {
                    const refResults = await this.referenceProcessor.process(event);
                    
                    // Build base metadata
                    let metadata = {
                        references: refResults.nostr.outgoing.map((id: string) => ({
                            targetId: id,
                            type: TagType.MENTION
                        })),
                        referencedBy: refResults.nostr.incoming.map((id: string) => ({
                            targetId: id,
                            type: TagType.MENTION
                        }))
                    };

                    // Add enhanced metadata if requested
                    if (options.enhanced) {
                        metadata = await this.processEnhancedMetadata(
                            event,
                            options.enhanced,
                            metadata
                        );
                    }

                    // Save note with metadata
                    await this.fileService.saveNote(event, metadata);

                    // Process reactions if requested
                    if (options.enhanced?.reactions) {
                        await this.reactionProcessor.processPendingReactions(event.id);
                    }
                }
            }

            return filteredEvents;
        } catch (error) {
            console.error('Error in UnifiedFetchProcessor:', error);
            new Notice(`Error fetching events: ${error.message}`);
            throw error;
        }
    }

    async fetchNodeContent(filePath: string, limit: number = 50): Promise<NostrEvent[]> {
        try {
            console.log('Fetching node content for:', filePath);
            
            // Get the file metadata
            const metadata = await this.fileService.getNostrMetadata(filePath);
            if (!metadata?.id) {
                throw new Error('No nostr event ID found in file metadata');
            }

            // For profiles (kind 0), fetch author's notes with contacts
            if (metadata.kind === 0) {
                return this.fetchWithOptions({
                    kinds: [EventKinds.NOTE],
                    limit: limit,
                    author: metadata.id,
                    contacts: {
                        include: true,
                        fetchProfiles: true,
                        linkInGraph: true
                    }
                });
            }

            // For notes, fetch the note and its references
            const nodeEvent = await this.fetchCompleteNote(metadata.id);
            if (!nodeEvent) {
                throw new Error('Node event not found');
            }

            // Process references
            const refResults = await this.referenceProcessor.process(nodeEvent);
            const relatedIds = [
                ...refResults.nostr.outgoing,
                ...(refResults.metadata.root ? [refResults.metadata.root] : []),
                ...(refResults.metadata.replyTo ? [refResults.metadata.replyTo] : [])
            ];

            return this.fetchWithOptions({
                kinds: [EventKinds.NOTE],
                limit: limit,
                ids: relatedIds
            });
        } catch (error) {
            console.error('Error in node-based fetch:', error);
            new Notice(`Error fetching node content: ${error.message}`);
            return [];
        }
    }

    async fetchCompleteNote(eventId: string): Promise<NostrEvent | null> {
        try {
            const events = await this.fetchWithOptions({
                kinds: [EventKinds.NOTE],
                limit: 1,
                ids: [eventId]
            });
            
            return events[0] || null;
        } catch (error) {
            console.error('Error fetching complete note:', error);
            return null;
        }
    }

    async fetchThreadContext(eventId: string, limit: number = 50): Promise<ThreadContext> {
        try {
            // Fetch the target event first
            const [targetEvent] = await this.fetchWithOptions({
                kinds: [EventKinds.NOTE],
                limit: 1,
                ids: [eventId]
            });

            if (!targetEvent) {
                throw new Error('Target event not found');
            }

            // Process references to get thread context
            const refResults = await this.referenceProcessor.process(targetEvent);
            const context: ThreadContext = {
                root: refResults.metadata.root,
                parent: refResults.metadata.replyTo
            };

            // Fetch replies
            const replies = await this.fetchWithOptions({
                kinds: [EventKinds.NOTE],
                limit: limit,
                tags: [['e', eventId]]
            });

            context.replies = replies.map(e => e.id);

            return context;
        } catch (error) {
            console.error('Error fetching thread context:', error);
            return {};
        }
    }
}
