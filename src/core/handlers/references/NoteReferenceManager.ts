import { NostrEvent, Reference } from '../../../types';
import { IReferenceManager } from '../../interfaces/IReferenceManager';
import { TagProcessor } from '../../../services/tags/tag-processor';
import { ReferenceStore } from '../../../services/references/reference-store';

export class NoteReferenceManager implements IReferenceManager {
    constructor(
        private tagProcessor: TagProcessor,
        private referenceStore: ReferenceStore
    ) {}

    processReferences(event: NostrEvent) {
        const references = this.tagProcessor.processEventTags(event);
        this.referenceStore.addReferences(event.id, references);
        
        return {
            outgoing: this.referenceStore.getOutgoingReferences(event.id),
            incoming: this.referenceStore.getIncomingReferences(event.id)
        };
    }

    reset(): void {
        this.referenceStore.clear();
    }
}
