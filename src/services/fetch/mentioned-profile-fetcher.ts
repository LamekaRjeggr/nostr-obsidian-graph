import { RelayService } from '../core/relay-service';
import { EventService } from '../core/event-service';
import { ProfileManagerService } from '../profile/profile-manager-service';
import { FileService } from '../core/file-service';
import { EventKinds } from '../core/base-event-handler';

export class MentionedProfileFetcher {
    constructor(
        private relayService: RelayService,
        private eventService: EventService,
        private profileManager: ProfileManagerService,
        private fileService: FileService
    ) {}

    async fetchMentionedProfiles(mentions: string[]) {
        const uniquePubkeys = [...new Set(mentions)];
        
        const filter = {
            kinds: [EventKinds.METADATA],
            authors: uniquePubkeys
        };

        const events = await this.relayService.subscribe([filter]);
        
        // Process each profile event
        for (const event of events) {
            // First emit the profile event for normal processing
            this.eventService.emitProfile(event);
            
            // After processing, move the profile to mentions directory
            const metadata = JSON.parse(event.content);
            await this.fileService.moveProfileToMentions(event.pubkey, metadata.name);
        }
    }
}
