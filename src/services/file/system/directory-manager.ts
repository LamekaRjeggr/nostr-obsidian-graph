import { Vault, TFile } from 'obsidian';
import { NostrSettings } from '../../../types';

export class DirectoryManager {
    constructor(
        private vault: Vault,
        private settings: NostrSettings
    ) {}

    async ensureDirectories(): Promise<void> {
        const directories = [
            this.settings.directories.main,
            this.settings.notesDirectory,
            this.settings.profilesDirectory,
            this.settings.directories.replies,
            `${this.settings.profilesDirectory}/mentions`,
            this.settings.polls.directory  // Add polls directory
        ].filter((dir): dir is string => !!dir);

        for (const dir of directories) {
            if (!(await this.vault.adapter.exists(dir))) {
                await this.vault.createFolder(dir);
            }
        }
    }

    async checkDirectories(): Promise<boolean> {
        const directories = [
            this.settings.directories.main,
            this.settings.notesDirectory,
            this.settings.profilesDirectory,
            this.settings.polls.directory  // Add polls directory
        ].filter((dir): dir is string => !!dir);

        for (const dir of directories) {
            if (!(await this.vault.adapter.exists(dir))) {
                return false;
            }
        }
        return true;
    }

    async writeFile(path: string, content: string): Promise<void> {
        await this.vault.adapter.write(path, content);
    }

    async readFile(path: string): Promise<string> {
        return await this.vault.adapter.read(path);
    }

    async fileExists(path: string): Promise<boolean> {
        return await this.vault.adapter.exists(path);
    }

    async listFiles(directory: string): Promise<string[]> {
        try {
            const files = await this.vault.adapter.list(directory);
            return files.files;
        } catch (error) {
            return [];
        }
    }

    async deleteFile(path: string): Promise<void> {
        const file = this.vault.getAbstractFileByPath(path);
        if (file instanceof TFile) {
            await this.vault.delete(file);
        }
    }

    getAbstractFile(path: string): TFile | null {
        const file = this.vault.getAbstractFileByPath(path);
        return file instanceof TFile ? file : null;
    }
}
