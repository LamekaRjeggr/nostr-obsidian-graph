import { NostrEvent, IIndexService } from '../../interfaces';
import { IObsidianFileService } from './obsidian-file.service';
import { FilenameService } from '../core/filename.service';
import { FrontmatterService } from '../core/frontmatter.service';
import { TFile } from 'obsidian';

export interface INoteFileService {
    saveNote(event: NostrEvent, targetDir?: string): Promise<void>;
    getNote(id: string): Promise<NostrEvent>;
}

export class NoteFileService implements INoteFileService {
    private readonly followsNotesDir = 'nostr/follows notes';
    private readonly notesDir = 'nostr/notes';
    private readonly profileDir = 'nostr/user profile';

    constructor(
        private obsidianFileService: IObsidianFileService,
        private indexService: IIndexService
    ) {}

    async saveNote(event: NostrEvent, targetDir?: string): Promise<void> {
        if (event.kind !== 1) {
            throw new Error('Not a note event');
        }

        try {
            const filename = FilenameService.generateNoteFilename(event);
            
            // If no target directory provided, determine based on follow status
            let saveDir = targetDir;
            if (!saveDir) {
                // Check if the note's author is in the user's follow list using metadata cache
                const followFiles = await this.indexService.findEventsByKind(3);
                const followEvents = await this.indexService.getEventsFromFiles(followFiles);
                const isFollowed = followEvents.some(followEvent => 
                    followEvent.tags.some(tag => tag[0] === 'p' && tag[1] === event.pubkey)
                );
                
                // Use appropriate directory based on whether author is followed
                saveDir = isFollowed ? this.followsNotesDir : this.notesDir;
            }
            const filepath = `${saveDir}/${filename}.md`;

            // Create frontmatter with metadata
            const noteFrontmatter = FrontmatterService.createBaseFrontmatter(event);

            // Get profile info for linking
            const profileFrontmatter = this.obsidianFileService.getProfileFrontmatter(event.pubkey);
            
            // Use standard Markdown link with pubkey as text and display name as target
            // This maintains security (pubkey visible) while using display name for navigation
            const displayName = profileFrontmatter?.display_name || event.pubkey;
            const authorLink = `[${event.pubkey}](${displayName}.md)`;
            
            // Create note content with secure Markdown link
            const contentParts = [
                this.obsidianFileService.createFrontmatter(noteFrontmatter),
                '',
                event.content,
                '',
                `Author: ${authorLink}`,
                '',
                '---',
                '> [!note]- Raw Event JSON',
                '> ```json',
                `> ${JSON.stringify(event, null, 2).split('\n').join('\n> ')}`,
                '> ```'
            ].filter(line => line !== '');

            const markdown = contentParts.join('\n');

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
