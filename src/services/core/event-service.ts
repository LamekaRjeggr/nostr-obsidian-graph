import { NostrEvent, ChronologicalMetadata } from '../../types';
import { Notice } from 'obsidian';

export class EventService {
    private noteHandlers: ((event: NostrEvent, metadata?: ChronologicalMetadata) => void)[] = [];
    private profileHandlers: ((event: NostrEvent) => void)[] = [];
    private stateHandlers: ((isActive: boolean) => void)[] = [];
    private limitHandlers: ((count: number, limit: number) => void)[] = [];

    onNote(handler: (event: NostrEvent, metadata?: ChronologicalMetadata) => void): void {
        this.noteHandlers.push(handler);
    }

    onProfile(handler: (event: NostrEvent) => void): void {
        this.profileHandlers.push(handler);
    }

    onStateChange(handler: (isActive: boolean) => void): void {
        this.stateHandlers.push(handler);
    }

    onLimitReached(handler: (count: number, limit: number) => void): void {
        this.limitHandlers.push(handler);
    }

    emitNote(event: NostrEvent, metadata?: ChronologicalMetadata): void {
        try {
            this.noteHandlers.forEach(handler => handler(event, metadata));
        } catch (error) {
            console.error('Error emitting note:', error);
            new Notice('Error processing note');
        }
    }

    emitProfile(event: NostrEvent): void {
        try {
            this.profileHandlers.forEach(handler => handler(event));
        } catch (error) {
            console.error('Error emitting profile:', error);
            // Silent fail for profile errors
        }
    }

    emitStateChange(isActive: boolean): void {
        try {
            this.stateHandlers.forEach(handler => handler(isActive));
        } catch (error) {
            console.error('Error emitting state change:', error);
        }
    }

    emitLimitReached(count: number, limit: number): void {
        try {
            this.limitHandlers.forEach(handler => handler(count, limit));
        } catch (error) {
            console.error('Error emitting limit reached:', error);
        }
    }

    clearHandlers(): void {
        this.noteHandlers = [];
        this.profileHandlers = [];
        this.stateHandlers = [];
        this.limitHandlers = [];
    }
}