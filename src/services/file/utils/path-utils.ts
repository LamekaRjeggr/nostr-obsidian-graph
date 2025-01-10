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
        title = title
            .replace(/\s+/g, ' ')  // Collapse spaces
            .trim()                // Remove edges
            .slice(0, maxLength);  // Limit length

        // Use Obsidian's path normalization
        const safePath = normalizePath(`${directory}/${title}.md`);
        return safePath;
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
