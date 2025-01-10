import { NostrEvent } from '../../types';

export interface ITemporalManager {
    processTemporalOrder(event: NostrEvent): {
        precedingEvent?: NostrEvent;
        subsequentEvent?: NostrEvent;
    };
    reset(): void;
}
