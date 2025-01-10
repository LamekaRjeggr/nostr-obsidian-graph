import { Setting } from 'obsidian';
import { ValidationService } from '../../../services/validation-service';
import { FetchSettings, ModalSection, ModalSectionProps } from '../types';

export class RegularFetchSection implements ModalSection {
    private settings: FetchSettings;
    private props: ModalSectionProps;

    constructor(settings: FetchSettings, props: ModalSectionProps) {
        this.settings = settings;
        this.props = props;
    }

    createSection(container: HTMLElement): HTMLElement {
        const section = container.createDiv();
        
        new Setting(section)
            .setName('Notes Per Profile')
            .setDesc('Maximum number of notes to fetch per profile')
            .addSlider(slider => slider
                .setLimits(1, 500, 1)
                .setValue(this.settings.notesPerProfile)
                .setDynamicTooltip()
                .onChange(async value => {
                    if (ValidationService.validateLimit(value)) {
                        this.settings.notesPerProfile = value;
                        // Pass the entire settings object to ensure all values are saved
                        await this.props.onSettingsChange?.({
                            notesPerProfile: value,
                            batchSize: this.settings.batchSize,
                            includeOwnNotes: this.settings.includeOwnNotes
                        });
                    }
                }));

        new Setting(section)
            .setName('Fetch Batch Size')
            .setDesc('Number of notes to fetch per regular request (1-500)')
            .addSlider(slider => slider
                .setLimits(1, 500, 1)
                .setValue(this.settings.batchSize)
                .setDynamicTooltip()
                .onChange(async value => {
                    if (value >= 1 && value <= 500) {
                        this.settings.batchSize = value;
                        // Pass the entire settings object to ensure all values are saved
                        await this.props.onSettingsChange?.({
                            notesPerProfile: this.settings.notesPerProfile,
                            batchSize: value,
                            includeOwnNotes: this.settings.includeOwnNotes
                        });
                    }
                }));

        new Setting(section)
            .setName('Include Own Notes')
            .setDesc('Include your own notes in the fetch')
            .addToggle(toggle => toggle
                .setValue(this.settings.includeOwnNotes)
                .onChange(async value => {
                    this.settings.includeOwnNotes = value;
                    // Pass the entire settings object to ensure all values are saved
                    await this.props.onSettingsChange?.({
                        notesPerProfile: this.settings.notesPerProfile,
                        batchSize: this.settings.batchSize,
                        includeOwnNotes: value
                    });
                }));

        const fetchButton = section.createEl('button', {
            text: 'Fetch Notes',
            cls: 'mod-cta'
        });
        fetchButton.style.width = '100%';
        fetchButton.style.marginTop = '20px';
        fetchButton.onclick = async () => {
            await this.props.fetchService.fetchMainUser();
            this.props.closeModal?.();
        };

        return section;
    }
}
