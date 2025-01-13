import { NostrEvent } from '../types';

interface ReferenceLinks {
    previous?: string;
    next?: string;
}

export class NoteReferenceManager {
    private referenceMap: Map<string, ReferenceLinks> = new Map();

    processEventReferences(event: NostrEvent): void {
        // Get all 'e' tags which represent references to other events
        const references = event.tags
            .filter(t => t[0] === 'e')
            .map(t => t[1]);
            
        if (references.length === 0) return;

        // Process each reference based on tag relationships
        references.forEach(refId => {
            // Current event references the previous one
            this.referenceMap.set(event.id, {
                ...this.referenceMap.get(event.id),
                previous: refId
            });

            // Previous event is referenced by the current one
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

    // Helper method to check if an event has references
    hasReferences(id: string): boolean {
        const refs = this.referenceMap.get(id);
        return refs !== undefined && (refs.previous !== undefined || refs.next !== undefined);
    }

    // Get all events that reference this event
    getReferencingEvents(id: string): string[] {
        const referencingEvents: string[] = [];
        this.referenceMap.forEach((links, eventId) => {
            if (links.previous === id) {
                referencingEvents.push(eventId);
            }
        });
        return referencingEvents;
    }

    // Get all events that this event references
    getReferencedEvents(id: string): string[] {
        const refs = this.referenceMap.get(id);
        return refs?.previous ? [refs.previous] : [];
    }
}
