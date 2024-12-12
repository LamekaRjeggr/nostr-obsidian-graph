import { NostrEvent } from '../../../types';
import { IEventValidator } from '../../interfaces/IEventValidator';
import { EventKinds } from '../../../services/core/base-event-handler';

export class NoteEventValidator implements IEventValidator {
    validate(event: NostrEvent): boolean {
        return Boolean(
            event &&
            event.id &&
            event.kind === EventKinds.NOTE &&
            event.content &&
            event.pubkey &&
            event.created_at
        );
    }
}
