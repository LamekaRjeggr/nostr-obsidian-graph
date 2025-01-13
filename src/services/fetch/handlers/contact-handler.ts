import { NostrEvent } from '../../../types';
import { EventService } from '../../../services/core/event-service';
import { BaseEventHandler, EventKinds, ProcessingPriority } from '../../../services/core/base-event-handler';
import { ValidationService } from '../../../services/validation-service';
import { Notice } from 'obsidian';

export class ContactEventHandler extends BaseEventHandler {
    private contacts: Set<string> = new Set();
    private latestTimestamp: number = 0;

    constructor(eventService: EventService) {
        super(eventService, EventKinds.CONTACT, ProcessingPriority.CONTACT);
    }

    async process(event: NostrEvent): Promise<void> {
        // Use specialized contact event validation
        if (!ValidationService.validateContactEvent(event)) {
            console.error('Invalid contact event');
            new Notice('Invalid contact event received');
            return;
        }
        
        try {
            // Only update contacts if this is a newer event
            if (event.created_at > this.latestTimestamp) {
                this.latestTimestamp = event.created_at;
                this.contacts.clear();
                event.tags
                    .filter(tag => tag[0] === 'p')
                    .forEach(tag => this.contacts.add(tag[1]));
                
                this.eventService.emitStateChange(true);
            }
        } catch (error) {
            console.error('Error processing contact event:', error);
            new Notice('Error processing contact event');
        }
    }

    getContacts(): string[] {
        return Array.from(this.contacts);
    }

    reset(): void {
        this.contacts.clear();
        this.latestTimestamp = 0;
    }

    async cleanup(): Promise<void> {
        try {
            // Reset internal state
            this.reset();
            
            // Notify event service that processing is complete
            this.eventService.emitStateChange(false);
            
            // Log cleanup for debugging
            console.debug('Contact handler cleanup complete');
        } catch (error) {
            console.error('Error during contact handler cleanup:', error);
            new Notice('Error cleaning up contact handler');
        }
    }
}
