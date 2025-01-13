import { RelayService } from '../core/relay-service';
import { EventService } from '../core/event-service';
import { ProfileManagerService } from '../profile/profile-manager-service';
import { FileService } from '../core/file-service';
import { EventKinds } from '../core/base-event-handler';
import { UnifiedFetchProcessor } from './unified-fetch-processor';
import { ProfileData } from '../../types';
import { Notice } from 'obsidian';
import { App } from 'obsidian';

export class MentionedProfileFetcher {
    private pendingMoves: Map<string, string> = new Map();

    constructor(
        private relayService: RelayService,
        private eventService: EventService,
        private profileManager: ProfileManagerService,
        private fileService: FileService,
        private app: App,
        private processor: UnifiedFetchProcessor
    ) {
        // Listen for profile processing completion
        this.eventService.onStateChange(async (isActive) => {
            if (!isActive && this.pendingMoves.size > 0) {
                await this.moveProfiles();
            }
        });
    }

    async fetchMentionedProfiles(mentions: string[]) {
        const uniquePubkeys = [...new Set(mentions)];
        
        try {
            // Use UnifiedFetchProcessor to handle profiles through stream handler
            await this.processor.fetchWithOptions({
                kinds: [EventKinds.METADATA],
                authors: uniquePubkeys,
                limit: uniquePubkeys.length,
                useStream: true  // Ensure events go through stream handler
            });

            // Queue profiles for moving after processing
            for (const pubkey of uniquePubkeys) {
                this.pendingMoves.set(pubkey, ''); // Name will be set when profile is processed
            }

            // Listen for profile processing completion
            this.eventService.onProfile((event) => {
                try {
                    const metadata = JSON.parse(event.content);
                    if (metadata.name && this.pendingMoves.has(event.pubkey)) {
                        this.pendingMoves.set(event.pubkey, metadata.name);
                    }
                } catch (error) {
                    console.error('Error processing profile event:', error);
                }
            });

        } catch (error) {
            console.error('Error fetching mentioned profiles:', error);
            new Notice('Error fetching mentioned profiles');
        }
    }

    private async moveProfiles(): Promise<void> {
        for (const [pubkey, name] of this.pendingMoves.entries()) {
            if (name) {
                try {
                    await this.fileService.moveProfileToMentions(pubkey, name);
                } catch (error) {
                    console.error('Error moving profile to mentions:', error);
                }
            }
        }
        this.pendingMoves.clear();
    }

    reset(): void {
        this.pendingMoves.clear();
    }
}
