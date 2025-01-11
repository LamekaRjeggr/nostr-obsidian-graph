import { TFile } from 'obsidian';
import { NostrEvent } from '../../types';

/**
 * Interface for managing files and metadata in Obsidian
 */
export interface IFileManager {
    /**
     * Create or update a note file
     * @param content File content
     * @param path File path relative to vault root
     * @returns Promise resolving to created/updated file
     */
    createNote(content: string, path: string): Promise<TFile>;

    /**
     * Update file metadata
     * @param file Obsidian TFile
     * @param metadata Metadata to update/add
     */
    updateMetadata(file: TFile, metadata: Record<string, any>): Promise<void>;

    /**
     * Get nostr metadata from a file
     * @param path File path relative to vault root
     * @returns Metadata object or null if not found
     */
    getNostrMetadata(path: string): Promise<{
        id?: string;
        pubkey?: string;
        kind?: number;
        [key: string]: any;
    } | null>;

    /**
     * Check if file exists
     * @param path File path relative to vault root
     */
    exists(path: string): boolean;

    /**
     * Get file by path
     * @param path File path relative to vault root
     * @returns TFile or null if not found
     */
    getFile(path: string): TFile | null;

    /**
     * List files in directory
     * @param directory Directory path relative to vault root
     * @returns Array of file paths
     */
    listFiles(directory: string): Promise<string[]>;

    /**
     * Ensure directories exist
     * @param directories Array of directory paths to create
     */
    ensureDirectories(directories: string[]): Promise<void>;

    /**
     * Save a nostr event as a file
     * @param event Nostr event to save
     * @param metadata Additional metadata to include
     */
    saveNostrEvent(event: NostrEvent, metadata?: Record<string, any>): Promise<TFile>;

    /**
     * Get file title from cache
     * @param id Event ID or pubkey
     * @returns Cached title or null
     */
    getCachedTitle(id: string): string | null;

    /**
     * Cache a file title
     * @param id Event ID or pubkey
     * @param title Title to cache
     */
    cacheTitle(id: string, title: string): void;

    /**
     * Clear title cache
     */
    clearCache(): void;
}
