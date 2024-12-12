import { NostrEvent } from '../../types';

export interface IEventValidator {
    validate(event: NostrEvent): boolean;
}
