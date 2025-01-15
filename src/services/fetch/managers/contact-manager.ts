import { App, Notice } from 'obsidian';
import { NostrEvent, ContactOptions, ProfileData } from '../../../types';
import { EventKinds } from '../../core/base-event-handler';
import { RelayService } from '../../core/relay-service';
import { ContactGraphService } from '../../contacts/contact-graph-service';
import { ValidationService } from '../../validation-service';
import { FileService } from '../../core/file-service';
import { EventStreamManager } from './event-stream-manager';

export class ContactManager {
    private contactGraphService: ContactGraphService;

    constructor(
        private relayService: RelayService,
        private app: App,
        private fileService: FileService,
        private eventStreamManager: EventStreamManager
    ) {
        this.contactGraphService = new ContactGraphService(relayService);
    }

    async fetchContacts(hex: string): Promise<string[]> {
        const contactFilter = {
            authors: [hex],
            kinds: [EventKinds.CONTACT],
            since: 0
        };
        
        const events = await this.relayService.subscribe([contactFilter]);
        return events.flatMap(event => 
            event.tags
                .filter(tag => tag[0] === 'p')
                .map(tag => tag[1])
        );
    }

    async processContacts(pubkey: string, contacts: string[], options?: ContactOptions): Promise<void> {
        // Initialize contact graph if needed
        if (!this.contactGraphService.isInitialized()) {
            await this.contactGraphService.initialize(pubkey);
        }

        // Update contact graph with new contacts
        for (const contact of contacts) {
            if (!this.contactGraphService.isDirectFollow(contact)) {
                await this.contactGraphService.initialize(contact);
            }
        }

        // Fetch and save profiles if requested
        if (options?.fetchProfiles) {
            const directFollows = this.contactGraphService.getDirectFollows();
            if (directFollows.length > 0) {
                const filter = {
                    kinds: [EventKinds.METADATA],
                    authors: directFollows,
                    limit: directFollows.length
                };
                
                try {
                    const events = await this.relayService.subscribe([filter]);
                    // Process profile events through event stream to ensure consistent handling
                    await this.eventStreamManager.processEvents(events);
                } catch (error) {
                    console.error('Error fetching contact profiles:', error);
                    new Notice('Error fetching contact profiles');
                }
            }
        }
    }

    async getContactsForAuthor(author: string): Promise<string[]> {
        if (!ValidationService.validateHex(author)) {
            throw new Error('Invalid hex key format');
        }

        return this.fetchContacts(author);
    }

    clear(): void {
        this.contactGraphService.clear();
    }
}
