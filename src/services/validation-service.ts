import { NostrEvent } from '../types';

export class ValidationService {
    static validateNpub(npub: string): boolean {
        return npub.startsWith('npub1') && npub.length === 63;
    }

    static validateHex(hex: string): boolean {
        return /^[0-9a-fA-F]{64}$/.test(hex);
    }

    static validateEvent(event: NostrEvent): boolean {
        return (
            event &&
            typeof event.id === 'string' &&
            typeof event.pubkey === 'string' &&
            typeof event.created_at === 'number' &&
            typeof event.kind === 'number' &&
            Array.isArray(event.tags) &&
            typeof event.content === 'string' &&
            typeof event.sig === 'string'
        );
    }

    static validateLimit(limit: number): boolean {
        return limit > 0 && limit <= 500;
    }

    static validateRelayUrl(url: string): boolean {
        try {
            const parsed = new URL(url);
            return parsed.protocol === 'wss:' || parsed.protocol === 'ws:';
        } catch {
            return false;
        }
    }

    static validateProfile(profile: any): boolean {
        return (
            profile &&
            typeof profile.pubkey === 'string' &&
            profile.pubkey.length === 64 &&
            (typeof profile.displayName === 'string' || typeof profile.name === 'string') &&
            (profile.about === undefined || typeof profile.about === 'string') &&
            (profile.picture === undefined || typeof profile.picture === 'string') &&
            (profile.nip05 === undefined || typeof profile.nip05 === 'string')
        );
    }
}
