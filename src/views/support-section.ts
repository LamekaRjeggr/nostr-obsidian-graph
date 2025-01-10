import { Setting, ButtonComponent, Notice } from 'obsidian';

export class SupportSection {
    static addToContainer(containerEl: HTMLElement): void {
        // Add separator div
        const separator = containerEl.createDiv();
        separator.style.marginTop = '40px';
        separator.style.marginBottom = '40px';
        separator.style.borderTop = '1px solid var(--background-modifier-border)';

        // Support Header
        containerEl.createEl('h3', { text: 'Support' });

        // Value Question
        const valueQuestion = containerEl.createEl('p', {
            text: 'Are you finding value in the plugin?'
        });
        valueQuestion.addClass('setting-item-description');
        valueQuestion.style.marginBottom = '16px';

        // Lightning Section
        const lightningContainer = containerEl.createDiv();
        lightningContainer.addClass('support-section');
        
        const lightningText = lightningContainer.createEl('p', {
            text: 'Lightning contributions can be sent to:'
        });
        lightningText.addClass('setting-item-description');
        lightningText.style.marginBottom = '8px';

        const lightningAddress = lightningContainer.createEl('code', {
            text: 'syntaxerrs@strike.me'
        });
        lightningAddress.style.fontFamily = 'monospace';
        lightningAddress.style.fontSize = '14px';
        lightningAddress.style.display = 'block';
        lightningAddress.style.marginBottom = '16px';

        new Setting(lightningContainer)
            .addButton((button: ButtonComponent) => {
                button
                    .setButtonText('⚡️ Copy Lightning Address')
                    .onClick(() => {
                        navigator.clipboard.writeText('syntaxerrs@strike.me');
                        new Notice('Copied: syntaxerrs@strike.me');
                    });
                button.buttonEl.style.float = 'right';
            });

        // GitHub Section
        const githubContainer = containerEl.createDiv();
        githubContainer.addClass('support-section');
        githubContainer.style.marginTop = '32px';

        const githubText = githubContainer.createEl('p', {
            text: 'Care to contribute or help?'
        });
        githubText.addClass('setting-item-description');
        githubText.style.marginBottom = '8px';

        const githubLink = 'https://github.com/LamekaRjeggr/nostr-obsidian-graph.git';
        const githubAddress = githubContainer.createEl('code', {
            text: githubLink
        });
        githubAddress.style.fontFamily = 'monospace';
        githubAddress.style.fontSize = '14px';
        githubAddress.style.display = 'block';
        githubAddress.style.marginBottom = '16px';

        new Setting(githubContainer)
            .addButton((button: ButtonComponent) => {
                button
                    .setButtonText('Open GitHub Repository')
                    .onClick(() => {
                        window.open(githubLink, '_blank');
                    });
                button.buttonEl.style.float = 'right';
            });
    }
}
