import { NostrEvent } from '../../types';
import { ValidationService } from '../validation-service';

export interface EventTypeHandler {
    process(event: NostrEvent): Promise<void>;
    getKind(): number;
    getKinds?(): number[];  // New method for handlers that process multiple kinds
    getPriority(): number;
}

export class EventStreamHandler {
    private handlers: Map<number, EventTypeHandler[]> = new Map();
    private processedEvents: Set<string> = new Set();
    private historicalComplete: boolean = false;

    constructor() {
        // Initialize with empty handler map
        // Handlers will be registered by the FetchProcessor
    }

    registerHandler(handler: EventTypeHandler): void {
        // Get all kinds this handler can process
        const kinds = handler.getKinds?.() || [handler.getKind()];
        
        // Register handler for each kind it handles
        for (const kind of kinds) {
            if (!this.handlers.has(kind)) {
                this.handlers.set(kind, []);
            }
            this.handlers.get(kind)!.push(handler);
            
            // Sort handlers by priority
            this.handlers.get(kind)!.sort((a, b) => a.getPriority() - b.getPriority());
        }
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

        // Get handlers for this event kind
        const handlers = this.handlers.get(event.kind) || [];
        
        // Process through all matching handlers
        for (const handler of handlers) {
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
        for (const handlers of this.handlers.values()) {
            for (const handler of handlers) {
                if ('onHistoricalComplete' in handler) {
                    (handler as any).onHistoricalComplete();
                }
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
        const allHandlers = new Set<EventTypeHandler>();
        for (const handlers of this.handlers.values()) {
            for (const handler of handlers) {
                allHandlers.add(handler);
            }
        }
        return Array.from(allHandlers)
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
