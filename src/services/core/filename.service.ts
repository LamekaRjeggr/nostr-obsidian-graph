import { NostrEvent } from '../../interfaces';

/**
 * Core service for generating standardized filenames
 */
export class FilenameService {
    /**
     * Generates a filename for a kind 1 note using first sentence + event ID
     * @param event The kind 1 note event
     * @returns The generated filename (without extension)
     * @throws Error if event is not kind 1
     */
    static generateNoteFilename(event: NostrEvent): string {
        if (event.kind !== 1) {
            throw new Error('generateNoteFilename can only be used with kind 1 events');
        }

        return event.content
            .split(/[.!?](?:\s|$)/)[0]
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ' ')
            .trim()
            .replace(/\s+/g, ' ')
            .slice(0, 40);
    }
}
