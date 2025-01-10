import { EventEmitter } from '../services/event-emitter';
import { FileService } from '../services/file-service';
import { 
    NostrEvent, 
    NostrProfile, 
    NostrSettings,
    RelayConnection,
    SubscriptionOptions,
    NoteFile,
    ContactList,
    NotesFilter,
    BasicWebSocket
} from '../types';
import { SimplePool, Filter, Event } from 'nostr-tools';

const DEFAULT_RELAYS = [
    'wss://relay.damus.io',
    'wss://relay.nostr.band',
    'wss://nos.lol',
    'wss://nostr.wine',
    'wss://relay.nostr.bg',
    'wss://nostr.fmt.wiz.biz',
    'wss://relay.snort.social'
];

export class NostrService {
    private pool: SimplePool;
    private eventEmitter: EventEmitter;
    private settings: NostrSettings;
    private relayUrls: string[];
    private profileCache: Map<string, NostrProfile>;
    private processedNotes: Set<string>;

    constructor(settings: NostrSettings, eventEmitter: EventEmitter) {
        this.pool = new SimplePool();
        this.settings = settings;
        this.eventEmitter = eventEmitter;
        this.profileCache = new Map();
        this.processedNotes = new Set();
        
        // Combine user's relays with default relays
        const userRelays = settings.relays
            .filter(relay => relay.enabled)
            .map(relay => relay.url);
        this.relayUrls = [...new Set([...userRelays, ...DEFAULT_RELAYS])];
    }

    async initialize(): Promise<void> {
        console.log('Initializing Nostr service with relays:', this.relayUrls);
    }

    getConnectionStatus(): RelayConnection[] {
        return this.settings.relays.map(relay => ({
            url: relay.url,
            enabled: relay.enabled,
            status: relay.enabled ? 'connected' : 'disconnected' // Simplified status mapping
        }));
    }

    getConnectedRelays(): RelayConnection[] {
        return this.settings.relays
            .filter(relay => relay.enabled)
            .map(relay => ({
                url: relay.url,
                enabled: relay.enabled,
                status: 'connected'
            }));
    }

    async disconnect(): Promise<void> {
        console.log('Disconnecting from all relays...');
        this.pool.close(this.relayUrls);
    }

    subscribe(options: SubscriptionOptions): void {
        const sub = this.pool.sub(this.relayUrls, options.filters || []);
        
        sub.on('event', (event: Event) => {
            console.log('Received event:', {
                kind: event.kind,
                pubkey: event.pubkey,
                content: event.content.substring(0, 100) + '...'
            });

            if (event.kind === 3) { // Contact list
                const pTags = event.tags.filter((tag: string[]) => tag[0] === 'p');
                console.log('Contact list event:', {
                    pubkey: event.pubkey,
                    totalTags: event.tags.length,
                    pTags: pTags.length,
                    contacts: pTags.map((tag: string[]) => tag[1])
                });

                // Get contacts and fetch their metadata
                const contacts = pTags.map((tag: string[]) => tag[1]);
                this.fetchProfileMetadata(contacts);
            } else if (event.kind === 0) { // Profile metadata
                this.processProfileMetadata(event);
            } else if (event.kind === 1) { // Text note
                const noteFile: NoteFile = {
                    id: event.id,
                    content: event.content,
                    pubkey: event.pubkey,
                    created_at: event.created_at,
                    tags: event.tags,
                    mentions: event.tags
                        .filter((tag: string[]) => tag[0] === 'p')
                        .map((tag: string[]) => tag[1])
                };
                console.log('Text note:', {
                    id: noteFile.id,
                    pubkey: noteFile.pubkey,
                    content: noteFile.content.substring(0, 100) + '...'
                });
                this.processedNotes.add(noteFile.id);
                this.eventEmitter.emit('note-processed', noteFile);

                // Fetch likes for this note
                this.fetchLikesForNote(noteFile.id);
            } else if (event.kind === 7) { // Like/Reaction
                // Find the note being liked (in e-tags)
                const eTags = event.tags.filter(tag => tag[0] === 'e');
                if (eTags.length > 0) {
                    const noteId = eTags[0][1];  // Get first e-tag value
                    console.log('Like event:', {
                        noteId,
                        liker: event.pubkey,
                        timestamp: event.created_at
                    });
                    this.eventEmitter.emit('like-processed', {
                        noteId,
                        pubkey: event.pubkey,
                        created_at: event.created_at
                    });
                }
            }
        });

        sub.on('eose', () => {
            console.log('End of stored events');
        });
    }

    private async fetchLikesForNote(noteId: string): Promise<void> {
        console.log(`Fetching likes for note: ${noteId}`);
        this.subscribe({
            filters: [{
                kinds: [7],  // Like events
                '#e': [noteId],  // For this specific note
                limit: 100
            }]
        });
    }

    private processProfileMetadata(event: Event): void {
        try {
            const metadata = JSON.parse(event.content);
            const profile: NostrProfile = {
                pubkey: event.pubkey,
                name: metadata.name || 'Unknown',
                about: metadata.about,
                picture: metadata.picture,
                nip05: metadata.nip05
            };
            console.log('Profile metadata:', profile);
            
            // Cache the profile
            this.profileCache.set(event.pubkey, profile);
            
            // Emit the profile
            this.eventEmitter.emit('profile-processed', profile);
        } catch (error) {
            console.error('Error processing profile metadata:', error);
        }
    }

    private async fetchProfileMetadata(pubkeys: string[]): Promise<void> {
        console.log(`Fetching metadata for ${pubkeys.length} profiles...`);
        
        try {
            // First try to get metadata directly
            const metadataEvents = await this.pool.list(this.relayUrls, [{
                kinds: [0],
                authors: pubkeys
            }]) as Event[];

            console.log(`Received ${metadataEvents.length} profile metadata events`);

            // Process each metadata event
            metadataEvents.forEach(event => this.processProfileMetadata(event));

            // For any pubkeys without metadata, create default profiles
            const missingPubkeys = pubkeys.filter(pubkey => !this.profileCache.has(pubkey));
            missingPubkeys.forEach(pubkey => {
                const defaultProfile: NostrProfile = {
                    pubkey,
                    name: `Nostr User ${pubkey.substring(0, 8)}`
                };
                this.profileCache.set(pubkey, defaultProfile);
                this.eventEmitter.emit('profile-processed', defaultProfile);
            });

            // Now fetch notes from these profiles
            this.subscribe({
                filters: [{
                    kinds: [1],
                    authors: pubkeys,
                    limit: this.settings.notesPerProfile
                }]
            });
        } catch (error) {
            console.error('Error fetching profile metadata:', error);
            // Create default profiles for all pubkeys on error
            pubkeys.forEach(pubkey => {
                if (!this.profileCache.has(pubkey)) {
                    const defaultProfile: NostrProfile = {
                        pubkey,
                        name: `Nostr User ${pubkey.substring(0, 8)}`
                    };
                    this.profileCache.set(pubkey, defaultProfile);
                    this.eventEmitter.emit('profile-processed', defaultProfile);
                }
            });
        }
    }

    async processAndSaveFollowedNotes(pubkey: string): Promise<void> {
        try {
            console.log('Starting to fetch and process notes...');
            
            // First, get the contact list with timeout
            console.log(`Fetching contact list for ${pubkey}...`);
            const contactListPromise = this.pool.list(this.relayUrls, [{
                kinds: [3],
                authors: [pubkey],
                limit: 1
            }]) as Promise<Event[]>;

            // Add timeout for contact list fetch
            const timeoutPromise = new Promise<Event[]>((_, reject) => {
                setTimeout(() => reject(new Error('Contact list fetch timeout')), 10000);
            });

            const contactListEvents = await Promise.race<Event[]>([
                contactListPromise,
                timeoutPromise
            ]).catch(error => {
                console.error('Error fetching contact list:', error);
                return [] as Event[];
            });

            if (contactListEvents.length === 0) {
                console.log('No contact list found, trying subscription method...');
                
                // Try subscription method
                return new Promise<void>((resolve, reject) => {
                    const sub = this.pool.sub(this.relayUrls, [{
                        kinds: [3],
                        authors: [pubkey],
                        limit: 1
                    }]);

                    let contactList: Event | null = null;
                    const timeout = setTimeout(() => {
                        sub.unsub();
                        if (!contactList) {
                            reject(new Error('Contact list subscription timeout'));
                        }
                    }, 10000);

                    sub.on('event', async (event: Event) => {
                        console.log('Received contact list event:', {
                            kind: event.kind,
                            pubkey: event.pubkey,
                            tags: event.tags.length
                        });
                        contactList = event;
                        clearTimeout(timeout);
                        sub.unsub();

                        // Get contacts and fetch their metadata
                        const contacts = event.tags
                            .filter((tag: string[]) => tag[0] === 'p')
                            .map((tag: string[]) => tag[1]);
                        await this.fetchProfileMetadata(contacts);
                        resolve();
                    });
                });
            }

            // Get the most recent contact list
            const contactList = contactListEvents[0];
            if (contactList) {
                const contacts = contactList.tags
                    .filter((tag: string[]) => tag[0] === 'p')
                    .map((tag: string[]) => tag[1]);
                await this.fetchProfileMetadata(contacts);
            }

        } catch (error) {
            console.error('Error processing and saving followed notes:', error);
            throw error;
        }
    }

    getProfile(pubkey: string): NostrProfile | undefined {
        return this.profileCache.get(pubkey);
    }
}
