import { App, Modal, Setting, Notice } from 'obsidian';
import type { Moment } from 'moment';
import { NostrEvent, IVaultService } from '../interfaces';
import { SearchOptions } from '../services/core/search';

export class SearchModal extends Modal {
    private options: SearchOptions = {
        keyword: '',
        limit: 50
    };
    private searching: boolean = false;
    private timeFrameSelect: HTMLSelectElement;
    private customStartInput: HTMLInputElement;
    private customEndInput: HTMLInputElement;
    
    constructor(
        app: App,
        private vaultService: IVaultService,
        private onSearch: (options: SearchOptions) => Promise<NostrEvent[]>
    ) {
        super(app);
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: 'Search Nostr' });

        // Keyword input
        new Setting(contentEl)
            .setName('Keyword')
            .setDesc('Enter search term')
            .addText(text => text
                .setPlaceholder('Enter keyword...')
                .setValue(this.options.keyword)
                .onChange(value => this.options.keyword = value));

        // Result limit
        new Setting(contentEl)
            .setName('Result Limit')
            .setDesc('Maximum number of results to return')
            .addSlider(slider => slider
                .setLimits(10, 500, 10)
                .setValue(this.options.limit)
                .setDynamicTooltip()
                .onChange(value => this.options.limit = value));

        // Time frame dropdown
        const timeFrameContainer = contentEl.createDiv();
        new Setting(timeFrameContainer)
            .setName('Time Frame')
            .setDesc('Select time period to search')
            .addDropdown(dropdown => {
                this.timeFrameSelect = dropdown.selectEl;
                dropdown
                    .addOption('all', 'All Time')
                    .addOption('1h', 'Last Hour')
                    .addOption('24h', 'Last 24 Hours')
                    .addOption('7d', 'Last 7 Days')
                    .addOption('30d', 'Last 30 Days')
                    .addOption('custom', 'Custom Range')
                    .setValue('all')
                    .onChange(value => this.updateTimeFrame(value, timeFrameContainer));
            });

        // Custom date range container (hidden by default)
        const customRangeContainer = timeFrameContainer.createDiv();
        customRangeContainer.style.display = 'none';

        // Start date
        new Setting(customRangeContainer)
            .setName('Start Date')
            .addText(text => {
                this.customStartInput = text.inputEl;
                text.setPlaceholder('YYYY-MM-DD')
                    .onChange(() => this.updateCustomTimeFrame());
            });

        // End date
        new Setting(customRangeContainer)
            .setName('End Date')
            .addText(text => {
                this.customEndInput = text.inputEl;
                text.setPlaceholder('YYYY-MM-DD')
                    .onChange(() => this.updateCustomTimeFrame());
            });

        // Search button
        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('Search')
                .setCta()
                .onClick(async () => {
                    if (this.searching) return;
                    
                    // Trim keyword if provided
                    if (this.options.keyword) {
                        this.options.keyword = this.options.keyword.trim();
                        if (!this.options.keyword) {
                            delete this.options.keyword;
                        }
                    }

                    // Validate that we have at least one search criteria
                    if (!this.options.keyword && !this.options.since && !this.options.until) {
                        new Notice('Please enter a keyword or select a time range');
                        return;
                    }
                    
                    this.searching = true;
                    btn.setButtonText('Searching...');
                    
                    try {
                        const results = await this.onSearch(this.options);
                        for (const note of results) {
                            await this.vaultService.saveEvent(note);
                        }
                        this.close();
                        new Notice(`Found ${results.length} notes`);
                    } catch (error) {
                        new Notice('Search failed: ' + error.message);
                    } finally {
                        this.searching = false;
                        btn.setButtonText('Search');
                    }
                }));
    }

    private updateTimeFrame(value: string, container: HTMLElement) {
        const customContainer = container.querySelector('div');
        if (!customContainer) return;

        customContainer.style.display = value === 'custom' ? 'block' : 'none';

        const now = window.moment().unix();
        switch (value) {
            case 'all':
                delete this.options.since;
                delete this.options.until;
                break;
            case '1h':
                this.options.since = now - 3600;
                this.options.until = now;
                break;
            case '24h':
                this.options.since = now - 86400;
                this.options.until = now;
                break;
            case '7d':
                this.options.since = now - 604800;
                this.options.until = now;
                break;
            case '30d':
                this.options.since = now - 2592000;
                this.options.until = now;
                break;
            case 'custom':
                // Will be handled by updateCustomTimeFrame
                break;
        }
    }

    private updateCustomTimeFrame() {
        const startDate = window.moment(this.customStartInput.value, 'YYYY-MM-DD');
        const endDate = window.moment(this.customEndInput.value, 'YYYY-MM-DD');

        if (startDate.isValid() && endDate.isValid()) {
            this.options.since = startDate.startOf('day').unix();
            this.options.until = endDate.endOf('day').unix();
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
