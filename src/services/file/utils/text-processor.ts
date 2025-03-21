/**
 * Utility class for processing nostr content
 */
export class ContentProcessor {
    /**
     * Extracts hashtags from content while ignoring code blocks and URLs
     */
    static extractHashtags(content: string): string[] {
        // Match hashtags that:
        // 1. Start with # and are followed by word characters
        // 2. Are not part of a URL
        // 3. Are not inside code blocks
        const hashtags = new Set<string>();
        const codeBlockRegex = /```[\s\S]*?```/g;
        const urlRegex = /https?:\/\/[^\s]+/g;
        
        // Remove code blocks and URLs temporarily
        let cleanContent = content
            .replace(codeBlockRegex, '')
            .replace(urlRegex, '');
            
        // Extract hashtags
        const matches = cleanContent.match(/#[\w\u0590-\u05ff]+/g) || [];
        
        // Remove # prefix and add to set (for uniqueness)
        matches.forEach(tag => {
            hashtags.add(tag.slice(1).toLowerCase());
        });
        
        return Array.from(hashtags);
    }

    /**
     * Normalizes content line endings and spacing
     */
    static cleanContent(content: string): string {
        return content
            .replace(/\r\n/g, '\n')         // Normalize line endings
            .replace(/\n{3,}/g, '\n\n')     // Max double newlines
            .trim();                        // Clean edges
    }

    /**
     * Extracts the first sentence or line from content
     */
    static extractTitle(text: string): string {
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
}
