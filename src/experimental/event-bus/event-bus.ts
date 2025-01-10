/**
 * Core event bus implementation for experimental features.
 * Handles event subscription, publishing, and management.
 */

import { 
    NostrEventType, 
    EventHandler, 
    EventBusOptions, 
    EventError,
    EventResult 
} from './types';

export class NostrEventBus {
    private handlers = new Map<NostrEventType, EventHandler[]>();
    private static instance: NostrEventBus;
    private options: Required<EventBusOptions>;

    private constructor(options: EventBusOptions = {}) {
        this.options = {
            enableLogging: false,
            maxHandlers: 10,
            handlerTimeout: 5000,
            ...options
        };
    }

    /**
     * Get the singleton instance of the event bus
     */
    static getInstance(options?: EventBusOptions): NostrEventBus {
        if (!NostrEventBus.instance) {
            NostrEventBus.instance = new NostrEventBus(options);
        }
        return NostrEventBus.instance;
    }

    /**
     * Subscribe a handler to an event type
     */
    subscribe(type: NostrEventType, handler: EventHandler): EventResult {
        try {
            if (!this.handlers.has(type)) {
                this.handlers.set(type, []);
            }

            const handlers = this.handlers.get(type)!;
            
            if (handlers.length >= this.options.maxHandlers) {
                return {
                    success: false,
                    error: {
                        type: EventError.MAX_HANDLERS_EXCEEDED,
                        message: `Maximum handlers (${this.options.maxHandlers}) reached for ${type}`
                    }
                };
            }

            handlers.push(handler);
            handlers.sort((a, b) => a.priority - b.priority);
            
            this.log(`Handler subscribed to ${type}`);
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: {
                    type: EventError.HANDLER_ERROR,
                    message: 'Error subscribing handler',
                    details: error
                }
            };
        }
    }

    /**
     * Publish an event to all registered handlers
     */
    async publish(type: NostrEventType, event: any): Promise<EventResult> {
        try {
            const handlers = this.handlers.get(type) || [];
            this.log(`Publishing ${type} event to ${handlers.length} handlers`);

            for (const handler of handlers) {
                if (!handler.filter || handler.filter(event)) {
                    try {
                        await this.executeWithTimeout(
                            handler.handle(event),
                            this.options.handlerTimeout
                        );
                    } catch (error) {
                        this.log(`Error in handler for ${type}: ${error}`, 'error');
                    }
                }
            }

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: {
                    type: EventError.HANDLER_ERROR,
                    message: 'Error publishing event',
                    details: error
                }
            };
        }
    }

    /**
     * Unsubscribe a handler from an event type
     */
    async unsubscribe(type: NostrEventType, handler: EventHandler): Promise<EventResult> {
        try {
            const handlers = this.handlers.get(type);
            if (handlers) {
                const index = handlers.indexOf(handler);
                if (index > -1) {
                    handlers.splice(index, 1);
                    if (handler.cleanup) {
                        await handler.cleanup();
                    }
                    this.log(`Handler unsubscribed from ${type}`);
                }
            }
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: {
                    type: EventError.HANDLER_ERROR,
                    message: 'Error unsubscribing handler',
                    details: error
                }
            };
        }
    }

    /**
     * Reset the event bus state
     */
    async reset(): Promise<void> {
        for (const handlers of this.handlers.values()) {
            for (const handler of handlers) {
                if (handler.cleanup) {
                    await handler.cleanup();
                }
            }
        }
        this.handlers.clear();
        this.log('Event bus reset');
    }

    /**
     * Execute a promise with timeout
     */
    private async executeWithTimeout(
        promise: Promise<any>,
        timeout: number
    ): Promise<any> {
        return Promise.race([
            promise,
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Handler timeout')), timeout)
            )
        ]);
    }

    /**
     * Log a message if logging is enabled
     */
    private log(message: string, level: 'log' | 'error' = 'log'): void {
        if (this.options.enableLogging) {
            if (level === 'error') {
                console.error(`[EventBus] ${message}`);
            } else {
                console.log(`[EventBus] ${message}`);
            }
        }
    }
}
