import { ProfileData } from '../../../types';
import { ContentProcessor } from '../utils/text-processor';
import { YAMLProcessor } from '../utils/yaml-processor';

export interface ProfileFormatOptions {
    includeReferences?: boolean;
    useDisplayName?: boolean;
}

export class ProfileContentFormatter {
    formatContent(profile: ProfileData, options: ProfileFormatOptions = {}, existingContent?: string): string {
        // Parse existing content if provided
        const parsed = existingContent ? 
            YAMLProcessor.parse(existingContent) : 
            { frontmatter: {}, content: '' };

        // Generate required frontmatter
        const requiredFrontmatter = this.generateRequiredFrontmatter(profile);

        // Merge with existing frontmatter, preserving user-added fields
        const mergedFrontmatter = YAMLProcessor.mergeYAML(parsed.frontmatter, requiredFrontmatter);

        const sections = [
            this.formatHeader(profile),
            YAMLProcessor.stringify(mergedFrontmatter),
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

    private generateRequiredFrontmatter(profile: ProfileData): Record<string, any> {
        const frontmatter: Record<string, any> = {
            aliases: [profile.pubkey]  // Store pubkey as alias for linking
        };

        if (profile.nip05) {
            frontmatter.nip05 = profile.nip05;
        }

        if (profile.picture) {
            frontmatter.picture = profile.picture;
        }

        if (profile.name) {
            frontmatter.name = profile.name;
        }

        if (profile.displayName) {
            frontmatter.display_name = profile.displayName;
        }

        return frontmatter;
    }

    private formatBody(profile: ProfileData): string {
        if (!profile.about) return '';
        return ContentProcessor.cleanContent(profile.about);
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
