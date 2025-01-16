import { App, Modal, Setting, ButtonComponent, Notice } from 'obsidian';
import { UnifiedFetchProcessor } from '../../services/fetch/unified-fetch-processor';
import { UnifiedFetchSettings, DEFAULT_UNIFIED_SETTINGS } from './unified-settings';
import { SearchScope, TimeRange, ContentType } from './types';
import { EventKinds } from '../../services/core/base-event-handler';

export class UnifiedFetchModal extends Modal {
    private settings: UnifiedFetchSettings;
    private readonly onSubmit: (settings: UnifiedFetchSettings) => Promise<void>;
    private readonly fetchProcessor: UnifiedFetchProcessor;
    private currentTab: 'core' | 'enhanced' | 'contacts' | 'thread' | 'search' = 'core';

    constructor(
        app: App,
        currentSettings: UnifiedFetchSettings,
        onSubmit: (settings: UnifiedFetchSettings) => Promise<void>,
        fetchProcessor: UnifiedFetchProcessor
    ) {
        super(app);
        this.settings = { ...currentSettings };
        this.onSubmit = onSubmit;
        this.fetchProcessor = fetchProcessor;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.style.height = '500px';
        contentEl.style.width = '500px';

        // Create tabs
        this.createTabs(contentEl);

        // Create content container
        const container = contentEl.createDiv();
        container.style.padding = '0 20px';
        container.style.height = 'calc(100% - 60px)';
        container.style.overflow = 'auto';

        // Show initial tab
        this.showTab('core', container);
    }

    private createTabs(contentEl: HTMLElement) {
        const tabs = contentEl.createDiv({ cls: 'unified-fetch-tabs' });
        tabs.style.display = 'flex';
        tabs.style.marginBottom = '20px';
        tabs.style.borderBottom = '1px solid var(--background-modifier-border)';
        tabs.style.padding = '10px 20px';

        const tabNames: Array<[string, string]> = [
            ['core', 'Core'],
            ['enhanced', 'Enhanced'],
            ['contacts', 'Contacts'],
            ['thread', 'Thread'],
            ['search', 'Search']
        ];

        tabNames.forEach(([id, label]) => {
            const btn = tabs.createEl('button', { text: label });
            btn.style.flex = '1';
            btn.style.padding = '8px';
            btn.style.margin = '0 4px';
            btn.style.border = 'none';
            btn.style.borderRadius = '4px';
            btn.style.cursor = 'pointer';
            btn.onclick = () => this.showTab(id as any, contentEl.querySelector('div:last-child')!);
        });
    }

    private showTab(tab: typeof this.currentTab, container: HTMLElement) {
        this.currentTab = tab;
        container.empty();

        // Update tab button states
        const buttons = this.contentEl.querySelectorAll('.unified-fetch-tabs button');
        buttons.forEach((btn: HTMLElement, index) => {
            const isActive = index === ['core', 'enhanced', 'contacts', 'thread', 'search'].indexOf(tab);
            btn.style.backgroundColor = isActive ? 'var(--interactive-accent)' : 'transparent';
            btn.style.color = isActive ? 'var(--text-on-accent)' : 'var(--text-normal)';
        });

        switch (tab) {
            case 'core':
                this.createCoreSettings(container);
                break;
            case 'enhanced':
                this.createEnhancedSettings(container);
                break;
            case 'contacts':
                this.createContactSettings(container);
                break;
            case 'thread':
                this.createThreadSettings(container);
                break;
            case 'search':
                this.createSearchSettings(container);
                break;
        }
    }

    private createCoreSettings(container: HTMLElement) {
        new Setting(container)
            .setName('Notes per Profile')
            .setDesc('Number of notes to fetch per profile')
            .addText(text => text
                .setValue(String(this.settings.notesPerProfile))
                .onChange(async value => {
                    const num = parseInt(value);
                    if (!isNaN(num) && num > 0) {
                        this.settings.notesPerProfile = num;
                        await this.onSubmit(this.settings);
                    }
                }));

        new Setting(container)
            .setName('Batch Size')
            .setDesc('Number of events to fetch in each batch')
            .addText(text => text
                .setValue(String(this.settings.batchSize))
                .onChange(async value => {
                    const num = parseInt(value);
                    if (!isNaN(num) && num > 0) {
                        this.settings.batchSize = num;
                        await this.onSubmit(this.settings);
                    }
                }));

        new Setting(container)
            .setName('Include Own Notes')
            .setDesc('Include your own notes in fetches')
            .addToggle(toggle => toggle
                .setValue(this.settings.includeOwnNotes)
                .onChange(async value => {
                    this.settings.includeOwnNotes = value;
                    await this.onSubmit(this.settings);
                }));
    }

    private createEnhancedSettings(container: HTMLElement) {
        if (!this.settings.enhanced) {
            this.settings.enhanced = DEFAULT_UNIFIED_SETTINGS.enhanced;
        }

        new Setting(container)
            .setName('Extract Titles')
            .setDesc('Extract and cache note titles')
            .addToggle(toggle => toggle
                .setValue(this.settings.enhanced!.titles ?? true)
                .onChange(async value => {
                    this.settings.enhanced!.titles = value;
                    await this.onSubmit(this.settings);
                }));

        new Setting(container)
            .setName('Process Reactions')
            .setDesc('Process reactions and zaps')
            .addToggle(toggle => toggle
                .setValue(this.settings.enhanced!.reactions ?? true)
                .onChange(async value => {
                    this.settings.enhanced!.reactions = value;
                    await this.onSubmit(this.settings);
                }));

        new Setting(container)
            .setName('Enhanced Metadata')
            .setDesc('Include additional metadata')
            .addToggle(toggle => toggle
                .setValue(this.settings.enhanced!.metadata ?? true)
                .onChange(async value => {
                    this.settings.enhanced!.metadata = value;
                    await this.onSubmit(this.settings);
                }));
    }

    private createContactSettings(container: HTMLElement) {
        if (!this.settings.contacts) {
            this.settings.contacts = DEFAULT_UNIFIED_SETTINGS.contacts;
        }

        new Setting(container)
            .setName('Include Contacts')
            .setDesc('Include contacts in fetches')
            .addToggle(toggle => toggle
                .setValue(this.settings.contacts!.include)
                .onChange(async value => {
                    this.settings.contacts!.include = value;
                    await this.onSubmit(this.settings);
                }));

        new Setting(container)
            .setName('Fetch Profiles')
            .setDesc('Fetch profiles for contacts')
            .addToggle(toggle => toggle
                .setValue(this.settings.contacts!.fetchProfiles)
                .onChange(async value => {
                    this.settings.contacts!.fetchProfiles = value;
                    await this.onSubmit(this.settings);
                }));

        new Setting(container)
            .setName('Link in Graph')
            .setDesc('Link contacts in the graph')
            .addToggle(toggle => toggle
                .setValue(this.settings.contacts!.linkInGraph)
                .onChange(async value => {
                    this.settings.contacts!.linkInGraph = value;
                    await this.onSubmit(this.settings);
                }));
    }

    private createThreadSettings(container: HTMLElement) {
        if (!this.settings.thread) {
            this.settings.thread = DEFAULT_UNIFIED_SETTINGS.thread;
        }

        new Setting(container)
            .setName('Thread Limit')
            .setDesc('Maximum number of replies to fetch')
            .addText(text => text
                .setValue(String(this.settings.thread!.limit))
                .onChange(async value => {
                    const num = parseInt(value);
                    if (!isNaN(num) && num > 0) {
                        this.settings.thread!.limit = num;
                        await this.onSubmit(this.settings);
                    }
                }));

        new Setting(container)
            .setName('Include Context')
            .setDesc('Include thread context (root/parent)')
            .addToggle(toggle => toggle
                .setValue(this.settings.thread!.includeContext)
                .onChange(async value => {
                    this.settings.thread!.includeContext = value;
                    await this.onSubmit(this.settings);
                }));

        new Setting(container)
            .setName('Fetch Replies')
            .setDesc('Fetch replies to notes')
            .addToggle(toggle => toggle
                .setValue(this.settings.thread!.fetchReplies)
                .onChange(async value => {
                    this.settings.thread!.fetchReplies = value;
                    await this.onSubmit(this.settings);
                }));
    }

    private createSearchSettings(container: HTMLElement) {
        if (!this.settings.search) {
            this.settings.search = DEFAULT_UNIFIED_SETTINGS.search;
        }

        // Add keyword input
        new Setting(container)
            .setName('Search Keywords')
            .setDesc('Enter keywords to search for (comma-separated)')
            .addText(text => text
                .setValue(this.settings.search!.keywords?.join(', ') || '')
                .onChange(async value => {
                    this.settings.search!.keywords = value.split(',').map(k => k.trim()).filter(k => k);
                    await this.onSubmit(this.settings);
                }));

        new Setting(container)
            .setName('Search Scope')
            .setDesc('Scope of search')
            .addDropdown(dropdown => dropdown
                .addOptions({
                    [SearchScope.DIRECT_FOLLOWS]: SearchScope.DIRECT_FOLLOWS,
                    [SearchScope.FOLLOWS_OF_FOLLOWS]: SearchScope.FOLLOWS_OF_FOLLOWS,
                    [SearchScope.GLOBAL]: SearchScope.GLOBAL
                })
                .setValue(this.settings.search!.scope)
                .onChange(async value => {
                    this.settings.search!.scope = value as SearchScope;
                    await this.onSubmit(this.settings);
                }));

        new Setting(container)
            .setName('Time Range')
            .setDesc('Time range for search')
            .addDropdown(dropdown => dropdown
                .addOptions({
                    [TimeRange.ALL_TIME]: TimeRange.ALL_TIME,
                    [TimeRange.LAST_WEEK]: TimeRange.LAST_WEEK,
                    [TimeRange.LAST_MONTH]: TimeRange.LAST_MONTH,
                    [TimeRange.LAST_YEAR]: TimeRange.LAST_YEAR,
                    [TimeRange.CUSTOM]: TimeRange.CUSTOM
                })
                .setValue(this.settings.search!.timeRange)
                .onChange(async value => {
                    this.settings.search!.timeRange = value as TimeRange;
                    await this.onSubmit(this.settings);
                }));

        new Setting(container)
            .setName('Content Type')
            .setDesc('Type of content to search')
            .addDropdown(dropdown => dropdown
                .addOptions({
                    [ContentType.ALL]: ContentType.ALL,
                    [ContentType.TEXT_ONLY]: ContentType.TEXT_ONLY,
                    [ContentType.WITH_MEDIA]: ContentType.WITH_MEDIA,
                    [ContentType.WITH_MENTIONS]: ContentType.WITH_MENTIONS
                })
                .setValue(this.settings.search!.contentType)
                .onChange(async value => {
                    this.settings.search!.contentType = value as ContentType;
                    await this.onSubmit(this.settings);
                }));

        new Setting(container)
            .setName('Search Batch Size')
            .setDesc('Number of results per batch')
            .addText(text => text
                .setValue(String(this.settings.search!.batchSize))
                .onChange(async value => {
                    const num = parseInt(value);
                    if (!isNaN(num) && num > 0) {
                        this.settings.search!.batchSize = num;
                        await this.onSubmit(this.settings);
                    }
                }));

        // Add search button
        const buttonContainer = container.createDiv();
        buttonContainer.style.textAlign = 'center';
        buttonContainer.style.marginTop = '20px';

        const searchButton = new ButtonComponent(buttonContainer)
            .setButtonText('Search')
            .onClick(async () => {
                if (!this.settings.search?.keywords?.length) {
                    new Notice('Please enter search keywords');
                    return;
                }

                try {
                    await this.fetchProcessor.fetchWithOptions({
                        kinds: [EventKinds.NOTE],
                        search: this.settings.search.keywords,
                        limit: this.settings.search.batchSize,
                        useStream: true,
                        enhanced: {
                            titles: true,
                            reactions: true
                        }
                    });
                    new Notice('Search completed');
                } catch (error) {
                    console.error('Search error:', error);
                    new Notice(`Search error: ${error.message}`);
                }
            });

        // Style the button
        const buttonEl = searchButton.buttonEl;
        buttonEl.style.backgroundColor = 'var(--interactive-accent)';
        buttonEl.style.color = 'var(--text-on-accent)';
        buttonEl.style.padding = '8px 16px';
        buttonEl.style.borderRadius = '4px';
        buttonEl.style.cursor = 'pointer';
        buttonEl.style.border = 'none';
        buttonEl.style.width = '150px';
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
