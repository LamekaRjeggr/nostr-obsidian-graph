import { NostrEvent } from '../../types';
import { TFile } from 'obsidian';

/**
 * Interface for managing nostr profiles
 */
export interface IProfileManager {
    /**
     * Save or update a profile
     * @param event Profile metadata event
     * @param isUser Whether this is the user's own profile
     */
    saveProfile(event: NostrEvent, isUser?: boolean): Promise<TFile>;

    /**
     * Get profile by pubkey
     * @param pubkey Profile public key
     * @returns Profile file or null if not found
     */
    getProfile(pubkey: string): Promise<TFile | null>;

    /**
     * Check if pubkey is the user's profile
     * @param pubkey Profile public key to check
     */
    isUserProfile(pubkey: string): boolean;

    /**
     * Get user's profile
     * @returns User's profile file or null
     */
    getUserProfile(): Promise<TFile | null>;

    /**
     * Get profile display name
     * @param pubkey Profile public key
     * @returns Display name or null if not found
     */
    getDisplayName(pubkey: string): Promise<string | null>;

    /**
     * Get profile metadata
     * @param pubkey Profile public key
     * @returns Profile metadata or null if not found
     */
    getProfileMetadata(pubkey: string): Promise<{
        name?: string;
        displayName?: string;
        about?: string;
        picture?: string;
        nip05?: string;
    } | null>;

    /**
     * Get profile path
     * @param pubkey Profile public key
     * @param isUser Whether this is the user's profile
     * @returns Path where profile should be stored
     */
    getProfilePath(pubkey: string, isUser?: boolean): string;

    /**
     * List all profiles
     * @param includeUser Whether to include user profile
     * @returns Array of profile files
     */
    listProfiles(includeUser?: boolean): Promise<TFile[]>;

    /**
     * Move profile to mentions directory
     * Used when a profile is only referenced but not directly followed
     * @param pubkey Profile to move
     */
    moveToMentions(pubkey: string): Promise<void>;

    /**
     * Clear profile cache
     */
    clearCache(): void;
}

/**
 * Configuration for profile manager
 */
export interface ProfileManagerConfig {
    /**
     * Directory for storing profiles
     * Default: 'nostr/profiles'
     */
    profilesDirectory?: string;

    /**
     * Directory for user profile
     * Default: 'nostr/User Profile'
     */
    userProfileDirectory?: string;

    /**
     * Directory for mentioned profiles
     * Default: 'nostr/profiles/mentions'
     */
    mentionsDirectory?: string;

    /**
     * Whether to cache profile metadata
     * Default: true
     */
    cacheMetadata?: boolean;
}
