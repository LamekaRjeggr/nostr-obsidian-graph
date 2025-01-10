import { Event } from 'nostr-tools';
import { TagType } from '../../types';

export interface TagResult {
    // Core tag data
    mentions: string[];      // NIP-01 p tags
    references: string[];    // NIP-01 e tags
    topics: string[];       // NIP-12 t tags
    
    // Thread context
    root?: string;         // Root note in thread
    replyTo?: string;     // Direct reply reference
    
    // Additional context
    relayHints: Map<string, string>;  // tag id -> relay hint
}

export interface TagProcessorOptions {
    includeRelayHints?: boolean;
}

/**
 * Processes nostr event tags independently of other services.
 * Focused solely on extracting and organizing tag information.
 */
export class TagProcessor {
    process(event: Event, options: TagProcessorOptions = {}): TagResult {
        const result: TagResult = {
            mentions: [],
            references: [],
            topics: [],
            relayHints: options.includeRelayHints ? new Map() : new Map()
        };
        
        event.tags.forEach(tag => {
            const [type, ...params] = tag;
            
            switch (type) {
                case 'e': {
                    const [targetId, relayHint, marker] = params;
                    if (targetId) {
                        // Handle thread references
                        if (marker === 'root') {
                            result.root = targetId;
                        } else if (marker === 'reply') {
                            result.replyTo = targetId;
                        } else {
                            result.references.push(targetId);
                        }
                        
                        // Store relay hint if enabled and provided
                        if (options.includeRelayHints && relayHint) {
                            result.relayHints.set(targetId, relayHint);
                        }
                    }
                    break;
                }
                case 'p': {
                    const [targetId, relayHint] = params;
                    if (targetId) {
                        result.mentions.push(targetId);
                        if (options.includeRelayHints && relayHint) {
                            result.relayHints.set(targetId, relayHint);
                        }
                    }
                    break;
                }
                case 't': {
                    const [topic] = params;
                    if (topic) {
                        result.topics.push(topic.toLowerCase());
                    }
                    break;
                }
            }
        });

        return result;
    }

    /**
     * Helper method to check if an event is a reply
     */
    isReply(event: Event): boolean {
        return event.tags.some(tag => 
            tag[0] === 'e' && (tag[2] === 'reply' || !tag[2])
        );
    }

    /**
     * Helper method to check if an event is a root note
     */
    isRoot(event: Event): boolean {
        return !this.isReply(event);
    }
}
