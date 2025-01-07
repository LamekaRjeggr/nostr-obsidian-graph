import { IKeyService } from '../../interfaces';
import { nip19 } from 'nostr-tools';

export class KeyService implements IKeyService {

    async npubToHex(npub: string): Promise<string> {
        if (!npub.startsWith('npub')) {
            throw new Error('Invalid npub format');
        }
        try {
            const { data: hex } = nip19.decode(npub);
            return hex as string;
        } catch (error) {
            throw new Error('Invalid npub format');
        }
    }

    async hexToNpub(hex: string): Promise<string> {
        if (!/^[0-9a-f]{64}$/i.test(hex)) {
            throw new Error('Invalid hex format');
        }
        try {
            return nip19.npubEncode(hex);
        } catch (error) {
            throw new Error('Invalid hex format');
        }
    }
}
