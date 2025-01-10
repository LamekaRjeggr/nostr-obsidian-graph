import { Notice, Setting } from 'obsidian';
import { ModalSection, ModalSectionProps, SearchSettings, SearchScope, TimeRange, ContentType } from '../types';
import { NostrEventBus } from '../../../experimental/event-bus/event-bus';
import { NostrEventType } from '../../../experimental/event-bus/types';
import * as moment from 'moment';

export class KeywordSearchSection implements ModalSection {
    private settings: SearchSettings;
    private keywords: string[] = [];
    private props: ModalSectionProps;

    constructor(settings: SearchSettings, props: ModalSectionProps) {
        this.settings = settings;
        this.props = props;
    }

    createSection(container: HTMLElement): HTMLElement {
        const section = container.createDiv();

        new Setting(section)
            .setName('Search Batch Size')
            .setDesc('Number of notes to fetch per search request (1-5000)')
            .addSlider(slider => slider
                .setLimits(1, 5000, 100)
                .setValue(this.settings.searchBatchSize)
                .setDynamicTooltip()
                .onChange(async value => {
                    this.settings.searchBatchSize = value;
                    await this.props.onSettingsChange?.(this.settings);
                }));

        new Setting(section)
            .setName('Search Scope')
            .setDesc('Define the scope of profiles to search')
            .addDropdown(dropdown => dropdown
                .addOptions(Object.fromEntries(
                    Object.values(SearchScope).map(value => [value, value])
                ))
                .setValue(this.settings.scope)
                .onChange(async (value: SearchScope) => {
                    this.settings.scope = value;
                    await this.props.onSettingsChange?.(this.settings);
                }));

        new Setting(section)
            .setName('Time Range')
            .setDesc('Define the time period to search')
            .addDropdown(dropdown => dropdown
                .addOptions(Object.fromEntries(
                    Object.values(TimeRange).map(value => [value, value])
                ))
                .setValue(this.settings.timeRange)
                .onChange(async (value: TimeRange) => {
                    this.settings.timeRange = value;
                    await this.props.onSettingsChange?.(this.settings);
                    if (value === TimeRange.CUSTOM) {
                        this.showCustomDateInputs(section);
                    }
                }));

        new Setting(section)
            .setName('Content Type')
            .setDesc('Filter by content type')
            .addDropdown(dropdown => dropdown
                .addOptions(Object.fromEntries(
                    Object.values(ContentType).map(value => [value, value])
                ))
                .setValue(this.settings.contentType)
                .onChange(async (value: ContentType) => {
                    this.settings.contentType = value;
                    await this.props.onSettingsChange?.(this.settings);
                }));

        new Setting(section)
            .setName('Keyword Search')
            .setDesc('Enter keywords separated by commas')
            .addText(text => text
                .setPlaceholder('word1, word2, ...')
                .onChange(value => {
                    this.keywords = value.split(',')
                        .map(k => k.trim())
                        .filter(k => k.length > 0);
                }));

        const searchButton = section.createEl('button', {
            text: 'Search',
            cls: 'mod-cta'
        });
        searchButton.style.width = '100%';
        searchButton.style.marginTop = '20px';
        searchButton.onclick = () => {
            if (this.keywords.length > 0) {
                NostrEventBus.getInstance().publish(
                    NostrEventType.KEYWORD_SEARCH,
                    {
                        keywords: this.keywords,
                        limit: this.settings.searchBatchSize,
                        searchSettings: this.settings
                    }
                );
                this.props.closeModal?.();
            } else {
                new Notice('Please enter at least one keyword');
            }
        };

        return section;
    }

    private showCustomDateInputs(container: HTMLElement) {
        const customDatesContainer = container.createDiv();
        customDatesContainer.style.marginTop = '10px';

        new Setting(customDatesContainer)
            .setName('Start Date')
            .addText(text => text
                .setPlaceholder('YYYY-MM-DD')
                .onChange(async value => {
                    const date = moment.utc(value, 'YYYY-MM-DD').valueOf();
                    if (!isNaN(date)) {
                        this.settings.customStartDate = date;
                        await this.props.onSettingsChange?.(this.settings);
                    }
                }));

        new Setting(customDatesContainer)
            .setName('End Date')
            .addText(text => text
                .setPlaceholder('YYYY-MM-DD')
                .onChange(async value => {
                    const date = moment.utc(value, 'YYYY-MM-DD').valueOf();
                    if (!isNaN(date)) {
                        this.settings.customEndDate = date;
                        await this.props.onSettingsChange?.(this.settings);
                    }
                }));
    }
}
