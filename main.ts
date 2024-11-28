// Previous imports and interfaces remain the same...

export default class NostrObsidianGraphPlugin extends Plugin {
    // Previous properties remain the same...

    private async ensureSecureContext(): Promise<void> {
        // Set required security headers for SharedArrayBuffer
        const headers = {
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Embedder-Policy': 'require-corp'
        };

        // Check if headers are set
        const response = await fetch(window.location.href);
        const hasSecureHeaders = Object.entries(headers).every(
            ([key, value]) => response.headers.get(key) === value
        );

        if (!hasSecureHeaders) {
            console.warn('Secure context not established. Some features may be limited.');
        }
    }

    private getBrowserInfo(): { isModern: boolean; features: string[] } {
        const features: string[] = [];
        
        // Use feature detection instead of user agent strings
        if ('serviceWorker' in navigator) features.push('serviceWorker');
        if ('storage' in navigator) features.push('persistentStorage');
        if ('share' in navigator) features.push('webShare');
        if ('clipboard' in navigator) features.push('clipboard');
        if ('credentials' in navigator) features.push('credentials');

        // Check for modern browser features we need
        const isModern = typeof window.WebSocket !== 'undefined' && 
                        typeof window.Worker !== 'undefined' &&
                        typeof window.crypto !== 'undefined';

        return { isModern, features };
    }

    async onload(): Promise<void> {
        console.log('Loading Nostr Graph plugin...');
        
        // Check browser compatibility
        const { isModern, features } = this.getBrowserInfo();
        if (!isModern) {
            console.warn('Some browser features required by this plugin are not available.');
            return;
        }

        // Ensure secure context for SharedArrayBuffer
        await this.ensureSecureContext();

        await this.loadSettings();
        this.addSettingTab(new NostrSettingTab(this.app, this));
        this.addCommand({
            id: 'fetch-nostr-profiles',
            name: 'Fetch Nostr Profiles and Notes',
            callback: () => this.fetchNostrData()
        });

        // Initialize error handling
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason, 'Unhandled Promise Rejection');
            event.preventDefault();
        });

        console.log("Nostr Obsidian Graph plugin loaded!", { features });
    }

    private handleError(error: Error, context: string): void {
        console.error(`Error in ${context}:`, error);
        this.logStatus(`Error in ${context}`, { 
            error: error.message,
            stack: error.stack,
            time: new Date().toISOString()
        });

        // Store errors for debugging
        const errors = this.app.loadData('nostr-graph-errors') || [];
        errors.push({
            context,
            message: error.message,
            stack: error.stack,
            time: new Date().toISOString()
        });
        this.app.saveData('nostr-graph-errors', errors.slice(-100)); // Keep last 100 errors
    }

    // Rest of the class implementation remains the same...
}
