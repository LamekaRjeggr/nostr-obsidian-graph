import { NostrEvent, ProfileData } from '../../types';

export class ProfileCacheService {
    private cache: Map<string, ProfileData> = new Map();

    set(pubkey: string, data: ProfileData): void {
        this.cache.set(pubkey, data);
    }

    get(pubkey: string): ProfileData | undefined {
        return this.cache.get(pubkey);
    }

    has(pubkey: string): boolean {
        return this.cache.has(pubkey);
    }

    processMetadataEvent(event: NostrEvent): void {
        if (event.kind !== 0) return;
        
        try {
            const metadata = JSON.parse(event.content);
            
            // According to NIP-01, try display_name first, then name
            const displayName = metadata.display_name || metadata.displayName || metadata.name;
            
            this.set(event.pubkey, {
                pubkey: event.pubkey,
                displayName,
                name: metadata.name,
                about: metadata.about,
                picture: metadata.picture,
                nip05: metadata.nip05
            });
        } catch (error) {
            // Silent fail for invalid metadata
            return;
        }
    }

    clear(): void {
        this.cache.clear();
    }
}
