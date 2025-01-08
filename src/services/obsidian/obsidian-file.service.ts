import { App, TFile, TFolder, CachedMetadata } from 'obsidian';

// Type for frontmatter data
export interface FrontmatterData {
    created?: string;
    kind?: number;
    id?: string;
    pubkey?: string;
    nostr_tags?: string[][];
    name?: string;
    display_name?: string;
    nip05?: string;
    [key: string]: any;
}

export interface IObsidianFileService {
    createOrUpdateFile(path: string, content: string): Promise<TFile>;
    readFile(file: TFile): Promise<string>;
    getFrontmatter(content: string): any;  // Keep original signature
    getFrontmatterFromCache(file: TFile): any;  // Keep for compatibility
    createFrontmatter(data: any): string;
    getProfileFrontmatter(pubkey: string): any;
    getFileByPath(path: string): TFile | null;  // New method for file lookup
}

export class ObsidianFileService implements IObsidianFileService {
    private metadataCache: Map<string, CachedMetadata> = new Map();

    constructor(private app: App) {
        // Listen for metadata changes
        this.app.metadataCache.on('changed', (file: TFile, _data: string, cache: CachedMetadata) => {
            this.metadataCache.set(file.path, cache);
        });
    }

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

    // Parse frontmatter from raw content string
    getFrontmatter(content: string): any {
        const match = content.match(/^---\n([\s\S]*?)\n---/);
        if (!match) return null;

        try {
            const lines = match[1].split('\n');
            const result: Record<string, any> = {};

            for (const line of lines) {
                const [key, ...valueParts] = line.split(':').map(part => part.trim());
                if (!key || !valueParts.length) continue;

                const rawValue = valueParts.join(':').trim();
                let parsedValue: any;
                
                // Handle arrays
                if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
                    parsedValue = rawValue.slice(1, -1).split(',').map(v => v.trim());
                }
                // Handle quoted strings
                else if (rawValue.startsWith('"') && rawValue.endsWith('"')) {
                    parsedValue = rawValue.slice(1, -1);
                }
                // Handle numbers
                else if (!isNaN(Number(rawValue))) {
                    parsedValue = Number(rawValue);
                }
                // Handle booleans
                else if (rawValue === 'true') {
                    parsedValue = true;
                }
                else if (rawValue === 'false') {
                    parsedValue = false;
                }
                // Default to string
                else {
                    parsedValue = rawValue;
                }

                result[key] = parsedValue;
            }

            return result;
        } catch (error) {
            console.error('Failed to parse frontmatter:', error);
            return null;
        }
    }

    // Get frontmatter from Obsidian's cache
    getFrontmatterFromCache(file: TFile): any {
        const cache = this.app.metadataCache.getFileCache(file);
        return cache?.frontmatter || null;
    }

    // Internal method using new approach
    private async getFrontmatterInternal(file: TFile): Promise<FrontmatterData | null> {
        try {
            // Try cache first
            let cache = this.metadataCache.get(file.path);
            if (!cache) {
                // Get from Obsidian's cache if not in our cache
                cache = this.app.metadataCache.getFileCache(file);
                if (cache) {
                    this.metadataCache.set(file.path, cache);
                }
            }
            return cache?.frontmatter || null;
        } catch (error) {
            console.error(`Failed to get frontmatter for ${file.path}:`, error);
            return null;
        }
    }

    createFrontmatter(data: any): string {
        try {
            // Handle arrays and strings with proper YAML escaping
            const formatValue = (value: any): string => {
                if (Array.isArray(value)) {
                    if (value.length === 0) return '[]';
                    return '\n' + value.map(v => `  - ${formatValue(v)}`).join('\n');
                }
                if (typeof value === 'string') {
                    // Escape special characters and quotes
                    if (value.includes('\n') || value.includes('"')) {
                        return `|
  ${value.replace(/\n/g, '\n  ')}`;
                    }
                    return `"${value.replace(/"/g, '\\"')}"`;
                }
                return String(value);
            };

            // Build YAML entries
            const yaml = Object.entries(data)
                .filter(([_, value]) => value !== undefined) // Skip undefined values
                .map(([key, value]) => `${key}: ${formatValue(value)}`)
                .join('\n');

            return ['---', yaml, '---'].join('\n');
        } catch (error) {
            console.error('Failed to create frontmatter:', error);
            throw new Error('Failed to create frontmatter');
        }
    }

    getProfileFrontmatter(pubkey: string): any {
        // First try to find profile by pubkey
        const profilePath = `nostr/user profile/${pubkey}.md`;
        let file = this.getFileByPath(profilePath);
        
        // If not found by pubkey, search through all profiles
        if (!file) {
            const profileDir = this.app.vault.getAbstractFileByPath('nostr/user profile');
            if (profileDir instanceof TFolder) {
                for (const child of profileDir.children) {
                    if (child instanceof TFile) {
                        const frontmatter = this.getFrontmatterFromCache(child);
                        if (frontmatter?.pubkey === pubkey) {
                            file = child;
                            break;
                        }
                    }
                }
            }
        }

        return file ? this.getFrontmatterFromCache(file) : null;
    }

    getFileByPath(path: string): TFile | null {
        const file = this.app.vault.getAbstractFileByPath(path);
        return file instanceof TFile ? file : null;
    }

    // Clean up method to be called when plugin unloads
    onunload() {
        this.metadataCache.clear();
    }
}
