import { Vault, TFile, App, Notice } from 'obsidian';

const NOSTR_DIRECTORIES = [
    'nostr/notes',
    'nostr/profiles',
    'nostr/replies',
    'nostr/profiles/mentions',
    'nostr/polls',
    'nostr/User Profile',
    'nostr/User Notes',
    'nostr/Replies to User'
];

export class DirectoryManager {
    constructor(
        private vault: Vault,
        private app: App
    ) {}

    async ensureDirectories(): Promise<void> {
        for (const dir of NOSTR_DIRECTORIES) {
            try {
                const folder = this.vault.getAbstractFileByPath(dir);
                if (!folder) {
                    await this.vault.createFolder(dir);
                }
            } catch (error) {
                console.error(`Error ensuring directory ${dir}:`, error);
                new Notice('Missing directories detected. Please reload Obsidian.');
                throw error;
            }
        }
    }

    async checkDirectories(): Promise<boolean> {
        try {
            for (const dir of NOSTR_DIRECTORIES) {
                const folder = this.vault.getAbstractFileByPath(dir);
                if (!folder) {
                    return false;
                }
            }
            return true;
        } catch (error) {
            console.error('Error checking directories:', error);
            return false;
        }
    }

    async writeFile(path: string, content: string): Promise<void> {
        const file = this.vault.getAbstractFileByPath(path);
        if (file instanceof TFile) {
            await this.vault.modify(file, content);
        } else {
            await this.vault.create(path, content);
        }
    }

    async readFile(path: string): Promise<string> {
        const file = this.vault.getAbstractFileByPath(path);
        if (file instanceof TFile) {
            return await this.vault.read(file);
        }
        throw new Error(`File not found: ${path}`);
    }

    async fileExists(path: string): Promise<boolean> {
        const file = this.vault.getAbstractFileByPath(path);
        return file instanceof TFile;
    }

    async listFiles(directory: string): Promise<string[]> {
        try {
            // Use Obsidian's built-in file listing
            const allFiles = this.vault.getMarkdownFiles();
            return allFiles
                .filter(file => file.path.startsWith(directory))
                .map(file => file.path);
        } catch (error) {
            console.error(`Error listing files in ${directory}:`, error);
            return [];
        }
    }

    async deleteFile(path: string): Promise<void> {
        try {
            const file = this.vault.getAbstractFileByPath(path);
            if (file instanceof TFile) {
                await this.vault.trash(file, true); // Use trash instead of delete for safety
            }
        } catch (error) {
            console.error(`Error deleting file ${path}:`, error);
            throw error;
        }
    }

    getAbstractFile(path: string): TFile | null {
        try {
            const file = this.vault.getAbstractFileByPath(path);
            if (file instanceof TFile) {
                return file;
            }
            return null;
        } catch (error) {
            console.error(`Error getting file ${path}:`, error);
            return null;
        }
    }

    async getFileMetadata(file: TFile): Promise<any> {
        return this.app.metadataCache.getFileCache(file);
    }
}
