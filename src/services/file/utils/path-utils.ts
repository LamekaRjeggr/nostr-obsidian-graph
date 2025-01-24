import { App, normalizePath } from 'obsidian';

export class PathUtils {
    constructor(private app: App) {}

    /**
     * Generates a safe file path for any content type
     * @param content The content to use for the filename (title, question, etc)
     * @param directory The target directory
     * @param options Additional options for path generation
     * @returns Normalized file path
     */
    getPath(content: string, directory: string, options: {
        extractTitle?: boolean;  // Extract first sentence for notes
        maxLength?: number;      // Max filename length (default: 100)
    } = {}): string {
        let title = content;
        
        // For notes, try to extract first sentence
        if (options.extractTitle) {
            const match = content.match(/^[^.!?]+[.!?](?:\s|$)/);
            title = match ? match[0].trim() : content.split('\n')[0];
        }

        // Clean and limit length
        const maxLength = options.maxLength || 100;
        title = title.slice(0, maxLength).trim();

        // Ensure we have a valid filename
        if (!title) {
            title = 'untitled';
        }

        // Clean filename and use Obsidian's path normalization
        const safeName = title
            .replace(/[\\/:*?"<>|]/g, '-') // Replace invalid chars with dash
            .replace(/\s+/g, ' ')          // Collapse spaces
            .trim();                       // Clean edges

        return normalizePath(`${directory}/${safeName}.md`);
    }

    /**
     * Generates a safe file path for a note
     */
    getNotePath(content: string, directory: string): string {
        return this.getPath(content, directory, { extractTitle: true });
    }

    /**
     * Generates a safe file path for a profile
     */
    getProfilePath(name: string, directory: string): string {
        return this.getPath(name, directory);
    }

    /**
     * Generates a safe file path for a poll
     */
    getPollPath(question: string, directory: string): string {
        return this.getPath(question, directory);
    }
}
