/**
 * Processes Nostr poll events (kind 1068) and converts them to our internal format.
 */

import { EventHandler } from '../../event-bus/types';
import { 
    PollData, 
    PollOption,
    PollMetadata,
    PollError,
    PollResult,
    NostrPollEvent,
    PollType,
    NostrPollTag
} from '../types';
import { App } from 'obsidian';

export class PollProcessor implements EventHandler {
    priority = 1;

    constructor(private app: App) {}

    /**
     * Process a poll event
     */
    async handle(event: NostrPollEvent): Promise<void> {
        try {
            // Extract poll data
            const pollData = this.extractPollData(event);
            
            // Generate metadata
            const metadata = this.generateMetadata(pollData, event.tags);

            // Create note content
            const content = this.formatPollContent(pollData);

            // Save to Obsidian
            await this.createPollNote(content, metadata);
        } catch (error) {
            console.error('Error processing poll:', error);
        }
    }

    /**
     * Only process kind 1068 events
     */
    filter(event: any): boolean {
        return event.kind === 1068;
    }

    /**
     * Extract poll data from Nostr event
     */
    private extractPollData(event: NostrPollEvent): PollData {
        // Extract options from tags
        const options: PollOption[] = event.tags
            .filter((tag): tag is ['option', string, string] => tag[0] === 'option')
            .map(tag => ({
                id: tag[1],
                text: tag[2],
                votes: 0
            }));

        // Extract relays from tags
        const relays = event.tags
            .filter((tag): tag is ['relay', string] => tag[0] === 'relay')
            .map(tag => tag[1]);

        // Extract poll type
        const pollTypeTag = event.tags
            .find((tag): tag is ['polltype', PollType] => tag[0] === 'polltype');
        const pollType = pollTypeTag?.[1] || 'singlechoice';

        return {
            id: event.id,
            pubkey: event.pubkey,
            question: event.content,
            options,
            pollType,
            createdAt: event.created_at,
            relays,
            totalVotes: 0
        };
    }

    /**
     * Generate Obsidian frontmatter metadata
     */
    private generateMetadata(
        poll: PollData,
        tags: NostrPollTag[]
    ): PollMetadata {
        return {
            id: poll.id,
            pubkey: poll.pubkey,
            author: '', // Will be populated by profile service
            created_at: poll.createdAt,
            created_at_string: new Date(poll.createdAt * 1000).toISOString(),
            kind: 1068,
            question: poll.question,
            options: poll.options,
            poll_type: poll.pollType,
            relays: poll.relays,
            total_votes: poll.totalVotes,
            nostr_tags: tags
        };
    }

    /**
     * Format poll content in markdown
     */
    private formatPollContent(poll: PollData): string {
        const pollType = poll.pollType === 'singlechoice' ? 
            'Single choice poll' : 
            'Multiple choice poll';

        return [
            `# ${poll.question}`,
            `\n_${pollType}_`,
            '',
            '## Options',
            ...poll.options.map(opt => 
                `- [ ] ${opt.text} (${opt.votes} votes)`
            ),
            '',
            `Total votes: ${poll.totalVotes}`,
            '',
            '## Relays',
            ...poll.relays.map(relay => `- ${relay}`)
        ].join('\n');
    }

    /**
     * Create or update poll note in Obsidian
     */
    private async createPollNote(
        content: string, 
        metadata: PollMetadata
    ): Promise<void> {
        const frontmatter = [
            '---',
            ...Object.entries(metadata).map(([key, value]) => 
                `${key}: ${JSON.stringify(value)}`
            ),
            '---'
        ].join('\n');

        const fullContent = `${frontmatter}\n\n${content}`;
        const path = `nostr/polls/${metadata.id}.md`;

        await this.app.vault.adapter.write(path, fullContent);
    }
}
