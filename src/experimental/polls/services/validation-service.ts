import { NostrEvent } from '../../../types';

export class PollValidationService {
    validatePollEvent(event: NostrEvent): boolean {
        try {
            console.log('[ValidationService] Validating poll event:', {
                id: event.id,
                pubkey: event.pubkey,
                kind: event.kind,
                tags: event.tags
            });

            // Check basic event structure
            if (!event.id || !event.pubkey || !event.content || !event.tags) {
                console.error('[ValidationService] Missing required poll event fields:', {
                    hasId: !!event.id,
                    hasPubkey: !!event.pubkey,
                    hasContent: !!event.content,
                    hasTags: !!event.tags
                });
                return false;
            }

            // Check kind (1068 for polls)
            if (event.kind !== 1068) {
                console.error('[ValidationService] Invalid event kind for poll:', {
                    expectedKind: 1068,
                    actualKind: event.kind
                });
                return false;
            }

            // Check for question in content
            if (!event.content.trim()) {
                console.error('[ValidationService] Poll must have a question');
                return false;
            }

            // Check for options
            const options = event.tags.filter(tag => tag[0] === 'option');
            console.log('[ValidationService] Found options:', options);
            
            if (options.length < 2) {
                console.error('[ValidationService] Poll must have at least 2 options:', {
                    foundOptions: options.length
                });
                return false;
            }

            // Validate option format
            for (const option of options) {
                if (option.length < 3 || !option[1] || !option[2]) {
                    console.error('[ValidationService] Invalid option format:', {
                        option,
                        length: option.length,
                        hasId: !!option[1],
                        hasText: !!option[2]
                    });
                    return false;
                }
            }

            // Check for poll type
            const pollType = event.tags.find(tag => tag[0] === 'polltype');
            console.log('[ValidationService] Found poll type:', pollType);
            
            if (!pollType || !['singlechoice', 'multiplechoice'].includes(pollType[1])) {
                console.error('[ValidationService] Invalid or missing poll type:', {
                    foundType: pollType?.[1],
                    validTypes: ['singlechoice', 'multiplechoice']
                });
                return false;
            }

            console.log('[ValidationService] Poll event validation passed');
            return true;
        } catch (error) {
            console.error('[ValidationService] Error validating poll event:', error);
            return false;
        }
    }

    validateVoteEvent(event: NostrEvent): boolean {
        try {
            console.log('[ValidationService] Validating vote event:', {
                id: event.id,
                pubkey: event.pubkey,
                kind: event.kind,
                tags: event.tags,
                content: event.content
            });

            // Check basic event structure
            if (!event.id || !event.pubkey || !event.tags) {
                console.error('[ValidationService] Missing required vote event fields');
                return false;
            }

            // Check kind (1018 for poll votes)
            if (event.kind !== 1018) {
                console.error('[ValidationService] Invalid event kind for vote');
                return false;
            }

            // Check for poll reference
            const pollRef = event.tags.find(tag => tag[0] === 'e');
            if (!pollRef || !pollRef[1]) {
                console.error('[ValidationService] Vote must reference a poll');
                return false;
            }

            // Check for response tags
            const responseTags = event.tags.filter(tag => tag[0] === 'response');
            if (responseTags.length === 0) {
                console.error('[ValidationService] Vote must have at least one response tag');
                return false;
            }

            // Validate response tags
            for (const tag of responseTags) {
                if (!tag[1]) {
                    console.error('[ValidationService] Response tag must include option ID');
                    return false;
                }
            }

            // Check if content is empty or matches first response
            if (event.content && !responseTags.some(tag => tag[1] === event.content)) {
                console.error('[ValidationService] Content must be empty or match a response ID');
                return false;
            }

            console.log('[ValidationService] Vote event validation passed');
            return true;
        } catch (error) {
            console.error('[ValidationService] Error validating vote event:', error);
            return false;
        }
    }

    validatePollClose(event: NostrEvent): boolean {
        try {
            console.log('[ValidationService] Validating poll close event:', {
                id: event.id,
                pubkey: event.pubkey,
                kind: event.kind,
                tags: event.tags
            });

            // Check basic event structure
            if (!event.id || !event.pubkey || !event.tags) {
                console.error('[ValidationService] Missing required close event fields:', {
                    hasId: !!event.id,
                    hasPubkey: !!event.pubkey,
                    hasTags: !!event.tags
                });
                return false;
            }

            // Check kind (1068 for poll events)
            if (event.kind !== 1068) {
                console.error('[ValidationService] Invalid event kind for poll close:', {
                    expectedKind: 1068,
                    actualKind: event.kind
                });
                return false;
            }

            // Check for poll reference
            const pollRef = event.tags.find(tag => tag[0] === 'e');
            console.log('[ValidationService] Found poll reference:', pollRef);
            
            if (!pollRef || !pollRef[1]) {
                console.error('[ValidationService] Close event must reference a poll:', {
                    hasRef: !!pollRef,
                    hasId: pollRef ? !!pollRef[1] : false
                });
                return false;
            }

            // Check for close tag
            const closeTag = event.tags.find(tag => tag[0] === 'poll-status' && tag[1] === 'closed');
            console.log('[ValidationService] Found close tag:', closeTag);
            
            if (!closeTag) {
                console.error('[ValidationService] Close event must have poll-status tag');
                return false;
            }

            console.log('[ValidationService] Poll close event validation passed');
            return true;
        } catch (error) {
            console.error('[ValidationService] Error validating poll close event:', error);
            return false;
        }
    }
}
