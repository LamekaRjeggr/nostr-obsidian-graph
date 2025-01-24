import { Vault, TFile, App } from 'obsidian';
import { NostrSettings } from '../../../types';

export class DirectoryManager {
    constructor(
        private vault: Vault,
        private settings: NostrSettings,
        private app: App
    ) {}

    async ensureDirectories(): Promise<void> {
        const directories = [
            this.settings.directories.main,
            this.settings.notesDirectory,
            this.settings.profilesDirectory,
            this.settings.directories.replies,
            `${this.settings.profilesDirectory}/mentions`,
            this.settings.polls.directory,
            'nostr/User Profile',
            'nostr/User Notes',
            'nostr/Replies to User'
        ].filter((dir): dir is string => !!dir);

        for (const dir of directories) {
            try {
                const folder = this.vault.getAbstractFileByPath(dir);
                if (!folder) {
                    await this.vault.createFolder(dir);
                }
            } catch (error) {
                console.error(`Error ensuring directory ${dir}:`, error);
                throw error;
            }
        }
    }

    async checkDirectories(): Promise<boolean> {
        const directories = [
            this.settings.directories.main,
            this.settings.notesDirectory,
            this.settings.profilesDirectory,
            this.settings.polls.directory,
            'nostr/User Profile',
            'nostr/User Notes',
            'nostr/Replies to User'
        ].filter((dir): dir is string => !!dir);

        try {
            for (const dir of directories) {
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
