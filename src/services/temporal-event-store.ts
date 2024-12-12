import { NostrEvent, ProfileStats } from '../types';
import { NoteReferenceManager } from './note-reference-manager';

export class TemporalEventStore {
    private eventCollection: Map<string, NostrEvent> = new Map();
    private chronologicalIndex: string[] = [];
    private referenceManager: NoteReferenceManager;
    private profileStats: Map<string, ProfileStats> = new Map();

    constructor() {
        this.referenceManager = new NoteReferenceManager();
    }

    storeEvent(event: NostrEvent): void {
        if (this.eventCollection.has(event.id)) return;
        
        this.eventCollection.set(event.id, event);
        this.insertIntoChronology(event);
        this.updateProfileStats(event);
        
        if (event.tags?.some(t => t[0] === 'e')) {
            this.referenceManager.processEventReferences(event);
        }
    }

    private updateProfileStats(event: NostrEvent): void {
        const stats = this.profileStats.get(event.pubkey) || {
            noteCount: 0,
            oldestNote: event.created_at,
            newestNote: event.created_at
        };

        stats.noteCount++;
        stats.oldestNote = Math.min(stats.oldestNote!, event.created_at);
        stats.newestNote = Math.max(stats.newestNote!, event.created_at);
        
        this.profileStats.set(event.pubkey, stats);
    }

    private insertIntoChronology(event: NostrEvent): void {
        const position = this.chronologicalIndex.findIndex(id => {
            const existing = this.eventCollection.get(id);
            return existing && existing.created_at < event.created_at;
        });

        if (position === -1) {
            this.chronologicalIndex.push(event.id);
        } else {
            this.chronologicalIndex.splice(position, 0, event.id);
        }
    }

    getRecentEvents(limit?: number): NostrEvent[] {
        const selectedIds = limit ? 
            this.chronologicalIndex.slice(0, limit) : 
            this.chronologicalIndex;
        return selectedIds
            .map(id => this.eventCollection.get(id))
            .filter((e): e is NostrEvent => !!e);
    }

    getEventById(id: string): NostrEvent | undefined {
        return this.eventCollection.get(id);
    }

    getConnectedEvents(id: string): {
        precedingEvent?: NostrEvent, 
        subsequentEvent?: NostrEvent
    } {
        const references = this.referenceManager.getEventReferences(id);
        return {
            precedingEvent: references.previous ? 
                this.eventCollection.get(references.previous) : 
                undefined,
            subsequentEvent: references.next ? 
                this.eventCollection.get(references.next) : 
                undefined
        };
    }

    getProfileStats(pubkey: string): ProfileStats | undefined {
        return this.profileStats.get(pubkey);
    }

    getEventCount(): number {
        return this.eventCollection.size;
    }

    resetStore(): void {
        this.eventCollection.clear();
        this.chronologicalIndex = [];
        this.referenceManager.resetReferences();
        this.profileStats.clear();
    }
}
