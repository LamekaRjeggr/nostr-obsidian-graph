import { App, TFile } from 'obsidian';
import { 
    IVaultService, 
    IIndexService, 
    IObsidianFileService,
    IProfileFileService,
    INoteFileService,
    IFollowFileService
} from '../../interfaces';
import { NostrEvent } from '../../interfaces';

export class VaultService implements IVaultService {
    private readonly baseDir = 'nostr';
    private readonly notesDir = 'nostr/user notes';
    private readonly profilesDir = 'nostr/user profile';
    private readonly followsDir = 'nostr/user follows';
    private readonly followedProfilesDir = 'nostr/followed profiles';

    constructor(
        private app: App,
        private indexService: IIndexService,
        private obsidianFileService: IObsidianFileService,
        private profileFileService: IProfileFileService,
        private noteFileService: INoteFileService,
        private followFileService: IFollowFileService
    ) {}

    async saveEvent(event: NostrEvent, isFollowedProfile: boolean = false): Promise<void> {
        switch (event.kind) {
            case 0:
                if (isFollowedProfile) {
                    await this.profileFileService.saveProfile(event, this.followedProfilesDir);
                } else {
                    await this.profileFileService.saveProfile(event, this.profilesDir);
                }
                break;
            case 1:
                await this.noteFileService.saveNote(event);
                break;
            case 3:
                await this.followFileService.saveFollow(event);
                break;
            default:
                throw new Error(`Unsupported event kind: ${event.kind}`);
        }
    }

    async ensureDirectories(): Promise<void> {
        const dirs = [
            this.baseDir,
            this.notesDir,
            this.profilesDir,
            this.followsDir,
            this.followedProfilesDir
        ];

        for (const dir of dirs) {
            if (!await this.app.vault.adapter.exists(dir)) {
                await this.app.vault.createFolder(dir);
            }
        }
    }

    async getEvent(id: string): Promise<NostrEvent> {
        const file = await this.indexService.findEventFile(id);
        if (!file) {
            throw new Error(`Event not found: ${id}`);
        }

        const frontmatter = this.obsidianFileService.getFrontmatterFromCache(file);
        if (!frontmatter?.event) {
            throw new Error(`Invalid event file: ${file.path}`);
        }

        return frontmatter.event;
    }

    async getEventsByKind(kind: number): Promise<NostrEvent[]> {
        const files = await this.indexService.findEventsByKind(kind);
        return this.indexService.getEventsFromFiles(files);
    }

    async getEventsByAuthor(pubkey: string): Promise<NostrEvent[]> {
        const files = await this.indexService.findEventsByAuthor(pubkey);
        return this.indexService.getEventsFromFiles(files);
    }
}
