import { App, PluginSettingTab, Setting } from 'obsidian';
import NostrPlugin from '../main';
import { ValidationService } from '../services/validation-service';

export class SettingsTab extends PluginSettingTab {
    plugin: NostrPlugin;

    constructor(app: App, plugin: NostrPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Nostr Settings' });

        // Nostr Public Key
        new Setting(containerEl)
            .setName('Nostr Public Key')
            .setDesc('Your Nostr public key in npub format')
            .addText(text => text
                .setPlaceholder('npub...')
                .setValue(this.plugin.settings.npub)
                .onChange(async (value) => {
                    if (ValidationService.validateNpub(value) || value === '') {
                        this.plugin.settings.npub = value;
                        await this.plugin.saveSettings();
                    }
                }));

        // Notes Per Profile
        new Setting(containerEl)
            .setName('Notes Per Profile')
            .setDesc('Maximum number of notes to fetch per profile')
            .addText(text => text
                .setPlaceholder('50')
                .setValue(String(this.plugin.settings.notesPerProfile))
                .onChange(async (value) => {
                    const num = Number(value);
                    if (ValidationService.validateLimit(num)) {
                        this.plugin.settings.notesPerProfile = num;
                        await this.plugin.saveSettings();
                    }
                }));

        // Batch Size
        new Setting(containerEl)
            .setName('Fetch Batch Size')
            .setDesc('Number of notes to fetch per request (1-500). Use fetch button multiple times to get more notes.')
            .addText(text => text
                .setPlaceholder('50')
                .setValue(String(this.plugin.settings.batchSize || 50))
                .onChange(async (value) => {
                    const num = Number(value);
                    if (num >= 1 && num <= 500) {
                        this.plugin.settings.batchSize = num;
                        await this.plugin.saveSettings();
                    }
                }));

        // Separate Reply Notes
        new Setting(containerEl)
            .setName('Separate Reply Notes')
            .setDesc('Store reply notes in a separate directory (nostr/replies)')
            .addToggle(toggle => toggle
                .setValue(!!this.plugin.settings.directories.replies)
                .onChange(async (value) => {
                    this.plugin.settings.directories.replies = value ? 'nostr/replies' : undefined;
                    await this.plugin.saveSettings();
                }));

        // Auto Update
        new Setting(containerEl)
            .setName('Auto Update')
            .setDesc('Automatically fetch new notes periodically')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoUpdate)
                .onChange(async (value) => {
                    this.plugin.settings.autoUpdate = value;
                    await this.plugin.saveSettings();
                }));

        // Update Interval
        new Setting(containerEl)
            .setName('Update Interval')
            .setDesc('How often to fetch new notes (in seconds)')
            .addText(text => text
                .setPlaceholder('300')
                .setValue(String(this.plugin.settings.updateInterval))
                .onChange(async (value) => {
                    const num = Number(value);
                    if (num > 0) {
                        this.plugin.settings.updateInterval = num;
                        await this.plugin.saveSettings();
                    }
                }));

        // Include Own Notes
        new Setting(containerEl)
            .setName('Include Own Notes')
            .setDesc('Include your own notes in the fetch')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.includeOwnNotes)
                .onChange(async (value) => {
                    this.plugin.settings.includeOwnNotes = value;
                    await this.plugin.saveSettings();
                }));

        // Profile Naming
        new Setting(containerEl)
            .setName('Use Public Key for Profile Names')
            .setDesc('Use public keys as filenames instead of display names (recommended for uniqueness)')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.usePublicKeyAsFilename || false)
                .onChange(async (value) => {
                    this.plugin.settings.usePublicKeyAsFilename = value;
                    await this.plugin.saveSettings();
                }));

        // Relays
        containerEl.createEl('h3', { text: 'Relays' });
        this.plugin.settings.relays.forEach((relay, index) => {
            new Setting(containerEl)
                .setName(`Relay ${index + 1}`)
                .setDesc(relay.url)
                .addToggle(toggle => toggle
                    .setValue(relay.enabled)
                    .onChange(async (value) => {
                        this.plugin.settings.relays[index].enabled = value;
                        await this.plugin.saveSettings();
                    }));
        });
    }
}
