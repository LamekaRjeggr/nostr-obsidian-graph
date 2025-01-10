import { App, Modal } from 'obsidian';
import { FetchService } from '../../services/fetch/fetch-service';
import { FetchSettings, SearchSettings, ThreadSettings, SearchScope, TimeRange, ContentType } from './types';
import { RegularFetchSection } from './sections/regular-fetch-section';
import { ThreadFetchSection } from './sections/thread-fetch-section';
import { HexFetchSection } from './sections/hex-fetch-section';
import { KeywordSearchSection } from './sections/keyword-search-section';

type FetchMode = 'regular' | 'thread' | 'hex' | 'keyword';

export class FetchSettingsModal extends Modal {
    private currentMode: FetchMode = 'regular';
    private contentSections: { [key in FetchMode]: HTMLElement } = {} as any;
    private readonly onSubmit: (settings: FetchSettings) => Promise<void>;
    private settings: FetchSettings;
    private searchSettings: SearchSettings;
    private threadSettings: ThreadSettings;
    private fetchService: FetchService;

    constructor(
        app: App, 
        currentSettings: FetchSettings,
        onSubmit: (settings: FetchSettings) => Promise<void>,
        fetchService: FetchService
    ) {
        super(app);
        this.settings = { 
            ...currentSettings,
            hexFetch: currentSettings.hexFetch || { batchSize: 50 }
        };
        this.searchSettings = {
            scope: SearchScope.DIRECT_FOLLOWS,
            timeRange: TimeRange.ALL_TIME,
            contentType: ContentType.ALL,
            searchBatchSize: 1000
        };
        this.threadSettings = {
            limit: 50,
            includeContext: true
        };
        this.onSubmit = onSubmit;
        this.fetchService = fetchService;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        // Set fixed height for modal
        contentEl.style.height = '500px';  // Reduced height
        contentEl.style.width = '500px';   // Fixed width

        // Create toolbar
        this.createToolbar(contentEl);

        // Create content container with padding
        const container = contentEl.createDiv();
        container.style.padding = '0 20px';
        container.style.height = 'calc(100% - 60px)'; // Account for toolbar
        container.style.overflow = 'auto';

        // Create sections
        this.createContentSections(container);

        // Show initial mode
        this.showMode('regular');
    }

    private createToolbar(contentEl: HTMLElement) {
        const toolbar = contentEl.createDiv({ cls: 'fetch-settings-toolbar' });
        toolbar.style.display = 'flex';
        toolbar.style.marginBottom = '20px';
        toolbar.style.borderBottom = '1px solid var(--background-modifier-border)';
        toolbar.style.position = 'sticky';
        toolbar.style.top = '0';
        toolbar.style.backgroundColor = 'var(--background-primary)';
        toolbar.style.zIndex = '1';
        toolbar.style.padding = '10px 20px';

        const modes: FetchMode[] = ['regular', 'thread', 'hex', 'keyword'];
        modes.forEach(mode => {
            const btn = toolbar.createEl('button', { text: mode.charAt(0).toUpperCase() + mode.slice(1) });
            btn.style.flex = '1';
            btn.style.padding = '8px';
            btn.style.margin = '0 4px';
            btn.style.border = 'none';
            btn.style.borderRadius = '4px';
            btn.style.cursor = 'pointer';
            btn.onclick = () => this.showMode(mode);
        });
    }

    private showMode(mode: FetchMode) {
        this.currentMode = mode;
        Object.entries(this.contentSections).forEach(([key, section]) => {
            section.style.display = key === mode ? 'block' : 'none';
        });
        
        // Update toolbar button states
        const buttons = this.contentEl.querySelector('.fetch-settings-toolbar')?.children;
        if (buttons) {
            Array.from(buttons).forEach((btn: HTMLElement, index) => {
                if (index === ['regular', 'thread', 'hex', 'keyword'].indexOf(mode)) {
                    btn.style.backgroundColor = 'var(--interactive-accent)';
                    btn.style.color = 'var(--text-on-accent)';
                } else {
                    btn.style.backgroundColor = 'transparent';
                    btn.style.color = 'var(--text-normal)';
                }
            });
        }
    }

    private createContentSections(container: HTMLElement) {
        const props = {
            app: this.app,
            fetchService: this.fetchService,
            closeModal: () => this.close(),
            onSettingsChange: async (settings: any) => {
                // Only update settings state without triggering fetch operations
                if (this.currentMode === 'regular') {
                    this.settings = {
                        ...this.settings,
                        notesPerProfile: settings.notesPerProfile,
                        batchSize: settings.batchSize,
                        includeOwnNotes: settings.includeOwnNotes
                    };
                    // Save settings immediately
                    await this.onSubmit(this.settings);
                } else if (this.currentMode === 'thread') {
                    this.threadSettings = settings;
                } else if (this.currentMode === 'keyword') {
                    this.searchSettings = settings;
                } else if (this.currentMode === 'hex') {
                    this.settings.hexFetch = settings.hexFetch;
                }
            }
        };

        // Create sections
        const regularSection = new RegularFetchSection(this.settings, props);
        const threadSection = new ThreadFetchSection(this.threadSettings, props);
        const hexSection = new HexFetchSection(this.settings, props);
        const keywordSection = new KeywordSearchSection(this.searchSettings, props);

        // Store section elements
        this.contentSections.regular = regularSection.createSection(container);
        this.contentSections.thread = threadSection.createSection(container);
        this.contentSections.hex = hexSection.createSection(container);
        this.contentSections.keyword = keywordSection.createSection(container);
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
