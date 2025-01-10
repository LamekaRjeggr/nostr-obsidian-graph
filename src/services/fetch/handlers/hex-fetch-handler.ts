import { EventHandler, HexFetchEvent, NostrEventType } from '../../../experimental/event-bus/types';
import { UnifiedFetchProcessor } from '../unified-fetch-processor';
import { EventKinds } from '../../core/base-event-handler';
import { Notice } from 'obsidian';
import { FileService } from '../../core/file-service';
import { ValidationService } from '../../validation-service';

export class HexFetchHandler implements EventHandler<HexFetchEvent> {
    priority = 1; // High priority for direct fetches
    
    constructor(
        private unifiedFetchProcessor: UnifiedFetchProcessor,
        private fileService: FileService
    ) {}
    
    async handle(event: HexFetchEvent): Promise<void> {
        try {
            const { hexKey, limit } = event;

            // Validate hex key
            if (!ValidationService.validateHex(hexKey)) {
                new Notice('Invalid hex key format');
                return;
            }
            
            // Use unified fetch processor with author parameter
            const results = await this.unifiedFetchProcessor.fetchWithOptions({
                kinds: [EventKinds.NOTE],
                limit: limit || 100, // Default to 100 if not specified
                author: hexKey // Use the new author parameter
            });

            // Success notification is handled by UnifiedFetchProcessor
            
        } catch (error) {
            console.error('Error in hex fetch:', error);
            new Notice(`Error fetching notes by hex key: ${error.message}`);
        }
    }
}
