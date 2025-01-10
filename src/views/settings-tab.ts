import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import NostrPlugin from '../main';
import { ValidationService } from '../services/validation-service';
import { RelayService } from '../services/core/relay-service';
import { FetchSettingsModal } from './modals/fetch-settings-modal';

export class SettingsTab extends PluginSettingTab {
    plugin: NostrPlugin;

    constructor(app: App, plugin: NostrPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Nostr Graph Settings' });

        new Setting(containerEl)
            .setName('Nostr Public Key (npub)')
            .setDesc('Your nostr public key in npub format')
            .addText(text => text
                .setPlaceholder('Enter your npub...')
                .setValue(this.plugin.settings.npub)
                .onChange(async (value) => {
                    if (ValidationService.validateNpub(value)) {
                        this.plugin.settings.npub = value;
                        await this.plugin.saveSettings();
                    }
                }));

        // Relay Settings
        containerEl.createEl('h3', { text: 'Relay Settings' });
        containerEl.createEl('p', { 
            text: 'Configure relays to fetch notes from. At least one relay must remain active.',
            cls: 'setting-item-description'
        });

        // Display existing relays
        this.plugin.settings.relays.forEach((relay, index) => {
            new Setting(containerEl)
                .setName(`Relay ${index + 1}`)
                .setDesc(relay.url)
                .addToggle(toggle => toggle
                    .setValue(relay.enabled)
                    .onChange(async (value) => {
                        // Prevent disabling if this is the last enabled relay
                        const enabledCount = this.plugin.settings.relays.filter(r => r.enabled).length;
                        if (!value && enabledCount <= 1) {
                            new Notice('At least one relay must remain active');
                            toggle.setValue(true);
                            return;
                        }
                        relay.enabled = value;
                        await this.plugin.saveSettings();
                    }))
                .addButton(button => button
                    .setButtonText('Remove')
                    .onClick(async () => {
                        // Prevent removal if this is the last enabled relay
                        const enabledCount = this.plugin.settings.relays.filter(r => r.enabled).length;
                        if (relay.enabled && enabledCount <= 1) {
                            new Notice('Cannot remove the last active relay');
                            return;
                        }
                        this.plugin.settings.relays = this.plugin.settings.relays.filter((_, i) => i !== index);
                        await this.plugin.saveSettings();
                        this.display();
                    }));
        });

        // Add new relay
        new Setting(containerEl)
            .setName('Add Relay')
            .setDesc('Add a new relay URL')
            .addText(text => text
                .setPlaceholder('wss://relay.example.com')
                .onChange(async (value) => {
                    if (ValidationService.validateRelayUrl(value)) {
                        this.plugin.settings.relays.push({
                            url: value,
                            enabled: true
                        });
                        await this.plugin.saveSettings();
                        this.display();
                    }
                }));

        // Directory Settings
        containerEl.createEl('h3', { text: 'Directory Settings' });

        new Setting(containerEl)
            .setName('Notes Directory')
            .setDesc('Directory to store notes in')
            .addText(text => text
                .setPlaceholder('nostr/notes')
                .setValue(this.plugin.settings.directories.main || '')
                .onChange(async (value) => {
                    this.plugin.settings.directories.main = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Replies Directory')
            .setDesc('Directory to store replies in')
            .addText(text => text
                .setPlaceholder('nostr/replies')
                .setValue(this.plugin.settings.directories.replies || '')
                .onChange(async (value) => {
                    this.plugin.settings.directories.replies = value;
                    await this.plugin.saveSettings();
                }));

        // Auto Update Settings
        containerEl.createEl('h3', { text: 'Auto Update Settings' });

        new Setting(containerEl)
            .setName('Enable Auto Update')
            .setDesc('Automatically fetch new notes periodically')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoUpdate)
                .onChange(async (value) => {
                    this.plugin.settings.autoUpdate = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Update Interval')
            .setDesc('How often to fetch new notes (in seconds)')
            .addText(text => text
                .setPlaceholder('300')
                .setValue(String(this.plugin.settings.updateInterval))
                .onChange(async (value) => {
                    const interval = parseInt(value);
                    if (!isNaN(interval) && interval > 0) {
                        this.plugin.settings.updateInterval = interval;
                        await this.plugin.saveSettings();
                    }
                }));

        // Poll Settings
        containerEl.createEl('h3', { text: 'Poll Settings' });

        new Setting(containerEl)
            .setName('Enable Polls')
            .setDesc('Enable experimental poll support')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.polls.enabled)
                .onChange(async (value) => {
                    this.plugin.settings.polls.enabled = value;
                    await this.plugin.saveSettings();
                }));

        if (this.plugin.settings.polls.enabled) {
            new Setting(containerEl)
                .setName('Poll Directory')
                .setDesc('Directory to store polls in')
                .addText(text => text
                    .setPlaceholder('nostr/polls')
                    .setValue(this.plugin.settings.polls.directory || '')
                    .onChange(async (value) => {
                        this.plugin.settings.polls.directory = value;
                        await this.plugin.saveSettings();
                    }));

            new Setting(containerEl)
                .setName('Auto Update Polls')
                .setDesc('Automatically update poll results')
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.polls.autoUpdate)
                    .onChange(async (value) => {
                        this.plugin.settings.polls.autoUpdate = value;
                        await this.plugin.saveSettings();
                    }));
        }
    }
}
