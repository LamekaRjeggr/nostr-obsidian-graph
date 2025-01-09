import { App, Modal, Setting, Notice } from 'obsidian';
import type { Moment } from 'moment';
import { NostrEvent, IVaultService, IProfileService } from '../interfaces';
import { SearchOptions } from '../services/core/search';

enum SearchType {
    General = 'general',
    RepliesForUser = 'replies_user',
    RepliesForNote = 'replies_note',
    FetchProfile = 'fetch_profile'
}

export class SearchModal extends Modal {
    private options: SearchOptions = {
        keyword: '',
        limit: 50
    };
    private searchType: SearchType = SearchType.General;
    private pubkeyInput: string = '';
    private noteIdInput: string = '';
    private searching: boolean = false;
    private timeFrameSelect: HTMLSelectElement;
    private customStartInput: HTMLInputElement;
    private customEndInput: HTMLInputElement;
    
    constructor(
        app: App,
        private vaultService: IVaultService,
        private profileService: IProfileService,
        private onSearch: (options: SearchOptions) => Promise<NostrEvent[]>
    ) {
        super(app);
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: 'Search Nostr' });

        // Search type dropdown
        new Setting(contentEl)
            .setName('Search Type')
            .setDesc('Select what to search for')
            .addDropdown(dropdown => dropdown
                .addOption(SearchType.General, 'General Search')
                .addOption(SearchType.RepliesForUser, 'Find Replies to User')
                .addOption(SearchType.RepliesForNote, 'Find Replies to Note')
                .addOption(SearchType.FetchProfile, 'Fetch Profile')
                .setValue(this.searchType)
                .onChange(value => {
                    this.searchType = value as SearchType;
                    // Clear all previous search options
                    this.options = {
                        limit: this.options.limit // Preserve limit setting
                    };
                    this.pubkeyInput = '';
                    this.noteIdInput = '';
                    // Clear time range
                    if (this.timeFrameSelect) {
                        this.timeFrameSelect.value = 'all';
                    }
                    if (this.customStartInput) {
                        this.customStartInput.value = '';
                    }
                    if (this.customEndInput) {
                        this.customEndInput.value = '';
                    }
                    // Refresh the modal to show/hide relevant fields
                    this.onOpen();
                }));

        // Conditional inputs based on search type
        if (this.searchType === SearchType.General) {
            // Keyword input for general search
        new Setting(contentEl)
            .setName('Keyword')
            .setDesc('Enter search term')
            .addText(text => text
                .setPlaceholder('Enter keyword...')
                .setValue(this.options.keyword)
                .onChange(value => this.options.keyword = value));

        } else if (this.searchType === SearchType.RepliesForUser) {
            // Pubkey input for finding replies to user
            new Setting(contentEl)
                .setName('User Key')
                .setDesc('Enter pubkey (hex or npub) to find replies to')
                .addText(text => text
                    .setPlaceholder('Enter pubkey...')
                    .setValue(this.pubkeyInput)
                    .onChange(value => this.pubkeyInput = value));
        } else if (this.searchType === SearchType.FetchProfile) {
            // Profile pubkey input
            new Setting(contentEl)
                .setName('Profile Key')
                .setDesc('Enter pubkey (hex or npub) to fetch')
                .addText(text => text
                    .setPlaceholder('Enter pubkey...')
                    .setValue(this.pubkeyInput)
                    .onChange(value => this.pubkeyInput = value));
        } else if (this.searchType === SearchType.RepliesForNote) {
            // Note ID input for finding replies to note
            new Setting(contentEl)
                .setName('Note ID')
                .setDesc('Enter note ID (hex or note1) to find replies to')
                .addText(text => text
                    .setPlaceholder('Enter note ID...')
                    .setValue(this.noteIdInput)
                    .onChange(value => this.noteIdInput = value));
        }

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

                    // Validate search criteria based on type
                    if (this.searchType === SearchType.General) {
                        if (!this.options.keyword && !this.options.since && !this.options.until) {
                            new Notice('Please enter a keyword or select a time range');
                            return;
                        }
                    } else if (this.searchType === SearchType.RepliesForUser) {
                        if (!this.pubkeyInput) {
                            new Notice('Please enter a pubkey');
                            return;
                        }
                        try {
                            // Fetch and save profile first
                            const profile = await this.profileService.fetchEvent(this.pubkeyInput);
                            await this.vaultService.saveEvent(profile, true);
                            new Notice('Profile fetched successfully');
                            
                            // Add p tag filter for replies to user
                            // Note: nostr-tools will handle both hex and bech32 formats
                            this.options['#p'] = [this.pubkeyInput];
                            // Clear any existing keyword search
                            delete this.options.keyword;
                        } catch (error) {
                            new Notice('Failed to fetch profile: ' + error.message);
                            // Continue with reply search even if profile fetch fails
                        }
                    } else if (this.searchType === SearchType.RepliesForNote) {
                        if (!this.noteIdInput) {
                            new Notice('Please enter a note ID');
                            return;
                        }
                        // Add e tag filter for replies to note
                        // Note: nostr-tools will handle both hex and bech32 formats
                        this.options['#e'] = [this.noteIdInput];
                        // Clear any existing keyword search
                        delete this.options.keyword;
                    } else if (this.searchType === SearchType.FetchProfile) {
                        if (!this.pubkeyInput) {
                            new Notice('Please enter a pubkey');
                            return;
                        }
                        
                        this.searching = true;
                        btn.setButtonText('Fetching...');
                        
                        try {
                            // Fetch and save profile
                            const profile = await this.profileService.fetchEvent(this.pubkeyInput);
                            await this.vaultService.saveEvent(profile, true);
                            this.close();
                            new Notice('Profile fetched successfully');
                            return;
                        } catch (error) {
                            new Notice('Failed to fetch profile: ' + error.message);
                            this.searching = false;
                            btn.setButtonText('Search');
                            return;
                        }
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
