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

    static validateProfileEvent(event: NostrEvent): boolean {
        // First validate basic event structure
        if (!this.validateEvent(event)) {
            return false;
        }

        // Validate event kind
        if (event.kind !== 0) {
            return false;
        }

        try {
            // Validate metadata content
            const metadata = JSON.parse(event.content);
            return (
                typeof metadata === 'object' &&
                metadata !== null &&
                (typeof metadata.name === 'string' || typeof metadata.display_name === 'string') &&
                (metadata.about === undefined || typeof metadata.about === 'string') &&
                (metadata.picture === undefined || typeof metadata.picture === 'string') &&
                (metadata.nip05 === undefined || typeof metadata.nip05 === 'string')
            );
        } catch {
            return false;
        }
    }

    static validateContactEvent(event: NostrEvent): boolean {
        // First validate basic event structure
        if (!this.validateEvent(event)) {
            return false;
        }

        // Validate event kind
        if (event.kind !== 3) {
            return false;
        }

        // Validate all 'p' tags contain valid hex pubkeys
        const pTags = event.tags.filter(tag => tag[0] === 'p');
        return pTags.every(tag => tag[1] && this.validateHex(tag[1]));
    }
}
