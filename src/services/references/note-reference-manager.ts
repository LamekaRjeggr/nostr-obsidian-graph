import { NostrEvent } from '../../types';

interface ReferenceLinks {
    previous?: string;
    next?: string;
}

export class NoteReferenceManager {
    private referenceMap: Map<string, ReferenceLinks> = new Map();

    processEventReferences(event: NostrEvent): void {
        const references = event.tags
            .filter(t => t[0] === 'e')
            .map(t => t[1]);
            
        if (references.length === 0) return;

        references.forEach(refId => {
            this.referenceMap.set(event.id, {
                ...this.referenceMap.get(event.id),
                previous: refId
            });

            this.referenceMap.set(refId, {
                ...this.referenceMap.get(refId),
                next: event.id
            });
        });
    }

    getEventReferences(id: string): ReferenceLinks {
        return this.referenceMap.get(id) || {};
    }

    resetReferences(): void {
        this.referenceMap.clear();
    }

    hasReferences(id: string): boolean {
        const refs = this.referenceMap.get(id);
        return refs !== undefined && (refs.previous !== undefined || refs.next !== undefined);
    }

    getReferencingEvents(id: string): string[] {
        const referencingEvents: string[] = [];
        this.referenceMap.forEach((links, eventId) => {
            if (links.previous === id) {
                referencingEvents.push(eventId);
            }
        });
        return referencingEvents;
    }

    getReferencedEvents(id: string): string[] {
        const refs = this.referenceMap.get(id);
        return refs?.previous ? [refs.previous] : [];
    }
}
