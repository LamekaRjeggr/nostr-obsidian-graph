import { NostrEvent, Reference } from '../../types';

export interface IReferenceManager {
    processReferences(event: NostrEvent): {
        outgoing: Reference[];
        incoming: Reference[];
    };
    reset(): void;
}
