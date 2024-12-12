type EventCallback = (...args: any[]) => void;

export class EventEmitter {
    private events: Map<string, EventCallback[]>;

    constructor() {
        this.events = new Map();
    }

    on(event: string, callback: EventCallback): void {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event)?.push(callback);
    }

    off(event: string, callback: EventCallback): void {
        const callbacks = this.events.get(event);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index !== -1) {
                callbacks.splice(index, 1);
            }
            if (callbacks.length === 0) {
                this.events.delete(event);
            }
        }
    }

    emit(event: string, ...args: any[]): void {
        try {
            const callbacks = this.events.get(event);
            if (callbacks) {
                callbacks.forEach(callback => {
                    try {
                        callback(...args);
                    } catch (error) {
                        throw new Error(`Event callback failed: ${error.message}`);
                    }
                });
            }
        } catch (error) {
            throw new Error(`Event emission failed: ${error.message}`);
        }
    }

    removeAllListeners(event?: string): void {
        if (event) {
            this.events.delete(event);
        } else {
            this.events.clear();
        }
    }

    listenerCount(event: string): number {
        return this.events.get(event)?.length || 0;
    }

    eventNames(): string[] {
        return Array.from(this.events.keys());
    }
}
