import { PollMetadata } from '../types';

export class PollStateManager {
    private polls: Map<string, PollMetadata>;
    private votes: Map<string, Set<string>>; // pollId -> Set of voter pubkeys

    constructor() {
        this.polls = new Map();
        this.votes = new Map();
    }

    addPoll(id: string, poll: PollMetadata): void {
        this.polls.set(id, poll);
        this.votes.set(id, new Set());
    }

    getPoll(id: string): PollMetadata | undefined {
        return this.polls.get(id);
    }

    async addVote(pollId: string, optionId: string, voterPubkey: string): Promise<boolean> {
        const poll = this.polls.get(pollId);
        if (!poll) {
            console.error('Poll not found:', pollId);
            return false;
        }

        // Check if voter has already voted in single choice polls
        if (poll.poll_type === 'singlechoice') {
            const voters = this.votes.get(pollId);
            if (voters?.has(voterPubkey)) {
                console.error('Voter has already voted in single choice poll');
                return false;
            }
        }

        // Find and update the option
        const option = poll.options.find(opt => opt.id === optionId);
        if (!option) {
            console.error('Option not found:', optionId);
            return false;
        }

        // Update vote counts
        option.votes++;
        poll.total_votes++;

        // Record the voter
        const voters = this.votes.get(pollId);
        if (voters) {
            voters.add(voterPubkey);
        }

        return true;
    }

    hasVoted(pollId: string, pubkey: string): boolean {
        return this.votes.get(pollId)?.has(pubkey) || false;
    }

    closePoll(pollId: string): boolean {
        const poll = this.polls.get(pollId);
        if (!poll) {
            console.error('Poll not found:', pollId);
            return false;
        }

        poll.closed = true;
        return true;
    }

    getVoterCount(pollId: string): number {
        return this.votes.get(pollId)?.size || 0;
    }

    clear(): void {
        this.polls.clear();
        this.votes.clear();
    }

    getAllPollIds(): string[] {
        return Array.from(this.polls.keys());
    }
}
