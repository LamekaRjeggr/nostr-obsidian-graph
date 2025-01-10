/**
 * Types and interfaces for Nostr polls (NIP-1068)
 */

/**
 * Represents a poll option from the tags
 */
export interface PollOption {
    /** Unique identifier for the option */
    id: string;
    /** Display text for the option */
    text: string;
    /** Number of votes for this option */
    votes: number;
}

/**
 * Poll type from polltype tag
 */
export type PollType = 'singlechoice' | 'multichoice';

/**
 * Nostr tag types for polls
 */
export type NostrPollTag = 
    | ['option', string, string]    // [option, id, text]
    | ['relay', string]             // [relay, url]
    | ['polltype', PollType];       // [polltype, type]

/**
 * Raw Nostr poll event structure
 */
export interface NostrPollEvent {
    content: string;           // Poll question
    created_at: number;
    id: string;
    kind: 1068;               // Poll event kind
    pubkey: string;
    sig: string;
    tags: NostrPollTag[];
}

/**
 * Nostr tag types for votes
 */
export type NostrVoteTag =
    | ['e', string]           // [e, poll_id]
    | ['option', string];     // [option, option_id]

/**
 * Raw Nostr vote event structure
 */
export interface NostrVoteEvent {
    content: '';              // Empty for votes
    created_at: number;
    id: string;
    kind: 1068;              // Same kind as polls
    pubkey: string;
    sig: string;
    tags: NostrVoteTag[];
}

/**
 * Core poll data structure
 */
export interface PollData {
    /** Poll event ID */
    id: string;
    /** Poll author's public key */
    pubkey: string;
    /** Poll question */
    question: string;
    /** Available options */
    options: PollOption[];
    /** Poll type (single/multiple choice) */
    pollType: PollType;
    /** Creation timestamp */
    createdAt: number;
    /** Associated relays */
    relays: string[];
    /** Total number of votes */
    totalVotes: number;
}

/**
 * Poll metadata for Obsidian frontmatter
 */
export interface PollMetadata {
    id: string;
    pubkey: string;
    author: string;
    created_at: number;
    created_at_string: string;
    kind: 1068;
    question: string;
    options: PollOption[];
    poll_type: PollType;
    relays: string[];
    total_votes: number;
    nostr_tags: NostrPollTag[];
}

/**
 * Error types specific to poll operations
 */
export enum PollError {
    INVALID_POLL = 'INVALID_POLL',
    INVALID_VOTE = 'INVALID_VOTE',
    INVALID_OPTION = 'INVALID_OPTION',
    INVALID_POLL_TYPE = 'INVALID_POLL_TYPE',
    MULTIPLE_CHOICE_VIOLATION = 'MULTIPLE_CHOICE_VIOLATION',
    POLL_PROCESSING_ERROR = 'POLL_PROCESSING_ERROR',
    VOTE_PROCESSING_ERROR = 'VOTE_PROCESSING_ERROR',
    POLL_NOT_FOUND = 'POLL_NOT_FOUND'
}

/**
 * Result of a poll operation
 */
export interface PollResult {
    success: boolean;
    error?: {
        type: PollError;
        message: string;
        details?: any;
    };
    data?: PollData;
}

/**
 * Poll validation result
 */
export interface PollValidationResult {
    valid: boolean;
    error?: {
        type: PollError;
        message: string;
    };
}
