import { NostrEvent } from '../../interfaces';

export class FrontmatterService {
    static createBaseFrontmatter(event: NostrEvent) {
        return {
            created: new Date(event.created_at * 1000).toISOString(),
            kind: event.kind,
            id: event.id,
            pubkey: event.pubkey,
            nostr_tags: event.tags
        };
    }

    static createEventFromFrontmatter(frontmatter: any, content: string): NostrEvent {
        return {
            id: frontmatter.id,
            pubkey: frontmatter.pubkey,
            kind: frontmatter.kind,
            created_at: new Date(frontmatter.created).getTime() / 1000,
            tags: frontmatter.nostr_tags,
            content: content,
            sig: ''
        } as NostrEvent;
    }
}
