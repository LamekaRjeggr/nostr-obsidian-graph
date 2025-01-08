import { App, Modal, Setting } from 'obsidian';
import type NostrPlugin from '../main';

export class FetchOptionsModal extends Modal {
    constructor(
        app: App,
        private plugin: NostrPlugin
    ) {
        super(app);
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: 'Fetch Options' });

        // Notes section
        contentEl.createEl('h3', { text: 'Notes' });
        new Setting(contentEl)
            .setName('Fetch Referenced Notes')
            .setDesc('Fetch notes referenced in event tags')
            .addToggle(toggle => toggle
                .setValue(true)
                .onChange(async (value) => {
                    await this.plugin.saveSettings();
                }));

        // Profiles section
        contentEl.createEl('h3', { text: 'Profiles' });
        new Setting(contentEl)
            .setName('Fetch Referenced Profiles')
            .setDesc('Fetch profiles referenced in event tags')
            .addToggle(toggle => toggle
                .setValue(true)
                .onChange(async (value) => {
                    await this.plugin.saveSettings();
                }));
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
