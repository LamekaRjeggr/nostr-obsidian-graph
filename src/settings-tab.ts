import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import type NostrPlugin from './main';

export class NostrSettingsTab extends PluginSettingTab {
    constructor(app: App, private plugin: NostrPlugin) {
        super(app, plugin);
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        // User Settings
        new Setting(containerEl)
            .setName('Public Key')
            .setDesc('Your Nostr public key (npub format)')
            .addText(text => text
                .setPlaceholder('npub1...')
                .setValue(this.plugin.settings.pubkey)
                .onChange(async (value) => {
                    if (value && !value.startsWith('npub')) {
                        new Notice('Please enter a valid npub');
                        return;
                    }
                    this.plugin.settings.pubkey = value;
                    await this.plugin.saveSettings();
                }));

        // Relay Settings
        containerEl.createEl('h3', { text: 'Relay Configuration' });

        // Display current relays
        this.plugin.settings.relays.forEach((relay, index) => {
            const relayDiv = containerEl.createDiv('relay-setting');
            
            new Setting(relayDiv)
                .addText(text => text
                    .setPlaceholder('wss://relay.example.com')
                    .setValue(relay.url)
                    .onChange(async (value) => {
                        this.plugin.settings.relays[index].url = value;
                        await this.plugin.saveSettings();
                    }))
                .addToggle(toggle => toggle
                    .setValue(relay.enabled)
                    .onChange(async (value) => {
                        this.plugin.settings.relays[index].enabled = value;
                        await this.plugin.saveSettings();
                    }))
                .addButton(button => button
                    .setButtonText('Remove')
                    .onClick(async () => {
                        this.plugin.settings.relays.splice(index, 1);
                        await this.plugin.saveSettings();
                        this.display();
                    }));
        });

        // Add relay button
        new Setting(containerEl)
            .addButton(button => button
                .setButtonText('Add Relay')
                .onClick(async () => {
                    this.plugin.settings.relays.push({
                        url: '',
                        enabled: true
                    });
                    await this.plugin.saveSettings();
                    this.display();
                }));
    }
}
