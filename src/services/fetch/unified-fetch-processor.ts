import { NostrEvent, TagType } from '../../types';
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

export interface FetchOptions {
    kinds: number[];
    limit: number;
    filter?: (event: NostrEvent) => boolean;
    since?: number;
    until?: number;
    author?: string;
    ids?: string[];        // Added for specific event fetching
    tags?: [string, string][]; // Added for tag-based fetching
    search?: string[];     // Added for keyword search support
    skipSave?: boolean;    // Skip auto-saving of results
}

export class UnifiedFetchProcessor {
    private nodeFetchHandler: NodeFetchHandler | null = null;

    private tagProcessor: TagProcessor;
    private referenceProcessor: ReferenceProcessor;

    constructor(
        private relayService: RelayService,
        private eventBus: NostrEventBus,
        private fileService: FileService,
        private app: App
    ) {
        this.tagProcessor = new TagProcessor();
        this.referenceProcessor = new ReferenceProcessor(app, app.metadataCache);
    }

    setNodeFetchHandler(handler: NodeFetchHandler) {
        this.nodeFetchHandler = handler;
    }

    async fetchWithOptions(options: FetchOptions): Promise<NostrEvent[]> {
        try {
            // Validate hex if author is provided
            if (options.author && !ValidationService.validateHex(options.author)) {
                throw new Error('Invalid hex key format');
            }

            // Build filter for relay
            const filter = {
                kinds: options.kinds,
                limit: options.limit,
                since: options.since,
                until: options.until,
                authors: options.author ? [options.author] : undefined,
                ids: options.ids,
                '#e': options.tags?.filter(t => t[0] === 'e').map(t => t[1]),
                '#p': options.tags?.filter(t => t[0] === 'p').map(t => t[1]),
                // Add NIP-50 search if keywords provided
                search: options.search ? options.search.join(' ') : undefined
            };

            new Notice(`Fetching events with limit ${options.limit}...`);
            
            // Fetch events from relay
            const events = await this.relayService.subscribe([filter]);
            
            // Apply any additional custom filter if provided
            // This allows for more complex filtering beyond what NIP-50 supports
            const filteredEvents = options.filter 
                ? events.filter(options.filter)
                : events;

            new Notice(`Found ${filteredEvents.length} matching events`);

            // Process and save events unless explicitly skipped
            if (!options.skipSave) {
                for (const event of filteredEvents) {
                    // Process references
                    const refResults = await this.referenceProcessor.process(event);
                    
                    // Save with reference metadata
                    await this.fileService.saveNote(event, {
                        references: refResults.nostr.outgoing.map((id: string) => ({
                            targetId: id,
                            type: TagType.MENTION
                        })),
                        referencedBy: refResults.nostr.incoming.map((id: string) => ({
                            targetId: id,
                            type: TagType.MENTION
                        }))
                    });
                }
            }

            return filteredEvents;
        } catch (error) {
            console.error('Error in UnifiedFetchProcessor:', error);
            new Notice(`Error fetching events: ${error.message}`);
            throw error;
        }
    }

    // Method for fetching node-based content
    async fetchNodeContent(filePath: string, limit: number = 50): Promise<NostrEvent[]> {
        try {
            console.log('Fetching node content for:', filePath);
            
            // Get the file metadata
            const metadata = await this.fileService.getNostrMetadata(filePath);
            if (!metadata?.id) {
                throw new Error('No nostr event ID found in file metadata');
            }
            console.log('Got metadata with ID:', metadata.id, 'kind:', metadata.kind);

            // For profiles (kind 0), fetch author's notes
            if (metadata.kind === 0) {
                console.log('Processing as profile, fetching author notes');
                const events = await this.fetchWithOptions({
                    kinds: [EventKinds.NOTE],
                    limit: limit,
                    author: metadata.id
                });

                // Process events through node fetch handler if available
                if (this.nodeFetchHandler) {
                    for (const event of events) {
                        await this.nodeFetchHandler.process(event);
                    }
                }

                return events;
            }

            // For notes, fetch the note and its references
            console.log('Processing as note, fetching complete note');
            const nodeEvent = await this.fetchCompleteNote(metadata.id);
            if (!nodeEvent) {
                console.log('Failed to fetch note event');
                throw new Error('Node event not found');
            }
            console.log('Found note event:', nodeEvent);

            // Process tags and references
            const refResults = await this.referenceProcessor.process(nodeEvent);
            const relatedIds = [
                ...refResults.nostr.outgoing,
                ...(refResults.metadata.root ? [refResults.metadata.root] : []),
                ...(refResults.metadata.replyTo ? [refResults.metadata.replyTo] : [])
            ];
            console.log('Found related IDs:', relatedIds);

            // Fetch related events
            const events = await this.fetchWithOptions({
                kinds: [EventKinds.NOTE],
                limit: limit,
                ids: relatedIds
            });
            console.log('Fetched related events:', events.length);

            // Process events through node fetch handler if available
            if (this.nodeFetchHandler) {
                for (const event of events) {
                    await this.nodeFetchHandler.process(event);
                }
            }

            return events;
        } catch (error) {
            console.error('Error in node-based fetch:', error);
            new Notice(`Error fetching node content: ${error.message}`);
            throw error;
        }
    }

    // Method for fetching a complete note by ID
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

    // Method for fetching thread context
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
            throw error;
        }
    }
}
