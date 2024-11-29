import { TFile, Vault } from 'obsidian';
import { NostrProfile, ProfileFile, NoteFile, FileOperationResult } from '../types';
import { NostrService } from '../core/nostr-service';
import { ChronologicalNoteChain } from './chronological-chain';

export class FileService {
    private vault: Vault;
    private profilesDir: string;
    private notesDir: string;
    private nostrService: NostrService;
    private noteChain: ChronologicalNoteChain;
    private likeHistory: Map<string, Array<{timestamp: number, count: number, likers: Set<string>}>>;

    constructor(
        vault: Vault, 
        nostrService: NostrService, 
        profilesDir: string = 'nostr/profiles', 
        notesDir: string = 'nostr/notes'
    ) {
        this.vault = vault;
        this.nostrService = nostrService;
        this.profilesDir = profilesDir;
        this.notesDir = notesDir;
        this.noteChain = new ChronologicalNoteChain();
        this.likeHistory = new Map();
    }

    async initialize(): Promise<void> {
        await this.ensureDirectories();
    }

    private async ensureDirectories(): Promise<void> {
        try {
            // Create parent directory if it doesn't exist
            const parentDir = this.profilesDir.split('/')[0];
            if (!(await this.vault.adapter.exists(parentDir))) {
                await this.vault.createFolder(parentDir);
            }

            // Create required directories
            const dirs = [this.profilesDir, this.notesDir];
            for (const dir of dirs) {
                if (!(await this.vault.adapter.exists(dir))) {
                    await this.vault.createFolder(dir);
                }
            }
        } catch (error) {
            // Ignore "folder already exists" errors
            if (!error.message?.includes('already exists')) {
                throw error;
            }
        }
    }

    private sanitizeFileName(name: string): string {
        // Replace invalid characters with safe alternatives
        return name.replace(/[\\/:*?"<>|]/g, '_');
    }

    private getDisplayName(pubkey: string): string {
        const profile = this.nostrService.getProfile(pubkey);
        return profile?.name || `Nostr User ${pubkey.substring(0, 8)}`;
    }

    async createOrUpdateProfileFile(profile: NostrProfile): Promise<string> {
        await this.ensureDirectories();

        const displayName = this.getDisplayName(profile.pubkey);
        const fileName = `${this.profilesDir}/${this.sanitizeFileName(displayName)}.md`;
        let existingProfileData: ProfileFile | null = null;

        // Try to read existing profile data
        if (await this.vault.adapter.exists(fileName)) {
            const file = this.vault.getAbstractFileByPath(fileName);
            if (file instanceof TFile) {
                const content = await this.vault.read(file);
                existingProfileData = this.parseProfileContent(content);
            }
        }

        const profileData: ProfileFile = {
            profile,
            noteIds: existingProfileData?.noteIds || [],
            connectionIds: existingProfileData?.connectionIds || [],
            lastUpdated: Date.now()
        };

        const content = this.formatProfileContent(profileData);
        await this.writeFile(fileName, content);
        return fileName;
    }

    async createOrUpdateNoteFile(note: NoteFile): Promise<string> {
        await this.ensureDirectories();

        // Insert note into chronological chain
        const { prevNote, nextNote } = this.noteChain.insertNote(note);

        // Get first sentence for title
        const firstSentence = this.getFirstSentence(note.content);
        const safeTitle = this.sanitizeFileName(firstSentence);
        const fileName = `${this.notesDir}/${safeTitle}.md`;

        const content = this.formatNoteContent(note, prevNote, nextNote);
        await this.writeFile(fileName, content);
        
        // Update profile's notes list
        await this.addNoteToProfile(note.pubkey, note.id);

        // If this note is inserted between existing notes, update their links
        if (prevNote) {
            await this.updateNoteLinks(prevNote, note, nextNote);
        }
        if (nextNote) {
            await this.updateNoteLinks(note, nextNote, this.noteChain.getNextNote(nextNote.id));
        }
        
        return fileName;
    }

    async addLike(noteId: string, likerPubkey: string, timestamp: number): Promise<void> {
        const note = this.noteChain.getNote(noteId);
        if (!note) {
            console.error('Cannot add like: Note not found:', noteId);
            return;
        }

        // Get or initialize like history for this note
        let history = this.likeHistory.get(noteId);
        if (!history) {
            history = [];
            this.likeHistory.set(noteId, history);
        }

        // Get latest entry or create new one
        let latest = history[history.length - 1];
        if (!latest) {
            latest = { timestamp: Date.now(), count: 0, likers: new Set() };
            history.push(latest);
        }

        // Add new liker
        if (!latest.likers.has(likerPubkey)) {
            latest.likers.add(likerPubkey);
            // Create new history entry when count changes
            latest = { timestamp: Date.now(), count: latest.likers.size, likers: new Set(latest.likers) };
            history.push(latest);
        }

        // Update the note file to show updated like history
        const { prevNote, nextNote } = this.noteChain.insertNote(note);
        const firstSentence = this.getFirstSentence(note.content);
        const safeTitle = this.sanitizeFileName(firstSentence);
        const fileName = `${this.notesDir}/${safeTitle}.md`;
        const content = this.formatNoteContent(note, prevNote, nextNote);
        await this.writeFile(fileName, content);
    }

    private async updateNoteLinks(prevNote: NoteFile, currentNote: NoteFile, nextNote?: NoteFile): Promise<void> {
        const firstSentence = this.getFirstSentence(prevNote.content);
        const safeTitle = this.sanitizeFileName(firstSentence);
        const fileName = `${this.notesDir}/${safeTitle}.md`;

        const content = this.formatNoteContent(prevNote, 
            this.noteChain.getPreviousNote(prevNote.id),
            currentNote);
        await this.writeFile(fileName, content);
    }

    private formatNoteContent(note: NoteFile, prevNote?: NoteFile, nextNote?: NoteFile): string {
        const firstSentence = this.getFirstSentence(note.content);
        const authorName = this.getDisplayName(note.pubkey);
        
        let content = '---\n';
        content += `id: ${note.id}\n`;
        content += `pubkey: ${note.pubkey}\n`;
        content += `created_at: ${note.created_at}\n`;
        content += '---\n\n';

        content += `# ${firstSentence}\n\n`;
        content += `${note.content}\n\n`;

        // Add chronological links
        content += '## Timeline\n';
        if (prevNote) {
            const prevTitle = this.getFirstSentence(prevNote.content);
            content += `Previous: [[${this.sanitizeFileName(prevTitle)}]]\n`;
        }
        if (nextNote) {
            const nextTitle = this.getFirstSentence(nextNote.content);
            content += `Next: [[${this.sanitizeFileName(nextTitle)}]]\n`;
        }
        content += '\n';

        // Add like history directly in note
        const history = this.likeHistory.get(note.id);
        content += '## Likes\n';
        if (history && history.length > 0) {
            // Show like count progression
            content += `Like history: ${history.map(entry => entry.count).join(', ')}\n\n`;
            
            // Show current likes
            const latest = history[history.length - 1];
            content += `Current likes: ${latest.count}\n\n`;
            
            // Show who liked
            content += '### Liked by\n';
            Array.from(latest.likers).forEach(pubkey => {
                const likerName = this.getDisplayName(pubkey);
                content += `- [[${this.sanitizeFileName(likerName)}]]\n`;
            });
            content += '\n';
        } else {
            content += 'No likes yet\n\n';
        }

        content += `## Author\n`;
        content += `- [[${this.sanitizeFileName(authorName)}]]\n\n`;

        if (note.mentions && note.mentions.length > 0) {
            content += '## Mentions\n';
            note.mentions.forEach(mention => {
                const mentionName = this.getDisplayName(mention);
                content += `- [[${this.sanitizeFileName(mentionName)}]]\n`;
            });
            content += '\n';
        }

        if (note.tags.length > 0) {
            content += '## Tags\n';
            note.tags.forEach(tag => {
                content += `- ${tag.join(': ')}\n`;
            });
        }

        return content;
    }

    private formatProfileContent(profileData: ProfileFile): string {
        const { profile, noteIds, connectionIds } = profileData;
        const displayName = this.getDisplayName(profile.pubkey);
        
        let content = '---\n';
        content += `pubkey: ${profile.pubkey}\n`;
        content += `name: ${displayName}\n`;
        content += `about: ${profile.about || ''}\n`;
        content += `picture: ${profile.picture || ''}\n`;
        content += `nip05: ${profile.nip05 || ''}\n`;
        content += `lastUpdated: ${profileData.lastUpdated}\n`;
        content += '---\n\n';

        content += `# ${displayName}\n\n`;
        
        if (profile.about) {
            content += `## About\n${profile.about}\n\n`;
        }

        // Add connection to central User node if this isn't the user's profile
        if (displayName !== 'User') {
            content += '## Follows\n';
            content += `- [[User]]\n\n`;
        }

        if (noteIds.length > 0) {
            content += '## Notes\n';
            // Get notes in chronological order
            const notes = noteIds
                .map(id => this.noteChain.getNote(id))
                .filter(note => note)
                .sort((a, b) => a!.created_at - b!.created_at);

            notes.forEach(note => {
                if (note) {
                    const title = this.getFirstSentence(note.content);
                    content += `- [[${this.sanitizeFileName(title)}]]\n`;
                }
            });
            content += '\n';
        }

        if (connectionIds.length > 0) {
            content += '## Connections\n';
            connectionIds.forEach((pubkey: string) => {
                const connectionName = this.getDisplayName(pubkey);
                content += `- [[${this.sanitizeFileName(connectionName)}]]\n`;
            });
            content += '\n';
        }

        return content;
    }

    private getFirstSentence(text: string): string {
        // Match text until first period, question mark, or exclamation mark followed by space or end
        const match = text.match(/^[^.!?]+[.!?](?:\s|$)/);
        if (match) {
            return match[0].trim();
        }
        // If no sentence ending found, return first 100 chars or full text if shorter
        const truncated = text.length > 100 ? text.substring(0, 100) + '...' : text;
        return truncated.trim();
    }

    private async writeFile(path: string, content: string): Promise<void> {
        try {
            // Ensure parent directories exist
            const pathParts = path.split('/');
            pathParts.pop(); // Remove filename
            const dirPath = pathParts.join('/');
            
            try {
                if (!(await this.vault.adapter.exists(dirPath))) {
                    await this.vault.createFolder(dirPath);
                }
            } catch (error) {
                // Ignore "folder already exists" errors
                if (!error.message?.includes('already exists')) {
                    throw error;
                }
            }

            if (await this.vault.adapter.exists(path)) {
                const file = this.vault.getAbstractFileByPath(path);
                if (file instanceof TFile) {
                    await this.vault.modify(file, content);
                }
            } else {
                await this.vault.create(path, content);
            }
        } catch (error) {
            // Ignore "file already exists" errors
            if (!error.message?.includes('already exists')) {
                console.error(`Error writing file ${path}:`, error);
                throw error;
            }
        }
    }

    private async addNoteToProfile(pubkey: string, noteId: string): Promise<void> {
        const displayName = this.getDisplayName(pubkey);
        const profilePath = `${this.profilesDir}/${this.sanitizeFileName(displayName)}.md`;
        
        try {
            // Create profile if it doesn't exist
            if (!(await this.vault.adapter.exists(profilePath))) {
                const profile: NostrProfile = {
                    pubkey: pubkey,
                    name: displayName
                };
                await this.createOrUpdateProfileFile(profile);
            }

            const file = this.vault.getAbstractFileByPath(profilePath);
            if (file instanceof TFile) {
                const content = await this.vault.read(file);
                const profileData = this.parseProfileContent(content);
                
                if (!profileData.noteIds.includes(noteId)) {
                    profileData.noteIds.push(noteId);
                    profileData.lastUpdated = Date.now();
                    await this.writeFile(profilePath, this.formatProfileContent(profileData));
                }
            }
        } catch (error) {
            // Ignore "file already exists" errors
            if (!error.message?.includes('already exists')) {
                console.error(`Error updating profile ${pubkey} with note ${noteId}:`, error);
                throw error;
            }
        }
    }

    private parseProfileContent(content: string): ProfileFile {
        // Basic parsing of the frontmatter
        const frontMatterMatch = content.match(/---\n([\s\S]*?)\n---/);
        const frontMatter = frontMatterMatch ? frontMatterMatch[1] : '';
        
        const profile: NostrProfile = {
            pubkey: this.extractValue(frontMatter, 'pubkey') || '',
            name: this.extractValue(frontMatter, 'name'),
            about: this.extractValue(frontMatter, 'about'),
            picture: this.extractValue(frontMatter, 'picture'),
            nip05: this.extractValue(frontMatter, 'nip05')
        };

        // Extract notes and connections from content
        const noteIds = this.extractLinks(content, this.notesDir);
        const connectionIds = this.extractLinks(content, this.profilesDir);

        return {
            profile,
            noteIds,
            connectionIds,
            lastUpdated: parseInt(this.extractValue(frontMatter, 'lastUpdated') || '0')
        };
    }

    private extractValue(content: string, key: string): string | undefined {
        const match = content.match(new RegExp(`${key}: (.*)`, 'm'));
        return match ? match[1].trim() : undefined;
    }

    private extractLinks(content: string, directory: string): string[] {
        const links = new Set<string>();
        const linkRegex = /\[\[(.*?)\]\]/g;
        let match;

        while ((match = linkRegex.exec(content)) !== null) {
            const link = match[1].trim();
            if (link) {
                links.add(link);
            }
        }

        return Array.from(links);
    }
}
