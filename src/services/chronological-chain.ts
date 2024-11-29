import { NoteFile } from '../types';

export class ChronologicalNoteChain {
    private notes: Map<string, NoteFile>;  // id -> note
    private chronologicalOrder: string[];   // ordered list of note ids
    private authorChains: Map<string, string[]>;  // pubkey -> ordered list of note ids

    constructor() {
        this.notes = new Map();
        this.chronologicalOrder = [];
        this.authorChains = new Map();
    }

    /**
     * Insert a note into the chain, maintaining chronological order
     * and updating links appropriately
     */
    insertNote(note: NoteFile): { 
        prevNote?: NoteFile,    // note that comes before in time
        nextNote?: NoteFile     // note that comes after in time
    } {
        // Store the note
        this.notes.set(note.id, note);

        // Find insertion point in chronological order
        let insertIndex = this.chronologicalOrder.findIndex(id => {
            const existingNote = this.notes.get(id);
            return existingNote && existingNote.created_at > note.created_at;
        });

        if (insertIndex === -1) {
            // Add to end if it's the newest
            insertIndex = this.chronologicalOrder.length;
        }

        // Insert into chronological order
        this.chronologicalOrder.splice(insertIndex, 0, note.id);

        // Get adjacent notes
        const prevNote = insertIndex > 0 ? 
            this.notes.get(this.chronologicalOrder[insertIndex - 1]) : undefined;
        const nextNote = insertIndex < this.chronologicalOrder.length - 1 ? 
            this.notes.get(this.chronologicalOrder[insertIndex + 1]) : undefined;

        // Update author's chain
        let authorNotes = this.authorChains.get(note.pubkey) || [];
        const authorInsertIndex = authorNotes.findIndex(id => {
            const existingNote = this.notes.get(id);
            return existingNote && existingNote.created_at > note.created_at;
        });

        if (authorInsertIndex === -1) {
            authorNotes.push(note.id);
        } else {
            authorNotes.splice(authorInsertIndex, 0, note.id);
        }
        this.authorChains.set(note.pubkey, authorNotes);

        return { prevNote, nextNote };
    }

    /**
     * Get a note by its ID
     */
    getNote(id: string): NoteFile | undefined {
        return this.notes.get(id);
    }

    /**
     * Get all notes for an author in chronological order
     */
    getAuthorNotes(pubkey: string): NoteFile[] {
        const noteIds = this.authorChains.get(pubkey) || [];
        return noteIds.map(id => this.notes.get(id)).filter(note => note) as NoteFile[];
    }

    /**
     * Get all notes in chronological order
     */
    getAllNotes(): NoteFile[] {
        return this.chronologicalOrder.map(id => this.notes.get(id)).filter(note => note) as NoteFile[];
    }

    /**
     * Get the previous note in the chain for a given note
     */
    getPreviousNote(noteId: string): NoteFile | undefined {
        const index = this.chronologicalOrder.indexOf(noteId);
        if (index > 0) {
            return this.notes.get(this.chronologicalOrder[index - 1]);
        }
        return undefined;
    }

    /**
     * Get the next note in the chain for a given note
     */
    getNextNote(noteId: string): NoteFile | undefined {
        const index = this.chronologicalOrder.indexOf(noteId);
        if (index !== -1 && index < this.chronologicalOrder.length - 1) {
            return this.notes.get(this.chronologicalOrder[index + 1]);
        }
        return undefined;
    }

    /**
     * Get the previous note by the same author
     */
    getPreviousAuthorNote(noteId: string): NoteFile | undefined {
        const note = this.notes.get(noteId);
        if (!note) return undefined;

        const authorNotes = this.authorChains.get(note.pubkey) || [];
        const index = authorNotes.indexOf(noteId);
        if (index > 0) {
            return this.notes.get(authorNotes[index - 1]);
        }
        return undefined;
    }

    /**
     * Get the next note by the same author
     */
    getNextAuthorNote(noteId: string): NoteFile | undefined {
        const note = this.notes.get(noteId);
        if (!note) return undefined;

        const authorNotes = this.authorChains.get(note.pubkey) || [];
        const index = authorNotes.indexOf(noteId);
        if (index !== -1 && index < authorNotes.length - 1) {
            return this.notes.get(authorNotes[index + 1]);
        }
        return undefined;
    }

    /**
     * Check if a note is the latest in its author's chain
     */
    isLatestAuthorNote(noteId: string): boolean {
        const note = this.notes.get(noteId);
        if (!note) return false;

        const authorNotes = this.authorChains.get(note.pubkey) || [];
        return authorNotes[authorNotes.length - 1] === noteId;
    }

    /**
     * Check if a note is the latest in the overall chain
     */
    isLatestNote(noteId: string): boolean {
        return this.chronologicalOrder[this.chronologicalOrder.length - 1] === noteId;
    }
}
