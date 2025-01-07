import { NostrEvent } from '../../interfaces';
import { IIndexService } from '../../interfaces';
import { IObsidianFileService } from './obsidian-file.service';

export interface IFollowFileService {
    saveFollow(event: NostrEvent): Promise<void>;
    getFollow(pubkey: string): Promise<NostrEvent>;
}

export class FollowFileService implements IFollowFileService {
    private readonly followsDir = 'nostr/user follows';

    constructor(
        private obsidianFileService: IObsidianFileService,
        private indexService: IIndexService
    ) {}

    async saveFollow(event: NostrEvent): Promise<void> {
        if (event.kind !== 3) {
            throw new Error('Not a follow event');
        }

        try {
            const filepath = `${this.followsDir}/${event.pubkey}.md`;

            // Extract followed pubkeys from tags
            const followedPubkeys = event.tags
                .filter(tag => tag[0] === 'p')
                .map(tag => tag[1]);

            // Create frontmatter with essential metadata
            const frontmatter: {
                event: {
                    id: string;
                    pubkey: string;
                    kind: number;
                    created_at: number;
                    tags: any[];
                };
                follows: string[];
            } = {
                event: {
                    id: event.id,
                    pubkey: event.pubkey,
                    kind: event.kind,
                    created_at: event.created_at,
                    tags: event.tags
                },
                follows: followedPubkeys
            };


            // Create markdown content
            const markdown = [
                this.obsidianFileService.createFrontmatter(frontmatter),
                '',
                '# Following',
                '',
                ...followedPubkeys.map(pubkey => `- ${pubkey}`)
            ].join('\n');

            await this.obsidianFileService.createOrUpdateFile(filepath, markdown);
        } catch (error) {
            console.error('Failed to save follow list:', error);
            throw error;
        }
    }

    async getFollow(pubkey: string): Promise<NostrEvent> {
        const files = await this.indexService.findEventsByKind(3);
        for (const file of files) {
            const content = await this.obsidianFileService.readFile(file);
            const frontmatter = this.obsidianFileService.getFrontmatter(content);
            if (frontmatter?.event?.pubkey === pubkey) {
                return frontmatter.event;
            }
        }
        throw new Error(`Follow list not found for: ${pubkey}`);
    }
}
