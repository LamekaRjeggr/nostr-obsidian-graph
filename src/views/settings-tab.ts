import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import NostrPlugin from '../main';
import { ValidationService } from '../services/validation-service';
import { RelayService } from '../services/core/relay-service';
import { FetchSettingsModal } from './modals/fetch-settings-modal';
import { PollService } from '../experimental/polls/poll-service';

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
                    
                    if (value) {
                        // Initialize poll service when enabled
                        this.plugin.pollService = new PollService(
                            this.plugin.app,
                            this.plugin.settings,
                            this.plugin.eventEmitter,
                            this.plugin.fileService,
                            this.plugin.relayService
                        );
                        await this.plugin.pollService.initialize();
                        new Notice('Poll service enabled and initialized');
                    } else {
                        // Cleanup poll service when disabled
                        if (this.plugin.pollService) {
                            await this.plugin.pollService.cleanup();
                            this.plugin.pollService = null;
                            new Notice('Poll service disabled');
                        }
                    }
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

        // Cache Settings
        containerEl.createEl('h3', { text: 'Cache Settings' });

        new Setting(containerEl)
            .setName('Enable Cache')
            .setDesc('Enable caching of note titles and links')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.cache?.enabled ?? true)
                .onChange(async (value) => {
                    if (!this.plugin.settings.cache) {
                        this.plugin.settings.cache = {
                            maxSize: 10000,
                            maxAge: 24 * 60 * 60 * 1000,
                            enabled: value,
                            persistToDisk: true
                        };
                    } else {
                        this.plugin.settings.cache.enabled = value;
                    }
                    await this.plugin.saveSettings();
                }));

        if (this.plugin.settings.cache?.enabled) {
            new Setting(containerEl)
                .setName('Cache Size')
                .setDesc('Maximum number of entries to keep in cache')
                .addText(text => text
                    .setPlaceholder('10000')
                    .setValue(String(this.plugin.settings.cache?.maxSize || 10000))
                    .onChange(async (value) => {
                        const size = parseInt(value);
                        if (!isNaN(size) && size > 0) {
                            if (!this.plugin.settings.cache) {
                                this.plugin.settings.cache = {
                                    maxSize: size,
                                    maxAge: 24 * 60 * 60 * 1000,
                                    enabled: true,
                                    persistToDisk: true
                                };
                            } else {
                                this.plugin.settings.cache.maxSize = size;
                            }
                            if (this.plugin.noteCacheManager) {
                                this.plugin.noteCacheManager.setMaxSize(size);
                            }
                            await this.plugin.saveSettings();
                        }
                    }));

            new Setting(containerEl)
                .setName('Cache Entry Lifetime')
                .setDesc('How long to keep entries in cache (in hours)')
                .addText(text => text
                    .setPlaceholder('24')
                    .setValue(String((this.plugin.settings.cache?.maxAge || 24 * 60 * 60 * 1000) / (60 * 60 * 1000)))
                    .onChange(async (value) => {
                        const hours = parseInt(value);
                        if (!isNaN(hours) && hours > 0) {
                            const maxAge = hours * 60 * 60 * 1000;
                            if (!this.plugin.settings.cache) {
                                this.plugin.settings.cache = {
                                    maxSize: 10000,
                                    maxAge: maxAge,
                                    enabled: true,
                                    persistToDisk: true
                                };
                            } else {
                                this.plugin.settings.cache.maxAge = maxAge;
                            }
                            if (this.plugin.noteCacheManager) {
                                this.plugin.noteCacheManager.setMaxAge(maxAge);
                            }
                            await this.plugin.saveSettings();
                        }
                    }));

            new Setting(containerEl)
                .setName('Persist Cache')
                .setDesc('Save cache to disk between sessions')
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.cache?.persistToDisk ?? true)
                    .onChange(async (value) => {
                        if (!this.plugin.settings.cache) {
                            this.plugin.settings.cache = {
                                maxSize: 10000,
                                maxAge: 24 * 60 * 60 * 1000,
                                enabled: true,
                                persistToDisk: value
                            };
                        } else {
                            this.plugin.settings.cache.persistToDisk = value;
                        }
                        await this.plugin.saveSettings();
                    }));

            // Display cache stats if available
            if (this.plugin.noteCacheManager && 'getStats' in this.plugin.noteCacheManager) {
                const stats = this.plugin.noteCacheManager.getStats();
                const statsEl = containerEl.createEl('div', { cls: 'setting-item-description' });
                statsEl.createEl('p', { text: `Cache Stats:` });
                statsEl.createEl('p', { text: `Size: ${stats.size}/${stats.maxSize} entries` });
                statsEl.createEl('p', { text: `Hits: ${stats.hits}` });
                statsEl.createEl('p', { text: `Misses: ${stats.misses}` });
                statsEl.createEl('p', { text: `Evictions: ${stats.evictions}` });
            }
        }
    }
}
