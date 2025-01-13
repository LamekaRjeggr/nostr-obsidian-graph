import { NostrEvent, TagType, FetchOptions, EnhancedMetadataOptions, ContactOptions, ThreadContext } from '../../types';
import { ContactGraphService } from '../contacts/contact-graph-service';
import { EventStreamHandler } from '../../core/event-stream-handler';
import { TagProcessor } from '../processors/tag-processor';
import { ReferenceProcessor } from '../processors/reference-processor';
import { RelayService } from '../core/relay-service';
import { NostrEventBus } from '../../experimental/event-bus/event-bus';
import { App, Notice } from 'obsidian';
import { ValidationService } from '../validation-service';
import { FileService } from '../core/file-service';
import { EventKinds } from '../core/base-event-handler';
import { NodeFetchHandler } from './handlers/node-fetch-handler';
import { NoteCacheManager } from '../file/cache/note-cache-manager';
import { ContentProcessor } from '../file/utils/text-processor';
import { PathUtils } from '../file/utils/path-utils';
import { ReactionProcessor } from '../processors/reaction-processor';
import { EventService } from '../core/event-service';

export class UnifiedFetchProcessor {
    private nodeFetchHandler: NodeFetchHandler | null = null;
    private tagProcessor: TagProcessor;
    private referenceProcessor: ReferenceProcessor;
    private noteCacheManager: NoteCacheManager;
    private pathUtils: PathUtils;
    private reactionProcessor: ReactionProcessor;
    private eventService: EventService;
    private streamHandler: EventStreamHandler;
    private contactGraphService: ContactGraphService;

    constructor(
        private relayService: RelayService,
        private eventBus: NostrEventBus,
        private fileService: FileService,
        private app: App
    ) {
        this.contactGraphService = new ContactGraphService(relayService);
        this.tagProcessor = new TagProcessor();
        this.referenceProcessor = new ReferenceProcessor(app, app.metadataCache);
        this.eventService = new EventService();
        
        // Initialize processors
        this.noteCacheManager = new NoteCacheManager();
        this.pathUtils = new PathUtils(app);
        this.reactionProcessor = new ReactionProcessor(this.eventService, app, fileService);
        
        // Initialize stream handler
        this.streamHandler = new EventStreamHandler();
        this.registerHandlers();
    }

    private registerHandlers(): void {
        // Register handlers in priority order
        this.streamHandler.registerHandler({
            kind: EventKinds.METADATA,
            priority: 1,
            process: async (event) => {
                const metadata = JSON.parse(event.content);
                await this.fileService.saveProfile({
                    pubkey: event.pubkey,
                    ...metadata
                });
            },
            validate: (event) => {
                try {
                    JSON.parse(event.content);
                    return true;
                } catch {
                    return false;
                }
            },
            cleanup: async () => {
                // No cleanup needed for metadata
            }
        });

        this.streamHandler.registerHandler({
            kind: EventKinds.CONTACT,
            priority: 2,
            process: async (event) => {
                const contacts = event.tags
                    .filter(tag => tag[0] === 'p')
                    .map(tag => tag[1]);
                await this.processContacts(event.pubkey, contacts);
            },
            validate: (event) => {
                return event.tags.some(tag => tag[0] === 'p');
            },
            cleanup: async () => {
                // No cleanup needed for contacts
            }
        });

        this.streamHandler.registerHandler({
            kind: EventKinds.NOTE,
            priority: 3,
            process: async (event) => {
                const refResults = await this.referenceProcessor.process(event);
                const tagResults = this.tagProcessor.process(event);
                await this.fileService.saveNote(event, {
                    references: [
                        ...(tagResults.root ? [{
                            targetId: tagResults.root,
                            type: TagType.ROOT,
                            marker: 'root'
                        }] : []),
                        ...(tagResults.replyTo ? [{
                            targetId: tagResults.replyTo,
                            type: TagType.REPLY,
                            marker: 'reply'
                        }] : []),
                        ...tagResults.references.map(id => ({
                            targetId: id,
                            type: TagType.MENTION
                        }))
                    ],
                    referencedBy: refResults.nostr.incoming.map(id => ({
                        targetId: id,
                        type: TagType.MENTION
                    }))
                });
            },
            validate: (event) => {
                return event.content.trim().length > 0;
            },
            cleanup: async () => {
                // No cleanup needed for notes
            }
        });

        this.streamHandler.registerHandler({
            kind: EventKinds.REACTION,
            priority: 4,
            process: async (event) => {
                await this.reactionProcessor.process(event);
            },
            validate: (event) => {
                return event.tags.some(tag => tag[0] === 'e');
            },
            cleanup: async () => {
                // No cleanup needed for reactions
            }
        });
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

        // Cache title if requested
        if (options.titles) {
            const title = ContentProcessor.extractTitle(event.content);
            const safeTitle = this.pathUtils.getPath(title, '', { extractTitle: false })
                .replace(/^.*[/\\](.+?)\.md$/, '$1');
            this.noteCacheManager.cacheTitle(event.id, safeTitle);
        }

        return metadata;
    }

    private async processContacts(pubkey: string, contacts: string[], options?: ContactOptions): Promise<void> {
        // Initialize contact graph if needed
        if (!this.contactGraphService.isInitialized()) {
            await this.contactGraphService.initialize(pubkey);
        }

        // Process contacts through stream handler
        const contactEvent: NostrEvent = {
            id: 'local-' + Math.random().toString(36).slice(2),
            kind: EventKinds.CONTACT,
            pubkey,
            content: '',
            tags: contacts.map(c => ['p', c]),
            created_at: Math.floor(Date.now() / 1000),
            sig: 'local'
        };
        await this.streamHandler.processEvent(contactEvent as NostrEvent);

        // Fetch profiles if requested
        if (options?.fetchProfiles) {
            const directFollows = this.contactGraphService.getDirectFollows();
            if (directFollows.length > 0) {
                await this.fetchWithOptions({
                    kinds: [EventKinds.METADATA],
                    authors: directFollows,
                    skipSave: !options.linkInGraph,
                    limit: directFollows.length
                });
            }
        }
    }

    private async fetchWithStream(options: FetchOptions): Promise<NostrEvent[]> {
        const events = await this.fetchWithOptions({ ...options, useStream: false });
        await this.streamHandler.processEvents(events);
        return events;
    }

    async fetchWithOptions(options: FetchOptions & { useStream?: boolean }): Promise<NostrEvent[]> {
        try {
            if (options.author && !ValidationService.validateHex(options.author)) {
                throw new Error('Invalid hex key format');
            }

            // Handle contacts if requested
            let authors: string[] | undefined;
            if (options.contacts?.include && options.author) {
                const contacts = await this.fetchContacts(options.author);
                
                if (options.contacts.fetchProfiles && contacts.length > 0) {
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

            if (options.useStream) {
                await this.streamHandler.processEvents(filteredEvents);
            }

            if (!options.skipSave) {
                for (const event of filteredEvents) {
                    const refResults = await this.referenceProcessor.process(event);
                    
                    // Process tags to determine reference types
                    const tagResults = this.tagProcessor.process(event);
                    
                    // Build base metadata using tag processing results
                    let metadata = {
                        references: [
                            // Root reference
                            ...(tagResults.root ? [{
                                targetId: tagResults.root,
                                type: TagType.ROOT,
                                marker: 'root'
                            }] : []),
                            // Reply reference
                            ...(tagResults.replyTo ? [{
                                targetId: tagResults.replyTo,
                                type: TagType.REPLY,
                                marker: 'reply'
                            }] : []),
                            // Other references
                            ...tagResults.references.map(id => ({
                                targetId: id,
                                type: TagType.MENTION
                            })),
                            // Mentions
                            ...tagResults.mentions.map(id => ({
                                targetId: id,
                                type: TagType.MENTION
                            }))
                        ],
                        referencedBy: refResults.nostr.incoming.map(id => ({
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
