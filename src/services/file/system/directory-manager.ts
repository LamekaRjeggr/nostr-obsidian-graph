import { Vault } from 'obsidian';
import { NostrSettings } from '../../../types';

export class DirectoryManager {
    constructor(
        private vault: Vault,
        private settings: NostrSettings
    ) {}

    async ensureDirectories(): Promise<void> {
        // Required directories
        const requiredDirs = [
            this.settings.notesDirectory,
            this.settings.profilesDirectory,
            this.settings.directories.main
        ];

        // Optional directories
        const optionalDirs = [
            this.settings.directories.contacts,
            this.settings.directories.mentions,
            this.settings.directories.cache,
            this.settings.directories.replies
        ].filter((dir): dir is string => !!dir);  // Filter out undefined

        // Create all directories
        const allDirs = [...requiredDirs, ...optionalDirs];
        
        for (const dir of allDirs) {
            try {
                if (!(await this.vault.adapter.exists(dir))) {
                    await this.vault.adapter.mkdir(dir);
                }
            } catch (error) {
                console.error('Directory creation error:', error);
                throw error;
            }
        }
    }

    async checkDirectories(): Promise<boolean> {
        // Required directories
        const requiredDirs = [
            this.settings.notesDirectory,
            this.settings.profilesDirectory,
            this.settings.directories.main
        ];

        // Optional directories
        const optionalDirs = [
            this.settings.directories.contacts,
            this.settings.directories.mentions,
            this.settings.directories.cache,
            this.settings.directories.replies
        ].filter((dir): dir is string => !!dir);  // Filter out undefined

        // Check all directories
        const allDirs = [...requiredDirs, ...optionalDirs];

        for (const dir of allDirs) {
            if (!(await this.vault.adapter.exists(dir))) {
                return false;
            }
        }
        return true;
    }

    async writeFile(path: string, content: string): Promise<void> {
        const dir = path.substring(0, path.lastIndexOf('/'));
        if (!(await this.vault.adapter.exists(dir))) {
            await this.vault.adapter.mkdir(dir);
        }
        await this.vault.adapter.write(path, content);
    }

    async readFile(path: string): Promise<string> {
        return await this.vault.adapter.read(path);
    }

    async listFiles(dir: string): Promise<string[]> {
        const list = await this.vault.adapter.list(dir);
        return list.files;
    }
}
