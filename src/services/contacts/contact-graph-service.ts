import { RelayService } from '../core/relay-service';
import { NostrEvent } from '../../types';
import { EventKinds } from '../core/base-event-handler';

export class ContactGraphService {
    private directFollows: Set<string> = new Set();
    private followsOfFollows: Set<string> = new Set();
    private _initialized: boolean = false;

    constructor(private relayService: RelayService) {}

    isInitialized(): boolean {
        return this._initialized;
    }

    async initialize(userPubkey: string): Promise<void> {
        if (this._initialized) return;

        // Get direct follows from contact list (kind 3)
        const contactList = await this.relayService.subscribe([{
            kinds: [EventKinds.CONTACT],
            authors: [userPubkey],
            limit: 1
        }]);

        if (contactList.length > 0) {
            // Extract pubkeys from p tags
            const follows = contactList[0].tags
                .filter(tag => tag[0] === 'p')
                .map(tag => tag[1]);
            
            // Add to direct follows set
            follows.forEach(pubkey => this.directFollows.add(pubkey));

            // Get follows of follows
            const followsOfFollowsLists = await this.relayService.subscribe([{
                kinds: [EventKinds.CONTACT],
                authors: Array.from(this.directFollows),
                limit: 500
            }]);

            // Extract and add second-degree follows
            followsOfFollowsLists.forEach(event => {
                event.tags
                    .filter(tag => tag[0] === 'p')
                    .map(tag => tag[1])
                    .forEach(pubkey => this.followsOfFollows.add(pubkey));
            });
        }

        this._initialized = true;
    }

    isDirectFollow(pubkey: string): boolean {
        return this.directFollows.has(pubkey);
    }

    isFollowOfFollow(pubkey: string): boolean {
        return this.followsOfFollows.has(pubkey);
    }

    getDirectFollows(): string[] {
        return Array.from(this.directFollows);
    }

    getFollowsOfFollows(): string[] {
        return Array.from(this.followsOfFollows);
    }

    clear(): void {
        this.directFollows.clear();
        this.followsOfFollows.clear();
        this._initialized = false;
    }
}
