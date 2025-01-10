import { App, Notice, TFile } from 'obsidian';
import { NostrEvent, NostrSettings, PollFrontmatter, PollOption } from '../../types';
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

            // Filter for kind 1068 events (polls and votes)
            const filter: Partial<Filter> = {
                kinds: [1068],
                since: Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60) // Last 30 days
            };
            
            console.log('[PollService] Using filter:', filter);

            // Subscribe to events
            console.log('[PollService] Subscribing to relay events...');
            const events = await this.relayService.subscribe([filter]);
            console.log(`[PollService] Received ${events.length} kind 1068 events`);

            // Process events
            let pollCount = 0;
            let voteCount = 0;

            for (const event of events) {
                // Check if it's a poll or vote event
                const isPoll = !event.tags.some(tag => tag[0] === 'e');
                
                if (isPoll) {
                    console.log('[PollService] Processing poll event:', {
                        id: event.id,
                        pubkey: event.pubkey,
                        created_at: event.created_at,
                        tags: event.tags
                    });
                    await this.eventBus.publish(NostrEventType.POLL, event);
                    pollCount++;
                } else {
                    console.log('[PollService] Processing vote event:', {
                        id: event.id,
                        pubkey: event.pubkey,
                        created_at: event.created_at,
                        tags: event.tags
                    });
                    await this.eventBus.publish(NostrEventType.VOTE, event);
                    voteCount++;
                }
            }

            console.log(`[PollService] Processed ${pollCount} polls and ${voteCount} votes`);
            new Notice(`Found ${events.length} poll events (${pollCount} polls, ${voteCount} votes)`);

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
            
            // Create frontmatter
            const frontmatter: PollFrontmatter = {
                id: event.id,
                pubkey: event.pubkey,
                created: event.created_at,
                kind: event.kind,
                question: pollData.question,
                options: pollData.options,
                poll_type: pollData.pollType,
                total_votes: 0,
                closed: false,
                nostr_tags: event.tags,
                tags: event.tags
                    .filter(tag => tag[0] === 't')
                    .map(tag => tag[1])
            };

            // Format content
            const content = this.formatPollContent(frontmatter);
            
            // Save poll using FileService
            await this.fileService.savePoll(frontmatter, content);
            console.log('[PollService] Poll saved successfully');

            // Update state
            this.stateManager.addPoll(event.id, frontmatter);
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

            // Get poll ID and option from event
            const pollId = event.tags.find(tag => tag[0] === 'e')?.[1];
            const optionId = event.tags.find(tag => tag[0] === 'option')?.[1];

            if (!pollId || !optionId) {
                console.error('[PollService] Missing poll ID or option ID in vote event');
                return;
            }

            console.log('[PollService] Processing vote:', {
                pollId,
                optionId,
                voter: event.pubkey
            });

            // Update poll state
            const updated = await this.stateManager.addVote(pollId, optionId, event.pubkey);
            if (updated) {
                console.log('[PollService] Vote recorded successfully');
                
                // Update poll file
                const poll = this.stateManager.getPoll(pollId);
                if (poll) {
                    const content = this.formatPollContent(poll);
                    await this.fileService.savePoll(poll, content);
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
        pollType: 'singlechoice' | 'multiplechoice';
    } {
        const options: PollOption[] = event.tags
            .filter(tag => tag[0] === 'option')
            .map(tag => ({
                id: tag[1],
                text: tag[2],
                votes: 0
            }));

        const pollType = event.tags.find(tag => tag[0] === 'polltype')?.[1] === 'multiplechoice'
            ? 'multiplechoice'
            : 'singlechoice';

        return {
            question: event.content,
            options,
            pollType
        };
    }

    private formatPollContent(poll: PollFrontmatter): string {
        const frontmatter = {
            ...poll,
            created_at: new Date(poll.created * 1000).toISOString()
        };

        const optionsList = poll.options
            .map(opt => `- [ ] ${opt.text} (${opt.votes} votes)`)
            .join('\n');

        return `---
${JSON.stringify(frontmatter, null, 2)}
---

# ${poll.question}

_${poll.poll_type === 'singlechoice' ? 'Single choice' : 'Multiple choice'} poll_

## Options
${optionsList}

Total votes: ${poll.total_votes}
`;
    }
}
