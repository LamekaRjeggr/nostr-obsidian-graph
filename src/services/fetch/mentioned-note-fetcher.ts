import { RelayService } from '../core/relay-service';
import { EventService } from '../core/event-service';
import { FileService } from '../core/file-service';
import { EventKinds } from '../core/base-event-handler';
import { Notice, App, TFile } from 'obsidian';

export class MentionedNoteFetcher {
    constructor(
        private relayService: RelayService,
        private eventService: EventService,
        private fileService: FileService,
        private app: App
    ) {}

    async fetchMentionedNotes() {
        try {
            // Ensure directories exist
            await this.fileService.ensureDirectories();

            // Collect all "e" tags from notes
            const mentionedNoteIds = new Set<string>();
            
            // Process files in notes directory
            const processDirectory = async (directory: string) => {
                const files = this.app.vault.getFiles()
                    .filter(file => file.path.startsWith(directory));

                for (const file of files) {
                    const cache = this.app.metadataCache.getFileCache(file);
                    if (!cache?.frontmatter?.nostr_tags) continue;

                    // Look for "e" tags in nostr_tags
                    for (const tag of cache.frontmatter.nostr_tags) {
                        if (Array.isArray(tag) && tag[0] === 'e' && tag[1]) {
                            mentionedNoteIds.add(tag[1]);
                        }
                    }
                }
            };

            // Process both notes and replies directories
            await processDirectory('nostr/notes');
            await processDirectory('nostr/replies');

            if (mentionedNoteIds.size === 0) {
                new Notice('No mentioned notes found');
                return;
            }

            new Notice(`Fetching ${mentionedNoteIds.size} mentioned notes...`);

            // Create filter for mentioned notes
            const filter = {
                kinds: [EventKinds.NOTE],
                ids: Array.from(mentionedNoteIds)
            };

            // Fetch the notes
            const events = await this.relayService.subscribe([filter]);
            
            // Process each note event
            for (const event of events) {
                this.eventService.emitNote(event);
            }

            new Notice(`Fetched ${events.length} mentioned notes`);
        } catch (error) {
            console.error('Error fetching mentioned notes:', error);
            new Notice('Error fetching mentioned notes');
        }
    }
}
