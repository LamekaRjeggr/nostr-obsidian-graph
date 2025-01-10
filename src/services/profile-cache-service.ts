import { NostrProfile } from '../types';
import { EventEmitter } from './event-emitter';

/**
 * Handles the in-memory storage and retrieval of profiles
 * Single Responsibility: Profile data caching
 */
export class ProfileCacheService {
    private profileCache: Map<string, NostrProfile>;
    private eventEmitter: EventEmitter;

    constructor(eventEmitter: EventEmitter) {
        this.profileCache = new Map();
        this.eventEmitter = eventEmitter;
    }

    /**
     * Store a profile in the cache
     */
    set(profile: NostrProfile): void {
        this.profileCache.set(profile.pubkey, profile);
        this.eventEmitter.emit('profile-cached', profile);
    }

    /**
     * Retrieve a profile from the cache
     */
    get(pubkey: string): NostrProfile | undefined {
        return this.profileCache.get(pubkey);
    }

    /**
     * Check if a profile exists in the cache
     */
    has(pubkey: string): boolean {
        return this.profileCache.has(pubkey);
    }

    /**
     * Remove a profile from the cache
     */
    delete(pubkey: string): boolean {
        const hadProfile = this.profileCache.delete(pubkey);
        if (hadProfile) {
            this.eventEmitter.emit('profile-removed', pubkey);
        }
        return hadProfile;
    }

    /**
     * Clear all profiles from the cache
     */
    clear(): void {
        this.profileCache.clear();
        this.eventEmitter.emit('cache-cleared');
    }

    /**
     * Get all cached profiles
     */
    getAll(): NostrProfile[] {
        return Array.from(this.profileCache.values());
    }

    /**
     * Get all cached pubkeys
     */
    getAllPubkeys(): string[] {
        return Array.from(this.profileCache.keys());
    }

    /**
     * Update an existing profile in the cache
     * Returns false if profile didn't exist
     */
    update(profile: NostrProfile): boolean {
        if (!this.has(profile.pubkey)) {
            return false;
        }
        this.set(profile);
        return true;
    }

    /**
     * Get the number of cached profiles
     */
    size(): number {
        return this.profileCache.size;
    }

    /**
     * Batch update multiple profiles
     * Returns number of profiles updated
     */
    batchUpdate(profiles: NostrProfile[]): number {
        let updated = 0;
        profiles.forEach(profile => {
            if (this.update(profile)) {
                updated++;
            }
        });
        return updated;
    }

    /**
     * Find profiles matching a predicate
     */
    find(predicate: (profile: NostrProfile) => boolean): NostrProfile[] {
        return Array.from(this.profileCache.values()).filter(predicate);
    }
}
