import { Event } from 'nostr-tools';
import { IStreamProcessor } from './interfaces/IStreamProcessor';
import { IEventHandler } from './interfaces/IEventHandler';

export class EventStreamHandler implements IStreamProcessor {
    private handlers: Map<number, IEventHandler> = new Map();

    registerHandler(handler: IEventHandler): void {
        this.handlers.set(handler.kind, handler);
    }

    async processEvent(event: Event): Promise<void> {
        const handler = this.handlers.get(event.kind);
        if (handler && handler.validate(event)) {
            await handler.process(event);
        }
    }

    async processEvents(events: Event[]): Promise<void> {
        const sortedEvents = this.sortByPriority(events);
        for (const event of sortedEvents) {
            await this.processEvent(event);
        }
    }

    async processBatch(events: Event[], batchSize: number, delayMs?: number): Promise<void> {
        const batches = this.createBatches(events, batchSize);
        for (const batch of batches) {
            await this.processEvents(batch);
            if (delayMs) {
                await new Promise(r => setTimeout(r, delayMs));
            }
        }
    }

    async handleEOSE(): Promise<void> {
        // Notify handlers of end of stream
        for (const handler of this.handlers.values()) {
            await handler.cleanup();
        }
    }

    reset(): void {
        this.handlers.clear();
    }

    getHandlers(): Map<number, IEventHandler> {
        return new Map(Array.from(this.handlers.entries()).map(([k, h]) => [k, {
            kind: h.kind,
            priority: h.priority,
            process: h.process.bind(h),
            validate: h.validate.bind(h),
            cleanup: h.cleanup.bind(h)
        }]));
    }

    hasHandler(kind: number): boolean {
        return this.handlers.has(kind);
    }

    getHandler(kind: number): IEventHandler | null {
        const handler = this.handlers.get(kind);
        if (!handler) return null;
        return {
            kind: handler.kind,
            priority: handler.priority,
            process: handler.process.bind(handler),
            validate: handler.validate.bind(handler),
            cleanup: handler.cleanup.bind(handler)
        };
    }

    getOrderedHandlers(): IEventHandler[] {
        return Array.from(this.handlers.values())
            .sort((a, b) => a.priority - b.priority)
            .map(h => ({
                kind: h.kind,
                priority: h.priority,
                process: h.process.bind(h),
                validate: h.validate.bind(h),
                cleanup: h.cleanup.bind(h)
            }));
    }

    private sortByPriority(events: Event[]): Event[] {
        const handlers = this.getOrderedHandlers();
        const kindPriority = new Map(
            handlers.map((h, i) => [h.kind, i])
        );

        return [...events].sort((a, b) => {
            const priorityA = kindPriority.get(a.kind) ?? Number.MAX_SAFE_INTEGER;
            const priorityB = kindPriority.get(b.kind) ?? Number.MAX_SAFE_INTEGER;
            return priorityA - priorityB;
        });
    }

    private createBatches<T>(items: T[], size: number): T[][] {
        const batches: T[][] = [];
        for (let i = 0; i < items.length; i += size) {
            batches.push(items.slice(i, i + size));
        }
        return batches;
    }
}
