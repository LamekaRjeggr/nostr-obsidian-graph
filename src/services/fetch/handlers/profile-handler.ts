import { NostrEvent, ProfileData } from '../../../types';
import { EventService } from '../../../services/core/event-service';
import { FileService } from '../../../services/core/file-service';
import { BaseEventHandler, EventKinds, ProcessingPriority } from '../../../services/core/base-event-handler';

export class ProfileEventHandler extends BaseEventHandler {
    constructor(
        eventService: EventService,
        private fileService: FileService
    ) {
        super(eventService, EventKinds.METADATA, ProcessingPriority.PROFILE);
    }

    async process(event: NostrEvent): Promise<void> {
        if (!this.validate(event)) return;

        try {
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
            this.eventService.emitProfile(event);
        } catch (error) {
            console.error('Error processing profile:', error);
        }
    }
}
