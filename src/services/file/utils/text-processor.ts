export class TextProcessor {
    static extractFirstSentence(text: string): string {
        const match = text.match(/^[^.!?]+[.!?](?:\s|$)/);
        if (match) {
            return match[0].trim();
        }
        
        const firstLine = text.split('\n')[0];
        if (firstLine && firstLine.length > 0) {
            return firstLine.length > 100 ? 
                firstLine.slice(0, 100) + '...' : 
                firstLine;
        }
        
        return 'Untitled Note';
    }

    static sanitizeFilename(name: string): string {
        return name
            .replace(/[/\\?%*:|"<>]/g, '-') // Replace invalid chars
            .replace(/\s+/g, ' ')           // Collapse spaces
            .trim()                         // Remove edges
            .slice(0, 100);                 // Limit length
    }

    static formatTimestamp(timestamp: number): string {
        return new Date(timestamp * 1000).toISOString();
    }

    static cleanContent(content: string): string {
        return content
            .replace(/\r\n/g, '\n')         // Normalize line endings
            .replace(/\n{3,}/g, '\n\n')     // Max double newlines
            .trim();                        // Clean edges
    }
}
