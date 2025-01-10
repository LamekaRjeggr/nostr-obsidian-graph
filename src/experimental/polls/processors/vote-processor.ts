/**
 * Processes vote events for Nostr polls and updates poll state.
 */

import { EventHandler } from '../../event-bus/types';
import { 
    PollData,
    PollMetadata,
    PollError,
    NostrVoteEvent,
    NostrPollTag,
    PollResult
} from '../types';
import { App } from 'obsidian';

export class VoteProcessor implements EventHandler {
    priority = 2; // Process after poll events

    constructor(private app: App) {}

    /**
     * Process a vote event
     */
    async handle(event: NostrVoteEvent): Promise<void> {
        try {
            // Get poll ID from e tag
            const pollId = this.getPollId(event);
            if (!pollId) {
                console.error('No poll ID found in vote event');
                return;
            }

            // Get option IDs from option tags
            const optionIds = this.getOptionIds(event);
            if (optionIds.length === 0) {
                console.error('No options found in vote event');
                return;
            }

            // Get existing poll
            const poll = await this.getPollData(pollId);
            if (!poll) {
                console.error(`Poll ${pollId} not found`);
                return;
            }

            // Validate vote
            if (!this.validateVote(poll, optionIds)) {
                return;
            }

            // Update poll with new vote
            await this.updatePollWithVote(poll, optionIds);
        } catch (error) {
            console.error('Error processing vote:', error);
        }
    }

    /**
     * Only process vote events (kind 1068 with e and option tags)
     */
    filter(event: any): boolean {
        return event.kind === 1068 && 
               event.tags.some(tag => tag[0] === 'e') &&
               event.tags.some(tag => tag[0] === 'option');
    }

    /**
     * Get poll ID from event tags
     */
    private getPollId(event: NostrVoteEvent): string | null {
        const pollTag = event.tags.find((tag): tag is ['e', string] => 
            tag[0] === 'e'
        );
        return pollTag?.[1] || null;
    }

    /**
     * Get option IDs from event tags
     */
    private getOptionIds(event: NostrVoteEvent): string[] {
        return event.tags
            .filter((tag): tag is ['option', string] => tag[0] === 'option')
            .map(tag => tag[1]);
    }

    /**
     * Get poll data from Obsidian note
     */
    private async getPollData(pollId: string): Promise<PollData | null> {
        try {
            const path = `nostr/polls/${pollId}.md`;
            const content = await this.app.vault.adapter.read(path);
            
            // Extract frontmatter
            const match = content.match(/^---\n([\s\S]*?)\n---/);
            if (!match) return null;

            const metadata = JSON.parse(`{${match[1]}}`);
            return {
                id: metadata.id,
                pubkey: metadata.pubkey,
                question: metadata.question,
                options: metadata.options,
                pollType: metadata.poll_type,
                createdAt: metadata.created_at,
                relays: metadata.relays,
                totalVotes: metadata.total_votes
            };
        } catch (error) {
            console.error('Error reading poll:', error);
            return null;
        }
    }

    /**
     * Validate vote against poll rules
     */
    private validateVote(poll: PollData, optionIds: string[]): boolean {
        // Check multiple choice rules
        if (poll.pollType === 'singlechoice' && optionIds.length > 1) {
            console.error(`Multiple votes not allowed for poll ${poll.id}`);
            return false;
        }

        // Validate option IDs
        const validOptionIds = new Set(poll.options.map(o => o.id));
        if (!optionIds.every(id => validOptionIds.has(id))) {
            console.error(`Invalid option IDs for poll ${poll.id}`);
            return false;
        }

        return true;
    }

    /**
     * Update poll with new vote
     */
    private async updatePollWithVote(
        poll: PollData,
        optionIds: string[]
    ): Promise<void> {
        // Update vote counts
        optionIds.forEach(optionId => {
            const option = poll.options.find(o => o.id === optionId);
            if (option) {
                option.votes++;
            }
        });

        // Update total votes
        poll.totalVotes++;

        // Generate new metadata
        const metadata: PollMetadata = {
            id: poll.id,
            pubkey: poll.pubkey,
            author: '', // Preserved from existing note
            created_at: poll.createdAt,
            created_at_string: new Date(poll.createdAt * 1000).toISOString(),
            kind: 1068,
            question: poll.question,
            options: poll.options,
            poll_type: poll.pollType,
            relays: poll.relays,
            total_votes: poll.totalVotes,
            nostr_tags: [] // Preserved from existing note
        };

        // Update note content
        const content = this.formatPollContent(poll);
        await this.updatePollNote(content, metadata, poll.id);
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
     * Update poll note in Obsidian
     */
    private async updatePollNote(
        content: string,
        metadata: PollMetadata,
        pollId: string
    ): Promise<void> {
        const frontmatter = [
            '---',
            ...Object.entries(metadata).map(([key, value]) => 
                `${key}: ${JSON.stringify(value)}`
            ),
            '---'
        ].join('\n');

        const fullContent = `${frontmatter}\n\n${content}`;
        const path = `nostr/polls/${pollId}.md`;

        await this.app.vault.adapter.write(path, fullContent);
    }
}
