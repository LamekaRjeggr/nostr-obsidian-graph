import { RelayService } from '../core/relay-service';
import { EventService } from '../core/event-service';
import { FileService } from '../core/file-service';
import { EventKinds } from '../core/base-event-handler';
import { Notice, App } from 'obsidian';
import { ThreadFetcher } from '../thread/thread-fetcher';
import { NostrSettings } from '../../types';

export class MentionedNoteFetcher {
    private threadFetcher: ThreadFetcher;

    constructor(
        private relayService: RelayService,
        private eventService: EventService,
        private fileService: FileService,
        private app: App,
        private settings: NostrSettings
    ) {
        this.threadFetcher = new ThreadFetcher(relayService, eventService, settings);
    }

    async fetchMentionedNotes() {
        try {
            // Get current file
            const activeFile = this.app.workspace.getActiveFile();
            if (!activeFile) {
                new Notice('No active file');
                return;
            }

            // Get file metadata
            const cache = this.app.metadataCache.getFileCache(activeFile);
            if (!cache?.frontmatter?.nostr_tags) {
                new Notice('No nostr_tags found in current file');
                return;
            }

            // Collect "e" tags from current file
            const mentionedNoteIds = new Set<string>();
            for (const tag of cache.frontmatter.nostr_tags) {
                if (Array.isArray(tag) && tag[0] === 'e' && tag[1]) {
                    mentionedNoteIds.add(tag[1]);
                }
            }

            if (mentionedNoteIds.size === 0) {
                new Notice('No mentioned notes found in current file');
                return;
            }

            new Notice(`Processing ${mentionedNoteIds.size} threads...`);

            // Process each mentioned note as a thread
            let processedCount = 0;
            for (const noteId of mentionedNoteIds) {
                try {
                    // Fetch and process the thread context
                    await this.threadFetcher.processThreadEvent(await this.fetchEvent(noteId));
                    processedCount++;
                } catch (error) {
                    console.error(`Error processing thread ${noteId}:`, error);
                    continue;
                }
            }

            new Notice(`Processed ${processedCount} threads`);
        } catch (error) {
            console.error('Error fetching mentioned notes:', error);
            new Notice('Error fetching mentioned notes');
        }
    }

    private async fetchEvent(id: string) {
        const filter = {
            kinds: [EventKinds.NOTE],
            ids: [id]
        };

        const events = await this.relayService.subscribe([filter]);
        if (!events.length) {
            throw new Error(`Event ${id} not found`);
        }
        return events[0];
    }
}
