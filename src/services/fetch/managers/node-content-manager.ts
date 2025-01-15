import { App, Notice } from 'obsidian';
import { NostrEvent, ThreadContext } from '../../../types';
import { EventKinds } from '../../core/base-event-handler';
import { FileService } from '../../core/file-service';
import { FetchManager } from './fetch-manager';
import { ReferenceProcessor } from '../../processors/reference-processor';

export class NodeContentManager {
    private referenceProcessor: ReferenceProcessor;

    constructor(
        private app: App,
        private fileService: FileService,
        private fetchManager: FetchManager
    ) {
        this.referenceProcessor = new ReferenceProcessor(app, app.metadataCache);
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
                return this.fetchManager.fetchWithOptions({
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

            return this.fetchManager.fetchWithOptions({
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
            const events = await this.fetchManager.fetchWithOptions({
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
            const [targetEvent] = await this.fetchManager.fetchWithOptions({
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
            const replies = await this.fetchManager.fetchWithOptions({
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

    reset(): void {
        this.referenceProcessor.clear();
    }
}
