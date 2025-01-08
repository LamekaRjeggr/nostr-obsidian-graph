import { NostrEvent } from '../../interfaces';

interface NostrReferences {
    replies: Array<{id: string, marker: string}>;
    roots: Array<{id: string, marker: string}>;
    mentions: Array<{id: string, marker: string}>;
    profiles: string[];
    urls: string[];
}

export class FrontmatterService {
    static createBaseFrontmatter(event: NostrEvent) {
        const references = this.processNostrTags(event.tags);
        
        return {
            created: new Date(event.created_at * 1000).toISOString(),
            kind: event.kind,
            id: event.id,
            pubkey: event.pubkey,
            references: {
                replies: references.replies,
                roots: references.roots,
                mentions: references.mentions,
                profiles: references.profiles,
                urls: references.urls
            },
            raw_tags: event.tags  // Keep raw tags for compatibility
        };
    }

    static createEventFromFrontmatter(frontmatter: any, content: string): NostrEvent {
        // Convert structured references back to nostr tags
        const tags: string[][] = frontmatter.raw_tags || [];
        
        // If raw_tags not available, reconstruct from structured references
        if (!frontmatter.raw_tags && frontmatter.references) {
            const refs = frontmatter.references;
            
            // Add replies
            refs.replies?.forEach((ref: {id: string, marker: string}) => {
                tags.push(['e', ref.id, '', 'reply']);
            });
            
            // Add roots
            refs.roots?.forEach((ref: {id: string, marker: string}) => {
                tags.push(['e', ref.id, '', 'root']);
            });
            
            // Add mentions
            refs.mentions?.forEach((ref: {id: string, marker: string}) => {
                tags.push(['e', ref.id, '', 'mention']);
            });
            
            // Add profiles
            refs.profiles?.forEach((id: string) => {
                tags.push(['p', id]);
            });
            
            // Add URLs
            refs.urls?.forEach((url: string) => {
                tags.push(['r', url]);
            });
        }

        return {
            id: frontmatter.id,
            pubkey: frontmatter.pubkey,
            kind: frontmatter.kind,
            created_at: new Date(frontmatter.created).getTime() / 1000,
            tags: tags,
            content: content,
            sig: ''
        } as NostrEvent;
    }

    private static processNostrTags(tags: string[][]): NostrReferences {
        const references: NostrReferences = {
            replies: [],
            roots: [],
            mentions: [],
            profiles: [],
            urls: []
        };

        for (const tag of tags) {
            if (!Array.isArray(tag) || tag.length === 0) continue;

            switch (tag[0]) {
                case 'e':
                    if (tag[1]) {
                        const ref = {
                            id: tag[1],
                            marker: tag[3] || 'mention'
                        };
                        
                        switch (tag[3]) {
                            case 'reply':
                                references.replies.push(ref);
                                break;
                            case 'root':
                                references.roots.push(ref);
                                break;
                            default:
                                references.mentions.push(ref);
                                break;
                        }
                    }
                    break;
                    
                case 'p':
                    if (tag[1]) {
                        references.profiles.push(tag[1]);
                    }
                    break;
                    
                case 'r':
                    if (tag[1]) {
                        references.urls.push(tag[1]);
                    }
                    break;
            }
        }

        return references;
    }
}
