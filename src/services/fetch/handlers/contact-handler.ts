import { NostrEvent } from '../../../types';
import { EventService } from '../../../services/core/event-service';
import { BaseEventHandler, EventKinds, ProcessingPriority } from '../../../services/core/base-event-handler';

export class ContactEventHandler extends BaseEventHandler {
    private contacts: Set<string> = new Set();
    private latestTimestamp: number = 0;

    constructor(eventService: EventService) {
        super(eventService, EventKinds.CONTACT, ProcessingPriority.CONTACT);
    }

    async process(event: NostrEvent): Promise<void> {
        if (!this.validate(event)) return;
        
        // Only update contacts if this is a newer event
        if (event.created_at > this.latestTimestamp) {
            this.latestTimestamp = event.created_at;
            this.contacts.clear();
            event.tags
                .filter(tag => tag[0] === 'p')
                .forEach(tag => this.contacts.add(tag[1]));
        }
    }

    getContacts(): string[] {
        return Array.from(this.contacts);
    }
}
