import { App, PluginSettingTab, Setting } from 'obsidian';
import NostrObsidianGraphPlugin from '../main';
import { NostrUtils } from '../utils/nostr-utils';
import { nip19 } from 'nostr-tools';
import { RelayConnection } from '../types';

export class NostrSettingTab extends PluginSettingTab {
    plugin: NostrObsidianGraphPlugin;

    constructor(app: App, plugin: NostrObsidianGraphPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Nostr Graph Settings' });

        // NPUB Setting
        new Setting(containerEl)
            .setName('Nostr Public Key (npub)')
            .setDesc('Your Nostr public key in npub format')
            .addText(text => text
                .setPlaceholder('npub1...')
                .setValue(this.plugin.settings.npub)
                .onChange(async (value) => {
                    try {
                        // First validate the basic format
                        const validation = NostrUtils.validateNpub(value);
                        if (!validation.isValid) {
                            console.error('Invalid npub format:', validation.error);
                            return;
                        }

                        // Try to decode the npub
                        console.log('Attempting to decode npub:', value);
                        const decoded = nip19.decode(value);
                        console.log('Decoded npub result:', decoded);

                        if (decoded.type !== 'npub') {
                            console.error('Invalid npub type:', decoded.type);
                            return;
                        }

                        // Validate the hex string
                        const pubkey = decoded.data as string;
                        console.log('Extracted pubkey:', pubkey);
                        
                        const hexValidation = NostrUtils.validateHexField(pubkey, 'pubkey', 32);
                        if (!hexValidation.isValid) {
                            console.error('Invalid hex data:', hexValidation.error);
                            return;
                        }
                        
                        this.plugin.settings.npub = value;
                        await this.plugin.saveSettings();
                        console.log('Successfully saved npub:', value);
                    } catch (error) {
                        console.error('Error processing npub:', error);
                    }
                }));

        // Relays Setting
        new Setting(containerEl)
            .setName('Relays')
            .setDesc('List of Nostr relays to connect to (one per line)')
            .addTextArea(text => text
                .setPlaceholder('wss://relay.example.com')
                .setValue(this.plugin.settings.relays.map((r: RelayConnection) => r.url).join('\n'))
                .onChange(async (value) => {
                    const urls = value.split('\n')
                        .map(url => url.trim())
                        .filter(url => url.length > 0);

                    const validation = NostrUtils.validateRelayUrls(urls);
                    if (validation.isValid) {
                        // Convert URLs to RelayConnection objects
                        const relays: RelayConnection[] = urls.map(url => ({
                            url,
                            enabled: true
                        }));
                        
                        this.plugin.settings.relays = relays;
                        await this.plugin.saveSettings();
                    } else {
                        console.error('Invalid relay URLs:', validation.error);
                    }
                }));

        // Notes Per Profile Setting
        new Setting(containerEl)
            .setName('Notes Per Profile')
            .setDesc('Number of notes to fetch per profile')
            .addText(text => text
                .setPlaceholder('5')
                .setValue(String(this.plugin.settings.notesPerProfile))
                .onChange(async (value) => {
                    const num = parseInt(value);
                    if (!isNaN(num) && num > 0) {
                        this.plugin.settings.notesPerProfile = num;
                        await this.plugin.saveSettings();
                    }
                }));

        // Include Own Notes Setting
        new Setting(containerEl)
            .setName('Include Own Notes')
            .setDesc('Include notes from your npub in the graph')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.includeOwnNotes)
                .onChange(async (value) => {
                    this.plugin.settings.includeOwnNotes = value;
                    await this.plugin.saveSettings();
                }));

        // Auto Update Setting
        new Setting(containerEl)
            .setName('Auto Update')
            .setDesc('Automatically fetch new notes periodically')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoUpdate)
                .onChange(async (value) => {
                    this.plugin.settings.autoUpdate = value;
                    await this.plugin.saveSettings();
                }));

        // Update Interval Setting
        new Setting(containerEl)
            .setName('Update Interval')
            .setDesc('How often to fetch new notes (in minutes)')
            .addText(text => text
                .setPlaceholder('15')
                .setValue(String(this.plugin.settings.updateInterval))
                .onChange(async (value) => {
                    const num = parseInt(value);
                    if (!isNaN(num) && num > 0) {
                        this.plugin.settings.updateInterval = num;
                        await this.plugin.saveSettings();
                    }
                }))
            .setDisabled(!this.plugin.settings.autoUpdate);

        // Profiles Directory Setting
        new Setting(containerEl)
            .setName('Profiles Directory')
            .setDesc('Directory to store profile files')
            .addText(text => text
                .setPlaceholder('nostr/profiles')
                .setValue(this.plugin.settings.profilesDirectory || 'nostr/profiles')
                .onChange(async (value) => {
                    if (value) {
                        this.plugin.settings.profilesDirectory = value;
                        await this.plugin.saveSettings();
                    }
                }));

        // Notes Directory Setting
        new Setting(containerEl)
            .setName('Notes Directory')
            .setDesc('Directory to store note files')
            .addText(text => text
                .setPlaceholder('nostr/notes')
                .setValue(this.plugin.settings.notesDirectory || 'nostr/notes')
                .onChange(async (value) => {
                    if (value) {
                        this.plugin.settings.notesDirectory = value;
                        await this.plugin.saveSettings();
                    }
                }));
    }
}
