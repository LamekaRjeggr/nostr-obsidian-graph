import { Event } from 'nostr-tools';
import { IEventHandler } from './IEventHandler';

/**
 * Interface for processing streams of nostr events in order
 */
export interface IStreamProcessor {
    /**
     * Register an event handler
     * @param handler Handler to register
     */
    registerHandler(handler: IEventHandler): void;

    /**
     * Process a single event through registered handlers
     * @param event Event to process
     */
    processEvent(event: Event): Promise<void>;

    /**
     * Process multiple events in order
     * @param events Array of events to process
     */
    processEvents(events: Event[]): Promise<void>;

    /**
     * Process events in batches
     * @param events Events to process
     * @param batchSize Size of each batch
     * @param delayMs Optional delay between batches
     */
    processBatch(events: Event[], batchSize: number, delayMs?: number): Promise<void>;

    /**
     * Handle end of stream
     * Called when all events have been processed
     */
    handleEOSE(): Promise<void>;

    /**
     * Reset processor state
     * Clears handlers and any cached data
     */
    reset(): void;

    /**
     * Get registered handlers
     * @returns Map of event kinds to handlers
     */
    getHandlers(): Map<number, IEventHandler>;

    /**
     * Check if processor has handler for event kind
     * @param kind Event kind to check
     */
    hasHandler(kind: number): boolean;

    /**
     * Get handler for event kind
     * @param kind Event kind
     * @returns Handler or null if not found
     */
    getHandler(kind: number): IEventHandler | null;

    /**
     * Get handlers in priority order
     * @returns Array of handlers sorted by priority
     */
    getOrderedHandlers(): IEventHandler[];
}

/**
 * Configuration for stream processor
 */
export interface StreamProcessorConfig {
    /**
     * Whether to process events in parallel
     * Default: false (process in series)
     */
    parallel?: boolean;

    /**
     * Default batch size for batch processing
     * Default: 50
     */
    defaultBatchSize?: number;

    /**
     * Default delay between batches in ms
     * Default: 100
     */
    defaultBatchDelay?: number;

    /**
     * Whether to validate events before processing
     * Default: true
     */
    validateEvents?: boolean;

    /**
     * Whether to continue on handler errors
     * Default: true
     */
    continueOnError?: boolean;
}
