import { App, Notice, TFile } from 'obsidian';
import { NostrEvent, NostrSettings } from '../../types';
import { PollOption, PollMetadata, PollType, NostrPollTag } from './types';
import { EventEmitter } from '../../services/event-emitter';
import { FileService } from '../../services/core/file-service';
import { NostrEventBus } from '../event-bus/event-bus';
import { PollValidationService } from './services/validation-service';
import { PollStateManager } from './services/state-manager';
import { NostrEventType, EventHandler } from '../event-bus/types';
import { RelayService } from '../../services/core/relay-service';
import { Filter } from 'nostr-tools';

export class PollService {
    private app: App;
    private settings: NostrSettings;
    private eventEmitter: EventEmitter;
    private fileService: FileService;
    private eventBus: NostrEventBus;
    private stateManager: PollStateManager;
    private validationService: PollValidationService;
    private pollHandler: EventHandler;
    private voteHandler: EventHandler;
    private relayService: RelayService;

    constructor(
        app: App,
        settings: NostrSettings,
        eventEmitter: EventEmitter,
        fileService: FileService,
        relayService: RelayService
    ) {
        this.app = app;
        this.settings = settings;
        this.eventEmitter = eventEmitter;
        this.fileService = fileService;
        this.eventBus = NostrEventBus.getInstance();
        this.stateManager = new PollStateManager();
        this.validationService = new PollValidationService();
        this.relayService = relayService;

        // Initialize handlers
        this.pollHandler = {
            handle: async (event: NostrEvent) => {
                await this.processPoll(event);
            },
            priority: 1
        };

        this.voteHandler = {
            handle: async (event: NostrEvent) => {
                await this.processVote(event);
            },
            priority: 2
        };

        console.log('[PollService] Constructed with settings:', {
            enabled: settings.polls.enabled,
            directory: settings.polls.directory
        });
    }

    /**
     * Initialize the poll service and subscribe to events
     */
    public async initialize() {
        console.log('[PollService] Initializing...');
        console.log('[PollService] Settings:', {
            enabled: this.settings.polls.enabled,
            directory: this.settings.polls.directory,
            autoUpdate: this.settings.polls.autoUpdate
        });

        if (!this.settings.polls.enabled) {
            console.log('[PollService] Poll service disabled in settings');
            return;
        }

        try {
            // Ensure poll directory exists
            await this.fileService.ensureDirectories();

            // Subscribe to poll events (kind: 1068)
            this.eventBus.subscribe(NostrEventType.POLL, this.pollHandler);
            console.log('[PollService] Subscribed to poll events');

            // Subscribe to vote events
            this.eventBus.subscribe(NostrEventType.VOTE, this.voteHandler);
            console.log('[PollService] Subscribed to vote events');

            // Start fetching polls
            await this.fetchPolls();

            console.log('[PollService] Initialization complete');
        } catch (error) {
            console.error('[PollService] Error initializing poll service:', error);
            new Notice('Error initializing poll service');
        }
    }

    /**
     * Fetch polls from relays
     */
    private async fetchPolls() {
        console.log('[PollService] Starting poll fetch...');
        
        const relayStatus = this.relayService.isConnected();
        console.log('[PollService] Relay connection status:', relayStatus);
        
        if (!relayStatus) {
            console.error('[PollService] No relay connection available');
            new Notice('No relay connection available');
            return;
        }

        try {
            new Notice('Fetching polls...');

            let pollCount = 0;
            let voteCount = 0;

            // First fetch all polls
            const pollFilter: Partial<Filter> = {
                kinds: [1068],  // Poll creation events
                since: Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60) // Last 30 days
            };
            
            console.log('[PollService] Fetching polls with filter:', pollFilter);
            const pollEvents = await this.relayService.subscribe([pollFilter]);
            console.log(`[PollService] Received ${pollEvents.length} poll events`);

            // Process all polls first
            for (const event of pollEvents) {
                console.log('[PollService] Processing poll event:', {
                    id: event.id,
                    pubkey: event.pubkey,
                    created_at: event.created_at,
                    tags: event.tags
                });
                await this.eventBus.publish(NostrEventType.POLL, event);
                pollCount++;
            }

            // Now fetch votes for the polls we found
            const voteFilter: Partial<Filter> = {
                kinds: [1018],  // Poll vote events
                since: Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60), // Last 30 days
                '#e': pollEvents.map(e => e.id) // Only fetch votes for our polls
            };

            console.log('[PollService] Fetching votes with filter:', voteFilter);
            const voteEvents = await this.relayService.subscribe([voteFilter]);
            console.log(`[PollService] Received ${voteEvents.length} vote events`);

            // Group votes by pubkey and poll ID, keeping only the latest vote per user per poll
            const latestVotes = new Map<string, NostrEvent>();
            for (const event of voteEvents) {
                const pollId = event.tags.find(tag => tag[0] === 'e')?.[1];
                if (pollId) {
                    const key = `${event.pubkey}-${pollId}`;
                    if (!latestVotes.has(key) || event.created_at > latestVotes.get(key)!.created_at) {
                        latestVotes.set(key, event);
                    }
                }
            }

            // Process only the latest vote per user per poll
            for (const event of latestVotes.values()) {
                console.log('[PollService] Processing vote event:', {
                    id: event.id,
                    pubkey: event.pubkey,
                    created_at: event.created_at,
                    tags: event.tags
                });
                await this.eventBus.publish(NostrEventType.VOTE, event);
                voteCount++;
            }

            console.log(`[PollService] Processed ${voteCount} votes`);

            console.log(`[PollService] Processed ${pollCount} polls and ${voteCount} votes`);
            new Notice(`Found ${pollCount} polls and ${voteCount} votes`);

        } catch (error) {
            console.error('[PollService] Error fetching polls:', error);
            new Notice('Error fetching polls');
        }
    }

    /**
     * Reset the poll service state
     */
    public async reset() {
        try {
            // Clear state manager
            this.stateManager.clear();
            console.log('[PollService] Poll service reset');
        } catch (error) {
            console.error('[PollService] Error resetting poll service:', error);
            new Notice('Error resetting poll service');
        }
    }

    /**
     * Clean up resources when plugin is disabled
     */
    public async cleanup() {
        try {
            // Unsubscribe from events
            await this.eventBus.unsubscribe(NostrEventType.POLL, this.pollHandler);
            await this.eventBus.unsubscribe(NostrEventType.VOTE, this.voteHandler);
            // Clear state
            await this.reset();
            console.log('[PollService] Poll service cleaned up');
        } catch (error) {
            console.error('[PollService] Error cleaning up poll service:', error);
        }
    }

    async processPoll(event: NostrEvent): Promise<void> {
        try {
            // Log raw event for debugging
            console.log('[PollService] Processing poll event:', {
                id: event.id,
                pubkey: event.pubkey,
                created_at: event.created_at,
                content: event.content,
                tags: event.tags
            });

            // Validate poll event
            const isValid = this.validationService.validatePollEvent(event);
            if (!isValid) {
                console.error('[PollService] Invalid poll event:', event);
                return;
            }
            console.log('[PollService] Poll validation passed');

            // Extract poll data
            const pollData = this.extractPollData(event);
            console.log('[PollService] Extracted poll data:', pollData);
            
            // Create metadata
            const metadata: PollMetadata = {
                id: event.id,
                pubkey: event.pubkey,
                author: '', // Will be filled by file service
                created_at: event.created_at,
                created_at_string: new Date(event.created_at * 1000).toISOString(),
                kind: 1068,
                question: pollData.question,
                options: pollData.options,
                poll_type: pollData.pollType,
                relays: [],  // Will be filled by relay service
                total_votes: 0,
                nostr_tags: event.tags as NostrPollTag[]
            };

            // Convert metadata to frontmatter format
            const frontmatter = {
                id: metadata.id,
                question: metadata.question,
                options: metadata.options.map(opt => opt.text),
                multiple_choice: metadata.poll_type === 'multichoice',
                created_at: metadata.created_at
            };

            // Format content
            const content = this.formatPollContent(metadata);
            
            // Save poll using FileService
            await this.fileService.savePoll(frontmatter, content);
            console.log('[PollService] Poll saved successfully');

            // Update state
            this.stateManager.addPoll(event.id, metadata);
            console.log('[PollService] Poll state updated');

        } catch (error) {
            console.error('[PollService] Error processing poll:', error);
            new Notice('Error processing poll');
        }
    }

    async processVote(event: NostrEvent): Promise<void> {
        try {
            // Log raw event for debugging
            console.log('[PollService] Processing vote event:', {
                id: event.id,
                pubkey: event.pubkey,
                created_at: event.created_at,
                tags: event.tags
            });

            // Validate vote event
            const isValid = this.validationService.validateVoteEvent(event);
            if (!isValid) {
                console.error('[PollService] Invalid vote event:', event);
                return;
            }
            console.log('[PollService] Vote validation passed');

            // Get poll ID and responses from event
            const pollId = event.tags.find(tag => tag[0] === 'e')?.[1];
            const responseTags = event.tags.filter(tag => tag[0] === 'response');

            if (!pollId || responseTags.length === 0) {
                console.error('[PollService] Missing poll ID or responses in vote event');
                return;
            }

            console.log('[PollService] Processing vote:', {
                pollId,
                responses: responseTags.map(tag => tag[1]),
                voter: event.pubkey
            });

            // Update poll state for each response
            let updated = false;
            for (const tag of responseTags) {
                const optionId = tag[1];
                if (optionId) {
                    const result = await this.stateManager.addVote(pollId, optionId, event.pubkey);
                    updated = updated || result;
                }
            }
            if (updated) {
                console.log('[PollService] Vote recorded successfully');
                
                // Update poll file
                const poll = this.stateManager.getPoll(pollId);
                if (poll) {
                    // Convert metadata to frontmatter format
                    const frontmatter = {
                        id: poll.id,
                        question: poll.question,
                        options: poll.options.map(opt => opt.text),
                        multiple_choice: poll.poll_type === 'multichoice',
                        created_at: poll.created_at
                    };

                    const content = this.formatPollContent(poll);
                    await this.fileService.savePoll(frontmatter, content);
                    console.log('[PollService] Poll file updated successfully');
                }
            } else {
                console.log('[PollService] Vote not recorded (duplicate or invalid)');
            }

        } catch (error) {
            console.error('[PollService] Error processing vote:', error);
            new Notice('Error processing vote');
        }
    }

    private extractPollData(event: NostrEvent): {
        question: string;
        options: PollOption[];
        pollType: PollType;
    } {
        const options: PollOption[] = event.tags
            .filter(tag => tag[0] === 'option')
            .map(tag => ({
                id: tag[1],
                text: tag[2],
                votes: 0
            }));

        const pollType = event.tags.find(tag => tag[0] === 'polltype')?.[1] === 'multichoice'
            ? 'multichoice'
            : 'singlechoice';

        return {
            question: event.content,
            options,
            pollType
        };
    }

    private formatPollContent(metadata: PollMetadata): string {
        // Convert metadata to frontmatter format for saving
        const frontmatter = {
            id: metadata.id,
            question: metadata.question,
            options: metadata.options.map(opt => opt.text),
            multiple_choice: metadata.poll_type === 'multichoice',
            created_at: metadata.created_at
        };

        return `---
${JSON.stringify(frontmatter, null, 2)}
---

# ${metadata.question}

_${metadata.poll_type === 'singlechoice' ? 'Single choice' : 'Multiple choice'} poll_

## Options
${metadata.options.map((opt: PollOption) => `- [ ] ${opt.text} (${opt.votes} votes)`).join('\n')}

Total votes: ${metadata.total_votes}
`;
    }
}
