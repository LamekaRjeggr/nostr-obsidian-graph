import { NostrEvent } from '../../types';
import { RelayService } from '../core/relay-service';
import { NostrEventBus } from '../../experimental/event-bus/event-bus';
import { Notice } from 'obsidian';
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
}

export class UnifiedFetchProcessor {
    private nodeFetchHandler: NodeFetchHandler | null = null;

    constructor(
        private relayService: RelayService,
        private eventBus: NostrEventBus,
        private fileService: FileService
    ) {}

    setNodeFetchHandler(handler: NodeFetchHandler) {
        this.nodeFetchHandler = handler;
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

            // Get references from tags
            const relatedIds = nodeEvent.tags
                .filter(tag => tag[0] === 'e')
                .map(tag => tag[1]);
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
                '#p': options.tags?.filter(t => t[0] === 'p').map(t => t[1])
            };

            new Notice(`Fetching events with limit ${options.limit}...`);
            
            // Fetch events from relay
            const events = await this.relayService.subscribe([filter]);
            
            // Apply custom filter if provided
            const filteredEvents = options.filter 
                ? events.filter(options.filter)
                : events;

            new Notice(`Found ${filteredEvents.length} matching events`);

            // Save events using Obsidian's API
            for (const event of filteredEvents) {
                await this.fileService.saveNote(event, {
                    references: [],
                    referencedBy: [],
                });
            }

            return filteredEvents;
        } catch (error) {
            console.error('Error in UnifiedFetchProcessor:', error);
            new Notice(`Error fetching events: ${error.message}`);
            throw error;
        }
    }

    // New method for fetching a complete note by ID
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

            const context: ThreadContext = {};

            // Find root and parent IDs from event tags
            for (const tag of targetEvent.tags) {
                if (tag[0] === 'e') {
                    if (tag[3] === 'root') {
                        context.root = tag[1];
                    } else if (tag[3] === 'reply') {
                        context.parent = tag[1];
                    }
                }
            }

            // If no explicit root/parent markers, use first/last e tags
            if (!context.root && !context.parent) {
                const eTags = targetEvent.tags.filter(t => t[0] === 'e');
                if (eTags.length > 0) {
                    context.root = eTags[0][1];
                    if (eTags.length > 1) {
                        context.parent = eTags[eTags.length - 1][1];
                    }
                }
            }

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
