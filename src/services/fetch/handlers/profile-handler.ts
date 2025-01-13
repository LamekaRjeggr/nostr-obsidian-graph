import { NostrEvent, ProfileData } from '../../../types';
import { EventService } from '../../../services/core/event-service';
import { FileService } from '../../../services/core/file-service';
import { BaseEventHandler, EventKinds, ProcessingPriority } from '../../../services/core/base-event-handler';
import { ValidationService } from '../../../services/validation-service';
import { Notice } from 'obsidian';

export class ProfileEventHandler extends BaseEventHandler {
    private processedProfiles: Set<string> = new Set();

    constructor(
        eventService: EventService,
        private fileService: FileService
    ) {
        super(eventService, EventKinds.METADATA, ProcessingPriority.PROFILE);
    }

    async process(event: NostrEvent): Promise<void> {
        // Use specialized profile event validation
        if (!ValidationService.validateProfileEvent(event)) {
            console.error('Invalid profile event');
            new Notice('Invalid profile event received');
            return;
        }

        try {
            // Skip if we've already processed a newer event for this profile
            if (this.processedProfiles.has(event.pubkey)) {
                return;
            }

            const metadata = JSON.parse(event.content);
            const profile: ProfileData = {
                pubkey: event.pubkey,
                displayName: metadata.display_name || metadata.name,
                name: metadata.name,
                about: metadata.about,
                picture: metadata.picture,
                nip05: metadata.nip05
            };

            await this.fileService.saveProfile(profile);
            this.processedProfiles.add(event.pubkey);
            this.eventService.emitProfile(event);
            this.eventService.emitStateChange(true);
        } catch (error) {
            console.error('Error processing profile:', error);
            new Notice('Error processing profile event');
        }
    }

    async cleanup(): Promise<void> {
        try {
            // Reset internal state
            this.processedProfiles.clear();
            
            // Notify event service that processing is complete
            this.eventService.emitStateChange(false);
            
            // Log cleanup for debugging
            console.debug('Profile handler cleanup complete');
        } catch (error) {
            console.error('Error during profile handler cleanup:', error);
            new Notice('Error cleaning up profile handler');
        }
    }

    reset(): void {
        this.processedProfiles.clear();
    }
}
