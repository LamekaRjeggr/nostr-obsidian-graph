import { NoteFrontmatter, ProfileFrontmatter } from '../../../types';

export const FrontmatterUtil = {
    formatFrontmatter(data: Record<string, any>): string {
        return Object.entries(data)
            .filter(([_, v]) => v !== undefined)
            .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
            .join('\n');
    },

    createNoteFrontmatter(data: Partial<NoteFrontmatter>, existing: Partial<NoteFrontmatter> = {}): NoteFrontmatter {
        return {
            ...existing,
            ...data,
            tags: Array.from(new Set([
                ...(existing.tags || []),
                ...(data.tags || [])
            ]))
        } as NoteFrontmatter;
    },

    createProfileFrontmatter(data: Partial<ProfileFrontmatter>, existing: Partial<ProfileFrontmatter> = {}): ProfileFrontmatter {
        return {
            ...existing,
            ...data,
            aliases: Array.from(new Set([
                ...(existing.aliases || []),
                ...(data.aliases || [])
            ]))
        } as ProfileFrontmatter;
    }
};
