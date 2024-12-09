import { NostrEvent, ProfileData } from '../types';
import { KeyService } from './core/key-service';

export class ValidationService {
    static validateEvent(event: NostrEvent): boolean {
        if (!event) return false;

        return (
            typeof event.id === 'string' &&
            event.id.length === 64 &&
            typeof event.pubkey === 'string' &&
            event.pubkey.length === 64 &&
            typeof event.created_at === 'number' &&
            event.created_at > 0 &&
            typeof event.kind === 'number' &&
            Array.isArray(event.tags) &&
            typeof event.content === 'string' &&
            typeof event.sig === 'string' &&
            event.sig.length === 128
        );
    }

    static validateNpub(npub: string): boolean {
        if (!npub || typeof npub !== 'string') return false;
        return KeyService.validateNpub(npub);
    }

    static validateRelayUrl(url: string): boolean {
        if (!url || typeof url !== 'string') return false;
        try {
            const parsed = new URL(url);
            return parsed.protocol === 'wss:';
        } catch {
            return false;
        }
    }

    static validateLimit(limit: number): boolean {
        return typeof limit === 'number' && limit > 0;  // Removed upper limit
    }

    static validateProfile(profile: ProfileData): boolean {
        if (!profile || typeof profile !== 'object') return false;
        
        return (
            typeof profile.pubkey === 'string' &&
            profile.pubkey.length === 64 &&
            (profile.displayName === undefined || typeof profile.displayName === 'string') &&
            (profile.name === undefined || typeof profile.name === 'string') &&
            (profile.about === undefined || typeof profile.about === 'string') &&
            (profile.picture === undefined || typeof profile.picture === 'string') &&
            (profile.nip05 === undefined || typeof profile.nip05 === 'string')
        );
    }
}
