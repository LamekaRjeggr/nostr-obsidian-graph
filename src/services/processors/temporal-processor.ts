import { App, TFile } from 'obsidian';
import { Event } from 'nostr-tools';

export interface TemporalResult {
    timestamp: number;
    chronological: {
        previousEvent?: string;
        nextEvent?: string;
    };
    obsidian: {
        previousFile?: TFile;
        nextFile?: TFile;
    };
    metadata: {
        created_at: string;
        created: number;
    };
}

/**
 * Processes temporal relationships between nostr events and Obsidian files.
 * Handles chronological ordering and bi-directional linking.
 */
export class TemporalProcessor {
    private eventIndex: Map<string, number> = new Map();
    private chronologicalOrder: string[] = [];

    constructor(
        private app: App
    ) {}

    /**
     * Process temporal relationships for a nostr event
     */
    async process(event: Event): Promise<TemporalResult> {
        // Store event in chronological index
        this.insertIntoChronology(event.id, event.created_at);

        // Find adjacent events
        const adjacentEvents = this.findAdjacentEvents(event.id);

        // Find corresponding Obsidian files
        const obsidianFiles = await this.findObsidianFiles(adjacentEvents);

        // Format timestamp
        const timestamp = event.created_at;
        const created_at = new Date(timestamp * 1000).toISOString();

        return {
            timestamp,
            chronological: {
                previousEvent: adjacentEvents.previous,
                nextEvent: adjacentEvents.next
            },
            obsidian: {
                previousFile: obsidianFiles.previous,
                nextFile: obsidianFiles.next
            },
            metadata: {
                created_at,
                created: timestamp
            }
        };
    }

    /**
     * Insert an event into the chronological index
     */
    private insertIntoChronology(id: string, timestamp: number): void {
        if (this.eventIndex.has(id)) return;

        // Find insertion point
        const position = this.chronologicalOrder.findIndex(existingId => {
            const existingTimestamp = this.eventIndex.get(existingId);
            return existingTimestamp && existingTimestamp < timestamp;
        });

        // Insert event
        if (position === -1) {
            this.chronologicalOrder.push(id);
        } else {
            this.chronologicalOrder.splice(position, 0, id);
        }

        this.eventIndex.set(id, timestamp);
    }

    /**
     * Find events adjacent to the given event in chronological order
     */
    private findAdjacentEvents(id: string): {
        previous?: string;
        next?: string;
    } {
        const index = this.chronologicalOrder.indexOf(id);
        if (index === -1) return {};

        return {
            previous: index > 0 ? this.chronologicalOrder[index - 1] : undefined,
            next: index < this.chronologicalOrder.length - 1 ? 
                this.chronologicalOrder[index + 1] : undefined
        };
    }

    /**
     * Find Obsidian files corresponding to adjacent events
     */
    private async findObsidianFiles(adjacentEvents: {
        previous?: string;
        next?: string;
    }): Promise<{
        previous?: TFile;
        next?: TFile;
    }> {
        const result: {
            previous?: TFile;
            next?: TFile;
        } = {};

        // Helper to find file by event ID
        const findFile = async (id?: string): Promise<TFile | undefined> => {
            if (!id) return undefined;

            // Search in vault for file with matching event ID in frontmatter
            const files = this.app.vault.getMarkdownFiles();
            for (const file of files) {
                const metadata = await this.app.metadataCache.getFileCache(file);
                if (metadata?.frontmatter?.id === id) {
                    return file;
                }
            }
            return undefined;
        };

        // Find files for both previous and next events
        result.previous = await findFile(adjacentEvents.previous);
        result.next = await findFile(adjacentEvents.next);

        return result;
    }

    /**
     * Format temporal links as Obsidian markdown
     */
    formatAsMarkdown(result: TemporalResult): string {
        const sections: string[] = [];

        // Add chronological links
        if (result.chronological.previousEvent || result.chronological.nextEvent) {
            sections.push('Chronological Links:');
            if (result.chronological.previousEvent) {
                sections.push(`Previous: [[${result.chronological.previousEvent}]]`);
            }
            if (result.chronological.nextEvent) {
                sections.push(`Next: [[${result.chronological.nextEvent}]]`);
            }
        }

        return sections.join('\n');
    }

    /**
     * Clear all temporal data
     */
    reset(): void {
        this.eventIndex.clear();
        this.chronologicalOrder = [];
    }
}
