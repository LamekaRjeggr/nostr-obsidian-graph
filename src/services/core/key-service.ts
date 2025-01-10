import { nip19 } from 'nostr-tools';
import { Notice } from 'obsidian';

export class KeyService {
    static npubToHex(npub: string): string | null {
        try {
            const decoded = nip19.decode(npub);
            if (decoded.type !== 'npub') {
                new Notice('Invalid npub format');
                return null;
            }
            return decoded.data as string;
        } catch {
            new Notice('Failed to decode npub');
            return null;
        }
    }

    static hexToNpub(hex: string): string | null {
        try {
            return nip19.npubEncode(hex);
        } catch {
            new Notice('Failed to encode hex to npub');
            return null;
        }
    }

    static validateNpub(npub: string): boolean {
        if (!npub || !npub.startsWith('npub1')) {
            return false;
        }
        return this.npubToHex(npub) !== null;
    }

    static validateHex(hex: string): boolean {
        if (!hex) return false;
        return /^[0-9a-f]{64}$/i.test(hex);
    }

    static extractMentions(tags: string[][]): string[] {
        return tags
            .filter(tag => tag[0] === 'p')
            .map(tag => tag[1])
            .filter(hex => this.validateHex(hex));
    }
}
