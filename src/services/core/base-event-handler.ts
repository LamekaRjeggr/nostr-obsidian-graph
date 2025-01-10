import { NostrEvent } from '../../types';
import { EventTypeHandler } from './event-stream-handler';
import { EventService } from './event-service';
import { ValidationService } from '../validation-service';

export abstract class BaseEventHandler implements EventTypeHandler {
    protected eventService: EventService;
    protected kind: number;
    protected priority: number;

    constructor(eventService: EventService, kind: number, priority: number) {
        this.eventService = eventService;
        this.kind = kind;
        this.priority = priority;
    }

    abstract process(event: NostrEvent): Promise<void>;

    getKind(): number {
        return this.kind;
    }

    // Allow handlers to process multiple kinds
    getKinds?(): number[] {
        return [this.kind];
    }

    getPriority(): number {
        return this.priority;
    }

    protected validate(event: NostrEvent): boolean {
        // Allow validation for multiple kinds if handler implements getKinds
        const validKinds = this.getKinds?.() || [this.kind];
        return ValidationService.validateEvent(event) && validKinds.includes(event.kind);
    }

    // Optional method that handlers can implement
    onHistoricalComplete?(): void;

    // For backwards compatibility
    protected emitStateChange(isActive: boolean): void {
        this.eventService.emitStateChange(isActive);
    }

    protected emitLimitReached(count: number, limit: number): void {
        this.eventService.emitLimitReached(count, limit);
    }
}

// Event kind constants for better maintainability
export const EventKinds = {
    METADATA: 0,    // Profile metadata
    NOTE: 1,        // Text note
    CONTACT: 3,     // Contact list
    REACTION: 7,    // Reactions
    ZAPS: 9735,     // Zap receipts
} as const;

// Processing priorities
export const ProcessingPriority = {
    CONTACT: 0,     // Process contacts first
    PROFILE: 1,     // Then profiles
    NOTE: 2,        // Then notes
    REACTION: 3,    // Then reactions
    ZAP: 3,         // Reactions and zaps same priority
} as const;
