import { NostrSettings, NostrEvent, FetchState } from '../../types';
import { RelayService } from '../core/relay-service';
import { EventService } from '../core/event-service';
import { KeyService } from '../core/key-service';
import { ValidationService } from '../validation-service';
import { FetchProcessor } from './fetch-processor';
import { FileService } from '../core/file-service';
import { Notice } from 'obsidian';

export class FetchService {
    private state: FetchState = {
        count: 0,  // Only tracks notes, not profiles or contacts
        mainUserDone: false,
        isActive: false
    };
    private processor: FetchProcessor;

    constructor(
        private settings: NostrSettings,
        private relayService: RelayService,
        private eventService: EventService,
        private fileService: FileService
    ) {
        this.processor = new FetchProcessor(
            settings,
            relayService,
            eventService,
            fileService
        );
    }

    async fetchMainUser(): Promise<void> {
        if (!ValidationService.validateNpub(this.settings.npub)) {
            new Notice('Invalid npub');
            return;
        }

        const hex = KeyService.npubToHex(this.settings.npub);
        if (!hex) return;

        if (this.state.isActive) {
            new Notice('Fetch already in progress');
            return;
        }

        try {
            this.state.isActive = true;
            this.eventService.emitStateChange(true);
            
            // Process main user with contacts - count only tracks notes
            this.state.count = await this.processor.processMainUser(hex, this.state.count, true);
            this.state.mainUserDone = true;
        } catch (error) {
            // Silent fail for fetch errors
            return;
        } finally {
            this.state.isActive = false;
            this.eventService.emitStateChange(false);
        }
    }

    async fetchByHex(hex: string): Promise<void> {
        if (this.state.isActive) {
            new Notice('Fetch already in progress');
            return;
        }

        try {
            this.state.isActive = true;
            this.eventService.emitStateChange(true);
            
            // Process user by hex directly without contacts
            this.state.count = await this.processor.processMainUser(hex, this.state.count, false);
        } catch (error) {
            // Silent fail for fetch errors
            return;
        } finally {
            this.state.isActive = false;
            this.eventService.emitStateChange(false);
        }
    }

    async fetchFollows(pubkeys: string[]): Promise<void> {
        if (!this.state.mainUserDone) return;

        const validPubkeys = pubkeys.filter(KeyService.validateHex);
        if (validPubkeys.length === 0) return;

        if (this.state.isActive) {
            new Notice('Fetch already in progress');
            return;
        }

        try {
            this.state.isActive = true;
            this.eventService.emitStateChange(true);
            
            // Process follows - count only tracks notes
            this.state.count = await this.processor.processFollows(
                validPubkeys, 
                this.state.count
            );
        } catch (error) {
            // Silent fail for fetch errors
            return;
        } finally {
            this.state.isActive = false;
            this.eventService.emitStateChange(false);
        }
    }

    reset(): void {
        this.state = {
            count: 0,
            mainUserDone: false,
            isActive: false
        };
        this.processor.clearChain();
    }

    getState(): FetchState {
        return { ...this.state };
    }
}
