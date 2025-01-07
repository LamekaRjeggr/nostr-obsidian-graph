import { App, TFile } from 'obsidian';

export interface IObsidianFileService {
    createOrUpdateFile(path: string, content: string): Promise<TFile>;
    readFile(file: TFile): Promise<string>;
    getFrontmatter(content: string): any;
    getFrontmatterFromCache(file: TFile): any;
    createFrontmatter(data: any): string;
    getProfileFrontmatter(pubkey: string): any;
}

export class ObsidianFileService implements IObsidianFileService {
    constructor(private app: App) {}

    async createOrUpdateFile(path: string, content: string): Promise<TFile> {
        const file = this.app.vault.getAbstractFileByPath(path);
        if (file instanceof TFile) {
            await this.app.vault.modify(file, content);
            return file;
        } else {
            return await this.app.vault.create(path, content);
        }
    }

    async readFile(file: TFile): Promise<string> {
        return await this.app.vault.read(file);
    }

    getFrontmatter(content: string): any {
        const match = content.match(/^---\n([\s\S]*?)\n---/);
        if (match) {
            try {
                const cache = this.app.metadataCache.getCache(match[1]);
                return cache?.frontmatter || null;
            } catch (error) {
                console.error('Failed to parse frontmatter:', error);
                return null;
            }
        }
        return null;
    }

    getFrontmatterFromCache(file: TFile): any {
        const cache = this.app.metadataCache.getCache(file.path);
        return cache?.frontmatter || null;
    }

    createFrontmatter(data: any): string {
        // Convert arrays to YAML-style arrays
        const yamlData = Object.entries(data).reduce((acc, [key, value]) => {
            if (Array.isArray(value)) {
                acc[key] = value.map(item => 
                    typeof item === 'string' ? `"${item}"` : item
                );
            } else if (typeof value === 'string') {
                acc[key] = `"${value}"`;
            } else {
                acc[key] = value;
            }
            return acc;
        }, {} as Record<string, any>);

        // Convert to YAML format
        const yaml = Object.entries(yamlData)
            .map(([key, value]) => {
                if (Array.isArray(value)) {
                    return `${key}:\n${value.map(v => `  - ${v}`).join('\n')}`;
                }
                return `${key}: ${value}`;
            })
            .join('\n');

        return [
            '---',
            yaml,
            '---'
        ].join('\n');
    }

    getProfileFrontmatter(pubkey: string): any {
        const profilePath = `nostr/user profile/${pubkey}.md`;
        const file = this.app.vault.getAbstractFileByPath(profilePath);
        if (file instanceof TFile) {
            return this.getFrontmatterFromCache(file);
        }
        return null;
    }
}
