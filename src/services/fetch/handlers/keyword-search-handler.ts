import { EventHandler, KeywordSearchEvent, NostrEventType, SearchScope, TimeRange, ContentType } from '../../../experimental/event-bus/types';
import { UnifiedFetchProcessor } from '../unified-fetch-processor';
import { EventKinds } from '../../core/base-event-handler';
import { Notice } from 'obsidian';
import { FileService } from '../../core/file-service';
import { NostrEvent } from '../../../types';
import { ContactGraphService } from '../../contacts/contact-graph-service';
import { KeyService } from '../../core/key-service';

export class KeywordSearchHandler implements EventHandler<KeywordSearchEvent> {
    priority = 1; // High priority for search operations
    
    constructor(
        private unifiedFetchProcessor: UnifiedFetchProcessor,
        private fileService: FileService,
        private contactGraphService: ContactGraphService,
        private settings: { npub: string }
    ) {}

    private getTimeRangeFilter(timeRange: TimeRange, customStartDate?: number, customEndDate?: number): { since?: number; until?: number } {
        const now = Math.floor(Date.now() / 1000);
        switch (timeRange) {
            case TimeRange.LAST_WEEK:
                return { since: now - 7 * 24 * 60 * 60 };
            case TimeRange.LAST_MONTH:
                return { since: now - 30 * 24 * 60 * 60 };
            case TimeRange.LAST_YEAR:
                return { since: now - 365 * 24 * 60 * 60 };
            case TimeRange.CUSTOM:
                return {
                    since: customStartDate ? Math.floor(customStartDate / 1000) : undefined,
                    until: customEndDate ? Math.floor(customEndDate / 1000) : undefined
                };
            default:
                return {};
        }
    }

    async handle(event: KeywordSearchEvent): Promise<void> {
        try {
            const { keywords, limit, searchSettings } = event;
            
            // Get time range filters
            const timeRange = this.getTimeRangeFilter(
                searchSettings.timeRange,
                searchSettings.customStartDate,
                searchSettings.customEndDate
            );

            // Use unified fetch processor with NIP-50 search only
            const results = await this.unifiedFetchProcessor.fetchWithOptions({
                kinds: [EventKinds.NOTE],
                limit: limit,
                since: timeRange.since,
                until: timeRange.until,
                search: keywords,  // Use NIP-50 search
                skipSave: true    // Skip auto-save since we'll handle it
            });

            new Notice(`Searching for keywords: ${keywords.join(', ')}`);

            // Save each result
            let savedCount = 0;
            for (const note of results) {
                try {
                    await this.fileService.saveNote(note, {
                        references: [],
                        referencedBy: []
                    });
                    savedCount++;
                } catch (error) {
                    console.error('Error saving note:', error);
                }
            }

            new Notice(`Found ${results.length} notes matching keywords: ${keywords.join(', ')}\nSaved ${savedCount} notes`);

        } catch (error) {
            console.error('Error in keyword search:', error);
            new Notice('Error searching notes by keywords');
        }
    }
}
