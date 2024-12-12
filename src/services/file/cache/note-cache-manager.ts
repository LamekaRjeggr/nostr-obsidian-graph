import { HexString } from '../../../types';

export class NoteCacheManager {
    private titleCache: Map<string, string> = new Map();
    private linkCache: Map<string, Set<string>> = new Map();

    cacheTitle(id: HexString, title: string): void {
        this.titleCache.set(id, title);
    }

    getCachedTitle(id: HexString): string | undefined {
        return this.titleCache.get(id);
    }

    addLink(fromId: HexString, toId: HexString): void {
        if (!this.linkCache.has(fromId)) {
            this.linkCache.set(fromId, new Set());
        }
        this.linkCache.get(fromId)!.add(toId);
    }

    getBacklinks(noteId: HexString): string[] {
        const backlinks: string[] = [];
        this.linkCache.forEach((links, fromId) => {
            if (links.has(noteId)) {
                backlinks.push(fromId);
            }
        });
        return backlinks;
    }

    clear(): void {
        this.titleCache.clear();
        this.linkCache.clear();
    }
}
