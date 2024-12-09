import { ProfileData } from '../../../types';
import { TextProcessor } from '../utils/text-processor';

export interface ProfileFormatOptions {
    includeReferences?: boolean;
    useDisplayName?: boolean;
}

export class ProfileContentFormatter {
    formatContent(profile: ProfileData, options: ProfileFormatOptions = {}): string {
        const sections = [
            this.formatHeader(profile),
            this.formatFrontmatter(profile),
            this.formatBody(profile)
        ];

        if (options.includeReferences) {
            sections.push(this.formatReferences());
        }

        return sections.filter(section => section !== '').join('\n\n');
    }

    private formatHeader(profile: ProfileData): string {
        const displayName = profile.displayName || 
                          profile.name || 
                          `Nostr User ${profile.pubkey.slice(0, 8)}`;
        return `# ${displayName}`;
    }

    private formatFrontmatter(profile: ProfileData): string {
        const frontmatter = [
            '---',
            'aliases:',
            `  - ${profile.pubkey}`,  // Store pubkey as alias for linking
            profile.nip05 ? `nip05: ${profile.nip05}` : '',
            profile.picture ? `picture: ${profile.picture}` : '',
            profile.name ? `name: ${profile.name}` : '',
            profile.displayName ? `display_name: ${profile.displayName}` : '',
            '---'
        ];

        return frontmatter.filter(line => line !== '').join('\n');
    }

    private formatBody(profile: ProfileData): string {
        if (!profile.about) return '';
        return TextProcessor.cleanContent(profile.about);
    }

    private formatReferences(): string {
        return [
            '## References',
            '### Author Of',  // Notes where this profile is the author
            '### Mentioned In',  // Notes where this profile is mentioned
            '### Contacts'  // Other profiles this profile follows
        ].join('\n');
    }
}
