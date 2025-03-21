import { App, Notice } from 'obsidian';
import { 
    NostrEvent, 
    ThreadContext, 
    ThreadFetchMode, 
    ThreadFetchOptions, 
    ThreadFetchProgress,
    TagType,
    Reference,
    UnifiedFetchSettings
} from '../../types';
import { ReferenceProcessor } from '../processors/reference-processor';
import { UnifiedFetchProcessor } from './unified-fetch-processor';
import { FileService } from '../core/file-service';
import { ValidationService } from '../validation-service';
import { EventKinds } from '../core/base-event-handler';

export class ThreadFetchService {
    private progress: ThreadFetchProgress = {
        total: 0,
        processed: 0,
        succeeded: 0,
        failed: 0
    };

    updateSettings(settings: UnifiedFetchSettings) {
        this.settings = settings;
    }

    constructor(
        private unifiedFetchProcessor: UnifiedFetchProcessor,
        private fileService: FileService,
        private referenceProcessor: ReferenceProcessor,
        private app: App,
        private settings: UnifiedFetchSettings
    ) {}

    /**
     * Get event IDs that are referenced but not fetched yet
     */
    private async getUnfetchedReferences(): Promise<string[]> {
        // Get all referenced event IDs
        const allReferences = new Set<string>();
        
        // Get all notes from directories
        const directories = await this.fileService.getNotesDirectories();
        const noteFiles = (await Promise.all(
            directories.map(dir => this.fileService.listFilesInDirectory(dir))
        )).flat();

        // Process each note's references
        for (const filePath of noteFiles) {
            const metadata = await this.fileService.getNostrMetadata(filePath);
            if (metadata?.id) {
                // Add outgoing references
                const outgoing = this.referenceProcessor.getOutgoingReferences(metadata.id);
                outgoing.forEach(ref => allReferences.add(ref));

                // Add incoming references
                const incoming = this.referenceProcessor.getIncomingReferences(metadata.id);
                incoming.forEach(ref => allReferences.add(ref));
            }
        }

        // Filter out events that already exist as files
        const unfetchedIds: string[] = [];
        for (const eventId of allReferences) {
            const exists = await this.fileService.hasNote(eventId);
            if (!exists) {
                unfetchedIds.push(eventId);
            }
        }

        return unfetchedIds;
    }

    private createReferences(eventId: string, context: { root?: string; parent?: string; }): Reference[] {
        const references: Reference[] = [];

        if (context.root) {
            references.push({
                type: TagType.ROOT,
                targetId: context.root,
                marker: 'root'
            });
        }

        if (context.parent) {
            references.push({
                type: TagType.REPLY,
                targetId: context.parent,
                marker: 'reply'
            });
        }

        return references;
    }

    private resetProgress() {
        this.progress = {
            total: 0,
            processed: 0,
            succeeded: 0,
            failed: 0
        };
    }

    private updateProgress(success: boolean) {
        this.progress.processed++;
        if (success) {
            this.progress.succeeded++;
        } else {
            this.progress.failed++;
        }

        // Update notice every 10 notes
        if (this.progress.processed % 10 === 0) {
            new Notice(`Processing threads: ${this.progress.processed}/${this.progress.total} (${this.progress.succeeded} succeeded, ${this.progress.failed} failed)`);
        }
    }

    async fetchSingleThread(eventId: string, limit?: number, includeContext: boolean = true): Promise<void> {
        try {
            // Validate event ID
            if (!ValidationService.validateHex(eventId)) {
                new Notice('Invalid event ID format');
                return;
            }

            // Fetch thread context
            const context = await this.unifiedFetchProcessor.fetchThreadContext(eventId, limit || this.settings.thread.limit);
            
            // Fetch and save root note if exists and context is requested
            if (includeContext && context.root) {
                const rootEvent = await this.unifiedFetchProcessor.fetchCompleteNote(context.root);
                if (rootEvent) {
                    const rootRefs = this.createReferences(rootEvent.id, {});
                    await this.fileService.saveNote(rootEvent, {
                        references: rootRefs,
                        referencedBy: []
                    });
                }
            }

            // Fetch and save parent note if exists and context is requested
            if (includeContext && context.parent && context.parent !== context.root) {
                const parentEvent = await this.unifiedFetchProcessor.fetchCompleteNote(context.parent);
                if (parentEvent) {
                    const parentRefs = this.createReferences(parentEvent.id, { root: context.root });
                    await this.fileService.saveNote(parentEvent, {
                        references: parentRefs,
                        referencedBy: []
                    });
                }
            }

            // Fetch and save target event
            const targetEvent = await this.unifiedFetchProcessor.fetchCompleteNote(eventId);
            if (targetEvent) {
                const targetRefs = this.createReferences(targetEvent.id, {
                    root: context.root,
                    parent: context.parent
                });
                await this.fileService.saveNote(targetEvent, {
                    references: targetRefs,
                    referencedBy: []
                });
            }

            // Fetch and save replies if they exist, respecting the limit
            if (context.replies && context.replies.length > 0) {
                const effectiveLimit = limit || this.settings.thread.limit;
                const limitedReplies = context.replies.slice(0, effectiveLimit);
                for (const replyId of limitedReplies) {
                    const replyEvent = await this.unifiedFetchProcessor.fetchCompleteNote(replyId);
                    if (replyEvent) {
                        const replyRefs = this.createReferences(replyEvent.id, {
                            root: context.root,
                            parent: eventId
                        });
                        await this.fileService.saveNote(replyEvent, {
                            references: replyRefs,
                            referencedBy: []
                        });
                    }
                }
            }

            const effectiveLimit = limit || this.settings.thread.limit;
            const processedReplies = Math.min(context.replies?.length || 0, effectiveLimit);
            new Notice(`Thread processed with ${processedReplies} replies (limited to ${effectiveLimit})`);
        } catch (error) {
            console.error('Error in thread fetch:', error);
            new Notice(`Error fetching thread: ${error.message}`);
        }
    }

    async fetchAuthorThreads(authorId: string, limit?: number): Promise<void> {
        try {
            // Validate author ID
            if (!ValidationService.validateHex(authorId)) {
                new Notice('Invalid author ID format');
                return;
            }

            // First fetch all notes from the author
            const authorNotes = await this.unifiedFetchProcessor.fetchWithOptions({
                kinds: [EventKinds.NOTE],
                limit: limit || this.settings.thread.limit,
                author: authorId
            });

            if (!authorNotes.length) {
                new Notice('No notes found for author');
                return;
            }

            // Set total for progress tracking
            this.progress.total = authorNotes.length;
            new Notice(`Found ${authorNotes.length} notes. Fetching threads...`);

            // Process each note's thread
            for (const note of authorNotes) {
                try {
                    await this.fetchSingleThread(note.id);
                    this.updateProgress(true);
                } catch (error) {
                    console.error(`Error fetching thread for note ${note.id}:`, error);
                    this.updateProgress(false);
                }
            }

            new Notice(`Thread fetch complete: ${this.progress.succeeded} succeeded, ${this.progress.failed} failed`);
        } catch (error) {
            console.error('Error in author thread fetch:', error);
            new Notice(`Error fetching author threads: ${error.message}`);
        }
    }

    private async processBatch(batch: string[], maxRetries: number = 3): Promise<void> {
        // Process multiple threads in parallel
        const promises = batch.map(async (eventId) => {
            let retries = 0;
            while (retries < maxRetries) {
                try {
                    await this.fetchSingleThread(eventId);
                    this.updateProgress(true);
                    return;
                } catch (error) {
                    retries++;
                    if (retries === maxRetries) {
                        console.error(`Failed to process event ${eventId} after ${maxRetries} retries:`, error);
                        this.updateProgress(false);
                    } else {
                        // Wait before retrying (exponential backoff)
                        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
                    }
                }
            }
        });

        // Wait for all threads in batch to complete
        await Promise.all(promises);
    }

    async fetchVaultThreads(batchSize?: number): Promise<void> {
        try {
            // Reset progress
            this.resetProgress();

            // Get all unfetched referenced event IDs
            const unfetchedIds = await this.getUnfetchedReferences();

            if (!unfetchedIds.length) {
                new Notice('No unfetched references found');
                return;
            }

            // Set total for progress tracking
            this.progress.total = unfetchedIds.length;
            const effectiveBatchSize = batchSize || this.settings.thread.limit;
            new Notice(`Found ${unfetchedIds.length} unfetched references. Fetching in batches of ${effectiveBatchSize}...`);

            // Calculate optimal number of concurrent batches based on available references
            const concurrentBatches = Math.min(
                Math.ceil(unfetchedIds.length / effectiveBatchSize),
                3 // Maximum concurrent batches
            );

            // Process events in parallel batches
            for (let i = 0; i < unfetchedIds.length; i += (effectiveBatchSize * concurrentBatches)) {
                const batchPromises = [];
                
                // Create concurrent batch promises
                for (let j = 0; j < concurrentBatches; j++) {
                    const start = i + (j * effectiveBatchSize);
                    const batch = unfetchedIds.slice(start, start + effectiveBatchSize);
                    if (batch.length > 0) {
                        batchPromises.push(this.processBatch(batch));
                    }
                }

                // Wait for all concurrent batches to complete
                await Promise.all(batchPromises);

                // Add a small delay between batch groups to avoid overwhelming relays
                if (i + (effectiveBatchSize * concurrentBatches) < unfetchedIds.length) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }

                // Update progress notice
                new Notice(
                    `Processing threads: ${this.progress.processed}/${this.progress.total}\n` +
                    `Succeeded: ${this.progress.succeeded}\n` +
                    `Failed: ${this.progress.failed}`
                );
            }

            new Notice(
                `Thread fetch complete:\n` +
                `Total processed: ${this.progress.processed}\n` +
                `Succeeded: ${this.progress.succeeded}\n` +
                `Failed: ${this.progress.failed}`
            );
        } catch (error) {
            console.error('Error in vault thread fetch:', error);
            new Notice(`Error fetching vault threads: ${error.message}`);
        }
    }

    async fetchWithOptions(options: ThreadFetchOptions): Promise<void> {
        this.resetProgress();

        switch (options.mode) {
            case ThreadFetchMode.SINGLE:
                if (!options.eventId) {
                    throw new Error('Event ID required for single thread fetch');
                }
                await this.fetchSingleThread(
                    options.eventId,
                    options.limit,
                    options.includeContext
                );
                break;

            case ThreadFetchMode.AUTHOR:
                if (!options.authorId) {
                    throw new Error('Author ID required for author thread fetch');
                }
                await this.fetchAuthorThreads(
                    options.authorId,
                    options.limit
                );
                break;

            case ThreadFetchMode.VAULT:
                await this.fetchVaultThreads(
                    options.batchSize
                );
                break;

            default:
                throw new Error(`Unknown thread fetch mode: ${options.mode}`);
        }
    }
}
