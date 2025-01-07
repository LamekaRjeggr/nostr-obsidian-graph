import { NostrEvent } from '../../interfaces';
import { IIndexService } from '../../interfaces';
import { IObsidianFileService } from './obsidian-file.service';
import { FilenameService } from '../core/filename.service';
import { FrontmatterService } from '../core/frontmatter.service';
import { TFile } from 'obsidian';

export interface INoteFileService {
    saveNote(event: NostrEvent): Promise<void>;
    getNote(id: string): Promise<NostrEvent>;
}

export class NoteFileService implements INoteFileService {
    private readonly notesDir = 'nostr/user notes';

    constructor(
        private obsidianFileService: IObsidianFileService,
        private indexService: IIndexService
    ) {}

    async saveNote(event: NostrEvent): Promise<void> {
        if (event.kind !== 1) {
            throw new Error('Not a note event');
        }

        try {
            const filename = FilenameService.generateNoteFilename(event);
            const filepath = `${this.notesDir}/${filename}.md`;

            // Create frontmatter with metadata
            const noteFrontmatter = FrontmatterService.createBaseFrontmatter(event);

            // Get display name from profile's frontmatter
            const profileFrontmatter = this.obsidianFileService.getProfileFrontmatter(event.pubkey);
            const displayName = profileFrontmatter?.display_name;
            
            const markdown = [
                this.obsidianFileService.createFrontmatter(noteFrontmatter),
                '',
                event.content,
                '',
                displayName ? `Author: [${displayName}](${displayName}.md)\n` : '',
                '---',
                '> [!note]- Raw Event JSON',
                '> ```json',
                `> ${JSON.stringify(event, null, 2).split('\n').join('\n> ')}`,
                '> ```'
            ].join('\n');

            await this.obsidianFileService.createOrUpdateFile(filepath, markdown);
        } catch (error) {
            console.error('Failed to save note:', error);
            throw error;
        }
    }

    async getNote(id: string): Promise<NostrEvent> {
        const files = await this.indexService.findEventsByKind(1);
        for (const file of files) {
            const content = await this.obsidianFileService.readFile(file);
            const frontmatter = this.obsidianFileService.getFrontmatter(content);
            if (frontmatter?.id === id) {
                const noteContent = content.split('\n---\n')[1]?.trim() || '';
                return FrontmatterService.createEventFromFrontmatter(frontmatter, noteContent);
            }
        }
        throw new Error(`Note not found: ${id}`);
    }
}
