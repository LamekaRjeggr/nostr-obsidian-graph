import { Notice, Setting } from 'obsidian';
import { ValidationService } from '../../../services/validation-service';
import { ModalSection, ModalSectionProps, ThreadSettings } from '../types';
import { NostrEventBus } from '../../../experimental/event-bus/event-bus';
import { NostrEventType } from '../../../experimental/event-bus/types';
import { CurrentFileService } from '../../../services/core/current-file-service';

export class ThreadFetchSection implements ModalSection {
    private settings: ThreadSettings;
    private props: ModalSectionProps;
    private threadEventId: string = '';
    private currentFileService: CurrentFileService;

    constructor(settings: ThreadSettings, props: ModalSectionProps) {
        this.settings = settings;
        this.props = props;
        this.currentFileService = new CurrentFileService(props.app);

        // Auto-populate event ID from current file
        const threadContext = this.currentFileService.getCurrentFileThreadContext();
        if (threadContext.eventId) {
            this.threadEventId = threadContext.eventId;
        }
    }

    createSection(container: HTMLElement): HTMLElement {
        const section = container.createDiv();

        new Setting(section)
            .setName('Event ID')
            .setDesc('Enter event ID to fetch thread context')
            .addText(text => text
                .setValue(this.threadEventId)
                .setPlaceholder('Enter event ID...')
                .onChange(value => {
                    this.threadEventId = value;
                }));

        new Setting(section)
            .setName('Thread Depth Limit')
            .setDesc('Maximum number of replies to fetch (1-100)')
            .addSlider(slider => slider
                .setLimits(1, 100, 1)
                .setValue(this.settings.limit)
                .setDynamicTooltip()
                .onChange(async value => {
                    this.settings.limit = value;
                    await this.props.onSettingsChange?.(this.settings);
                }));

        new Setting(section)
            .setName('Include Context')
            .setDesc('Fetch root and parent notes')
            .addToggle(toggle => toggle
                .setValue(this.settings.includeContext)
                .onChange(async value => {
                    this.settings.includeContext = value;
                    await this.props.onSettingsChange?.(this.settings);
                }));

        const fetchButton = section.createEl('button', {
            text: 'Fetch Thread',
            cls: 'mod-cta'
        });
        fetchButton.style.width = '100%';
        fetchButton.style.marginTop = '20px';
        fetchButton.onclick = () => {
            if (!this.threadEventId) {
                new Notice('Please enter an event ID');
                return;
            }

            if (!ValidationService.validateHex(this.threadEventId)) {
                new Notice('Invalid event ID format');
                return;
            }

            NostrEventBus.getInstance().publish(
                NostrEventType.THREAD_FETCH,
                {
                    eventId: this.threadEventId,
                    limit: this.settings.limit,
                    includeContext: this.settings.includeContext
                }
            );
            this.props.closeModal?.();
        };

        return section;
    }
}
