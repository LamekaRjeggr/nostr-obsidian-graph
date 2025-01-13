import { HexString } from '../../types';

export interface INoteCacheManager {
    cacheTitle(id: HexString, title: string): void;
    getCachedTitle(id: HexString): string | undefined;
    addLink(fromId: HexString, toId: HexString): void;
    getBacklinks(noteId: HexString): string[];
    clear(): void;
}
