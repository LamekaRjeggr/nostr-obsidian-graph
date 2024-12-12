import { NostrEvent } from '../../types';
import { ValidationService } from '../validation-service';

export interface EventTypeHandler {
    process(event: NostrEvent): Promise<void>;
    getKind(): number;
    getPriority(): number;
}

export class EventStreamHandler {
    private handlers: Map<number, EventTypeHandler> = new Map();
    private processedEvents: Set<string> = new Set();
    private historicalComplete: boolean = false;

    constructor() {
        // Initialize with empty handler map
        // Handlers will be registered by the FetchProcessor
    }

    registerHandler(handler: EventTypeHandler): void {
        this.handlers.set(handler.getKind(), handler);
    }

    async handleEvent(event: NostrEvent): Promise<void> {
        // Skip if already processed
        if (this.processedEvents.has(event.id)) {
            return;
        }

        // Validate event
        if (!ValidationService.validateEvent(event)) {
            return;
        }

        // Mark as processed
        this.processedEvents.add(event.id);

        // Get handler for this event kind
        const handler = this.handlers.get(event.kind);
        if (handler) {
            try {
                await handler.process(event);
            } catch (error) {
                console.error(`Error processing event ${event.id}:`, error);
                // Silent fail to maintain backwards compatibility
            }
        }
    }

    handleEOSE(): void {
        this.historicalComplete = true;
        // Notify handlers that historical data is complete
        for (const handler of this.handlers.values()) {
            if ('onHistoricalComplete' in handler) {
                (handler as any).onHistoricalComplete();
            }
        }
    }

    isHistoricalComplete(): boolean {
        return this.historicalComplete;
    }

    reset(): void {
        this.processedEvents.clear();
        this.historicalComplete = false;
    }

    // Get handlers sorted by priority
    getSortedHandlers(): EventTypeHandler[] {
        return Array.from(this.handlers.values())
            .sort((a, b) => a.getPriority() - b.getPriority());
    }

    // For backwards compatibility
    getProcessedCount(): number {
        return this.processedEvents.size;
    }

    hasProcessed(eventId: string): boolean {
        return this.processedEvents.has(eventId);
    }
}
