import { HexString } from '../../../types';
import { Plugin } from 'obsidian';
import { INoteCacheManager } from '../../../core/interfaces/INoteCacheManager';

interface CacheEntry<T> {
    value: T;
    lastAccessed: number;
    created: number;
    hits: number;
}

interface CacheStats {
    hits: number;
    misses: number;
    evictions: number;
    size: number;
    maxSize: number;
}

export class EnhancedNoteCacheManager implements INoteCacheManager {
    private titleCache: Map<string, CacheEntry<string>> = new Map();
    private linkCache: Map<string, CacheEntry<Set<string>>> = new Map();
    private stats: CacheStats = {
        hits: 0,
        misses: 0,
        evictions: 0,
        size: 0,
        maxSize: 10000 // Default max entries
    };

    constructor(
        private plugin: Plugin,
        private maxSize: number = 10000,
        private maxAge: number = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
    ) {
        this.stats.maxSize = maxSize;
        this.loadCache();
        
        // Set up periodic cache cleanup
        setInterval(() => this.cleanup(), 60 * 60 * 1000); // Run every hour
    }

    private async loadCache(): Promise<void> {
        try {
            const adapter = this.plugin.app.vault.adapter;
            const cachePath = `${this.plugin.manifest.dir}/cache.json`;
            
            if (await adapter.exists(cachePath)) {
                const data = JSON.parse(await adapter.read(cachePath));
                if (data?.titleCache) {
                    this.titleCache = new Map(
                        Object.entries(data.titleCache).map(([key, entry]: [string, any]) => {
                            return [key, {
                                value: entry.value,
                                lastAccessed: entry.lastAccessed,
                                created: entry.created,
                                hits: entry.hits
                            }];
                        })
                    );
                }
                if (data?.linkCache) {
                    this.linkCache = new Map(
                        Object.entries(data.linkCache).map(([key, entry]: [string, any]) => {
                            return [key, {
                                value: new Set(entry.value),
                                lastAccessed: entry.lastAccessed,
                                created: entry.created,
                                hits: entry.hits
                            }];
                        })
                    );
                }
            }
        } catch (error) {
            console.error('Failed to load cache:', error);
        }
    }

    private async saveCache(): Promise<void> {
        try {
            const adapter = this.plugin.app.vault.adapter;
            const cachePath = `${this.plugin.manifest.dir}/cache.json`;
            
            const titleCacheData = Object.fromEntries(
                Array.from(this.titleCache.entries()).map(([key, entry]) => {
                    return [key, {
                        value: entry.value,
                        lastAccessed: entry.lastAccessed,
                        created: entry.created,
                        hits: entry.hits
                    }];
                })
            );
            
            const linkCacheData = Object.fromEntries(
                Array.from(this.linkCache.entries()).map(([key, entry]) => {
                    return [key, {
                        value: Array.from(entry.value),
                        lastAccessed: entry.lastAccessed,
                        created: entry.created,
                        hits: entry.hits
                    }];
                })
            );

            await adapter.write(cachePath, JSON.stringify({
                titleCache: titleCacheData,
                linkCache: linkCacheData
            }, null, 2));
        } catch (error) {
            console.error('Failed to save cache:', error);
        }
    }

    private cleanup(): void {
        const now = Date.now();
        let evicted = 0;

        // Cleanup by age
        for (const [id, entry] of this.titleCache) {
            if (now - entry.created > this.maxAge) {
                this.titleCache.delete(id);
                evicted++;
            }
        }
        for (const [id, entry] of this.linkCache) {
            if (now - entry.created > this.maxAge) {
                this.linkCache.delete(id);
                evicted++;
            }
        }

        // Cleanup by LRU if still over maxSize
        if (this.titleCache.size + this.linkCache.size > this.maxSize) {
            const allEntries = [
                ...Array.from(this.titleCache.entries()).map(([id, entry]) => ({ type: 'title', id, entry })),
                ...Array.from(this.linkCache.entries()).map(([id, entry]) => ({ type: 'link', id, entry }))
            ];

            // Sort by last accessed (oldest first)
            allEntries.sort((a, b) => a.entry.lastAccessed - b.entry.lastAccessed);

            // Remove oldest entries until under maxSize
            while (this.titleCache.size + this.linkCache.size > this.maxSize && allEntries.length > 0) {
                const oldest = allEntries.shift();
                if (oldest) {
                    if (oldest.type === 'title') {
                        this.titleCache.delete(oldest.id);
                    } else {
                        this.linkCache.delete(oldest.id);
                    }
                    evicted++;
                }
            }
        }

        this.stats.evictions += evicted;
        if (evicted > 0) {
            this.saveCache();
        }
    }

    cacheTitle(id: HexString, title: string): void {
        this.titleCache.set(id, {
            value: title,
            lastAccessed: Date.now(),
            created: Date.now(),
            hits: 0
        });
        this.stats.size = this.titleCache.size + this.linkCache.size;
        this.cleanup();
    }

    getCachedTitle(id: HexString): string | undefined {
        const entry = this.titleCache.get(id);
        if (entry) {
            entry.lastAccessed = Date.now();
            entry.hits++;
            this.stats.hits++;
            return entry.value;
        }
        this.stats.misses++;
        return undefined;
    }

    addLink(fromId: HexString, toId: HexString): void {
        const entry = this.linkCache.get(fromId);
        if (entry) {
            entry.value.add(toId);
            entry.lastAccessed = Date.now();
            entry.hits++;
        } else {
            this.linkCache.set(fromId, {
                value: new Set([toId]),
                lastAccessed: Date.now(),
                created: Date.now(),
                hits: 0
            });
        }
        this.stats.size = this.titleCache.size + this.linkCache.size;
        this.cleanup();
    }

    getBacklinks(noteId: HexString): string[] {
        const backlinks: string[] = [];
        this.linkCache.forEach((entry, fromId) => {
            if (entry.value.has(noteId)) {
                entry.lastAccessed = Date.now();
                entry.hits++;
                this.stats.hits++;
                backlinks.push(fromId);
            }
        });
        return backlinks;
    }

    clear(): void {
        this.titleCache.clear();
        this.linkCache.clear();
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0,
            size: 0,
            maxSize: this.maxSize
        };
        this.saveCache();
    }

    getStats(): CacheStats {
        return { ...this.stats };
    }

    setMaxSize(size: number): void {
        this.maxSize = size;
        this.stats.maxSize = size;
        this.cleanup();
    }

    setMaxAge(ageMs: number): void {
        this.maxAge = ageMs;
        this.cleanup();
    }
}
