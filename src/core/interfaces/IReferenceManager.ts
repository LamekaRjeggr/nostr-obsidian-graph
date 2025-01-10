import { NostrEvent, Reference } from '../../types';

export interface IReferenceManager {
    processReferences(event: NostrEvent): Promise<{
        outgoing: Reference[];
        incoming: Reference[];
    }>;
    reset(): void;
}
