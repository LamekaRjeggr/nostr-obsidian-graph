import { App, CachedMetadata, LinkCache } from 'obsidian';
import { NostrEvent, FetchOptions, ThreadContext } from '../../types';
import { NostrEventType, ThreadFetchEvent } from '../../experimental/event-bus/types';
import { RelayService } from '../core/relay-service';
import { NostrEventBus } from '../../experimental/event-bus/event-bus';
import { FileService } from '../core/file-service';
import { EventService } from '../core/event-service';
import { ReactionProcessor } from '../processors/reaction-processor';
import { ReferenceProcessor } from '../processors/reference-processor';
import { TagProcessor } from '../processors/tag-processor';
import { EventStreamManager } from './managers/event-stream-manager';
import { FetchManager } from './managers/fetch-manager';
import { NodeFetchHandler } from './handlers/node-fetch-handler';

export class UnifiedFetchProcessor {
    private eventStreamManager: EventStreamManager;
    private fetchManager: FetchManager;
    private tagProcessor: TagProcessor;

    constructor(
        private relayService: RelayService,
        private eventBus: NostrEventBus,
        private fileService: FileService,
        private app: App,
        private eventService: EventService
    ) {
        this.tagProcessor = new TagProcessor();
        const reactionProcessor = new ReactionProcessor(eventService, app, fileService);
        
        // Create a single ReferenceProcessor instance to share
        const referenceProcessor = new ReferenceProcessor(app, app.metadataCache);
        
        // Initialize core managers with shared ReferenceProcessor
        this.eventStreamManager = new EventStreamManager(app, fileService, eventService, reactionProcessor, referenceProcessor);
        this.fetchManager = new FetchManager(relayService, fileService, app, reactionProcessor, eventService, referenceProcessor);
    }

    async fetchWithOptions(options: FetchOptions & { useStream?: boolean }): Promise<NostrEvent[]> {
        const events = await this.fetchManager.fetchWithOptions(options);
        if (options.useStream) {
            await this.eventStreamManager.processEvents(events);
        }
        return events;
    }

    async fetchCompleteNote(id: string, kind: number = 1): Promise<NostrEvent | null> {
        // Check Obsidian cache first
        const files = this.app.vault.getMarkdownFiles();
        for (const file of files) {
            const cache = this.app.metadataCache.getFileCache(file);
            if (kind === 0 && cache?.frontmatter?.aliases?.includes(id)) {
                // Found profile in cache
                const metadata = await this.fileService.getNostrMetadata(file.path);
                if (metadata && this.isNostrEvent(metadata)) {
                    return metadata;
                }
            } else if (kind === 1 && cache?.frontmatter?.id === id) {
                // Found note in cache
                const metadata = await this.fileService.getNostrMetadata(file.path);
                if (metadata && this.isNostrEvent(metadata)) {
                    return metadata;
                }
            }
        }

        // Not in cache, fetch from relays
        const events = await this.fetchWithOptions({
            kinds: [kind],
            ...(kind === 0 ? { authors: [id] } : { ids: [id] }),
            limit: 1
        });
        return events.length > 0 ? events[0] : null;
    }

    async fetchThreadContext(id: string, limit: number = 50, kind: number = 1): Promise<ThreadContext> {
        // Get target event (from cache or relays)
        const targetEvent = await this.fetchCompleteNote(id, kind);
        if (!targetEvent) return { replies: [] };

        // Use Obsidian's cache for relationships
        const files = this.app.vault.getMarkdownFiles();
        const cache = this.app.metadataCache;
        const relationships: Required<Omit<ThreadContext, 'root' | 'parent'>> & {
            root?: string;
            parent?: string;
        } = {
            root: undefined,
            parent: undefined,
            replies: []
        };

        // Check each file's frontmatter and links
        for (const file of files) {
            const fileCache = cache.getFileCache(file);
            if (!fileCache) continue;

            // Check if this file references our target
            const frontmatter = fileCache.frontmatter;
            
            if (frontmatter?.root === id) {
                relationships.root = frontmatter.id;
            }
            if (frontmatter?.reply_to === id) {
                relationships.replies.push(frontmatter.id);
            }
            if (frontmatter?.id === id && frontmatter.root) {
                relationships.root = frontmatter.root;
            }
        }

        // Process target event through reference processor
        const referenceProcessor = this.getReferenceProcessor();
        const processedRefs = await referenceProcessor.process(targetEvent);
        
        // Merge cached and processed references
        relationships.root = processedRefs.metadata.root || relationships.root;
        relationships.parent = processedRefs.metadata.replyTo;

        // Fetch any missing data from relays if needed
        if (!relationships.replies.length) {
            const replyEvents = await this.fetchWithOptions({
                kinds: [1],
                tags: [['e', id]],
                limit
            });
            relationships.replies = replyEvents.map(e => e.id);
        }

        // Process each reply to ensure proper thread context
        for (const replyId of relationships.replies) {
            const replyEvent = await this.fetchCompleteNote(replyId);
            if (replyEvent) {
                await referenceProcessor.process(replyEvent);
            }
        }

        return relationships;
    }

    private isNostrEvent(obj: any): obj is NostrEvent {
        return (
            obj &&
            typeof obj === 'object' &&
            'content' in obj &&
            'sig' in obj &&
            'id' in obj &&
            'pubkey' in obj &&
            'created_at' in obj &&
            'kind' in obj &&
            Array.isArray(obj.tags)
        );
    }

    getReferenceProcessor() {
        return this.fetchManager.getReferenceProcessor();
    }

    reset(): void {
        this.eventStreamManager.reset();
        this.fetchManager.reset();
    }
}
