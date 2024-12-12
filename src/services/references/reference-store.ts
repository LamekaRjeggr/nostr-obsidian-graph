import { TagReference, TagType } from '../../types';

interface ReferenceMap {
    [key: string]: {
        outgoing: TagReference[];  // References to other notes
        incoming: TagReference[];  // References from other notes
    };
}

export class ReferenceStore {
    private references: ReferenceMap = {};

    addReference(fromId: string, reference: TagReference): void {
        // Initialize if needed
        if (!this.references[fromId]) {
            this.references[fromId] = { outgoing: [], incoming: [] };
        }
        if (!this.references[reference.targetId]) {
            this.references[reference.targetId] = { outgoing: [], incoming: [] };
        }

        // Add outgoing reference
        this.references[fromId].outgoing.push(reference);

        // Add incoming reference
        this.references[reference.targetId].incoming.push({
            ...reference,
            targetId: fromId  // Flip the reference
        });
    }

    addReferences(fromId: string, references: TagReference[]): void {
        references.forEach(ref => this.addReference(fromId, ref));
    }

    getOutgoingReferences(noteId: string): TagReference[] {
        return this.references[noteId]?.outgoing || [];
    }

    getIncomingReferences(noteId: string): TagReference[] {
        return this.references[noteId]?.incoming || [];
    }

    getAllMentions(): string[] {
        const mentions = new Set<string>();
        
        Object.values(this.references).forEach(refs => {
            refs.outgoing
                .filter(ref => ref.type === TagType.MENTION)
                .forEach(ref => mentions.add(ref.targetId));
        });

        return Array.from(mentions);
    }

    getThreadContext(noteId: string): {
        root?: string;
        replies: string[];
        mentions: string[];
    } {
        const outgoing = this.getOutgoingReferences(noteId);
        const incoming = this.getIncomingReferences(noteId);

        // Find root and reply references
        const root = outgoing.find(ref => 
            ref.type === TagType.REPLY && ref.marker === 'root'
        )?.targetId;

        // Get all replies to this note
        const replies = incoming
            .filter(ref => ref.type === TagType.REPLY)
            .map(ref => ref.targetId);

        // Get all mentions of this note
        const mentions = incoming
            .filter(ref => ref.type === TagType.MENTION)
            .map(ref => ref.targetId);

        return { root, replies, mentions };
    }

    getReferencesByType(noteId: string, type: TagType): {
        outgoing: TagReference[];
        incoming: TagReference[];
    } {
        const outgoing = this.getOutgoingReferences(noteId)
            .filter(ref => ref.type === type);
        const incoming = this.getIncomingReferences(noteId)
            .filter(ref => ref.type === type);
        return { outgoing, incoming };
    }

    clear(): void {
        this.references = {};
    }

    clearNote(noteId: string): void {
        if (this.references[noteId]) {
            delete this.references[noteId];
        }
    }
}
