import { NostrSettings, ProfileData } from '../../types';
import { ValidationService } from '../validation-service';
import { EventEmitter } from '../event-emitter';
import { FileService } from '../core/file-service';

export class ProfileManagerService {
    private mainPubkey: string | null = null;

    constructor(
        private settings: NostrSettings,
        private eventEmitter: EventEmitter,
        private fileService: FileService
    ) {}

    setMainPubkey(pubkey: string): void {
        this.mainPubkey = pubkey;
    }

    getMainPubkey(): string | null {
        return this.mainPubkey;
    }

    async processProfile(
        pubkey: string,
        metadata: any
    ): Promise<void> {
        const profile = this.createProfile(pubkey, metadata);
        if (profile) {
            await this.fileService.saveProfile(profile);
            this.eventEmitter.emit('profile-processed', profile);
        }
    }

    private createProfile(
        pubkey: string,
        metadata: any
    ): ProfileData | null {
        const profile: ProfileData = {
            pubkey,
            displayName: metadata?.display_name || metadata?.name,
            name: metadata?.name,
            about: metadata?.about,
            picture: metadata?.picture,
            nip05: metadata?.nip05
        };

        if (!ValidationService.validateProfile(profile)) {
            console.error('Invalid profile data:', profile);
            return null;
        }

        return profile;
    }

    clear(): void {
        this.mainPubkey = null;
    }
}
