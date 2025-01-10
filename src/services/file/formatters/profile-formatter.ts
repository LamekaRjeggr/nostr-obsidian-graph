import { ProfileData } from '../../../types';
import { ContentProcessor } from '../utils/text-processor';
import { ProfileContentFormatter, ProfileFormatOptions } from './profile-content-formatter';

export interface ProfileFormatterOptions extends ProfileFormatOptions {
    // Options for content formatting
}

export class ProfileFormatter {
    private contentFormatter: ProfileContentFormatter;

    constructor() {
        this.contentFormatter = new ProfileContentFormatter();
    }

    formatProfile(profile: ProfileData, existingContent?: string, options: ProfileFormatterOptions = {}): string {
        return this.contentFormatter.formatContent(profile, options, existingContent);
    }

    getDisplayName(profile: ProfileData): string {
        // Keep display name for title and UI
        return profile.displayName || 
               profile.name || 
               `Nostr User ${profile.pubkey.slice(0, 8)}`;
    }

    getFileName(profile: ProfileData): string {
        const displayName = this.getDisplayName(profile);
        const sanitized = ContentProcessor.cleanContent(displayName);
        return `${sanitized}.md`;
    }
}
