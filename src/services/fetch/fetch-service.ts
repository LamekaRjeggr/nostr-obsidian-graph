import { NostrSettings } from '../../types';
import { RelayService } from '../core/relay-service';
import { EventService } from '../core/event-service';
import { FileService } from '../core/file-service';
import { FetchProcessor } from './fetch-processor';
import { ValidationService } from '../validation-service';
import { ReferenceStore } from '../references/reference-store';
import { EventKinds } from '../core/base-event-handler';
import { App, Notice } from 'obsidian';
import { KeyService } from '../core/key-service';

export class FetchService {
    private processor: FetchProcessor;
    private currentCount: number = 0;

    constructor(
        private settings: NostrSettings,
        private relayService: RelayService,
        private eventService: EventService,
        private fileService: FileService,
        private app: App
    ) {
        this.processor = new FetchProcessor(settings, relayService, eventService, fileService, app);
    }

    getReferenceStore(): ReferenceStore {
        return this.processor.getReferenceStore();
    }

    async fetchMainUser(): Promise<void> {
        if (!ValidationService.validateNpub(this.settings.npub)) {
            new Notice('Invalid npub format');
            return;
        }

        const hex = KeyService.npubToHex(this.settings.npub);
        if (!hex) {
            new Notice('Failed to decode npub');
            return;
        }

        new Notice('Fetching notes...');
        
        try {
            const includeContacts = true;
            this.currentCount = await this.processor.processMainUser(hex, this.currentCount, includeContacts);

            // After processing notes, fetch reactions and zaps
            await this.fetchReactions(hex);
            
            new Notice('Notes fetched successfully');
        } catch (error) {
            console.error('Error fetching notes:', error);
            new Notice('Error fetching notes');
        }
    }

    async fetchByHex(hex: string): Promise<void> {
        if (!hex) {
            new Notice('Invalid hex key');
            return;
        }

        if (!KeyService.validateHex(hex)) {
            new Notice('Invalid hex format');
            return;
        }

        new Notice('Fetching notes...');

        try {
            const includeContacts = false;
            this.currentCount = await this.processor.processMainUser(hex, this.currentCount, includeContacts);

            // After processing notes, fetch reactions and zaps
            await this.fetchReactions(hex);
            
            new Notice('Notes fetched successfully');
        } catch (error) {
            console.error('Error fetching notes:', error);
            new Notice('Error fetching notes');
        }
    }

    private async fetchReactions(hex: string): Promise<void> {
        try {
            // Fetch reactions (kind 7)
            const reactionFilter = {
                authors: [hex],
                kinds: [EventKinds.REACTION],
                since: 0
            };

            const reactionEvents = await this.relayService.subscribe([reactionFilter]);
            for (const event of reactionEvents) {
                this.eventService.emitReaction(event);
            }

            // Fetch zaps (kind 9735)
            const zapFilter = {
                authors: [hex],
                kinds: [EventKinds.ZAPS],
                since: 0
            };

            const zapEvents = await this.relayService.subscribe([zapFilter]);
            for (const event of zapEvents) {
                this.eventService.emitZap(event);
            }
        } catch (error) {
            console.error('Error fetching reactions:', error);
            new Notice('Error fetching reactions');
        }
    }

    reset(): void {
        this.currentCount = 0;
        this.processor.clearChain();
    }
}
