import { BasicWebSocket, HexString, HexFieldValidation, EventValidation } from '../types';

interface ValidationResult {
    isValid: boolean;
    error?: string;
}

export class NostrUtils {
    static validateNpub(npub: string): ValidationResult {
        if (!npub) {
            return { isValid: false, error: 'npub is required' };
        }

        if (!npub.startsWith('npub1')) {
            return { isValid: false, error: 'npub must start with "npub1"' };
        }

        // Basic format check (npub1 followed by 58-60 characters)
        const npubRegex = /^npub1[023456789acdefghjklmnpqrstuvwxyz]{58,60}$/;
        if (!npubRegex.test(npub)) {
            return { 
                isValid: false, 
                error: 'Invalid npub format. Must be npub1 followed by 58-60 Bech32 characters.' 
            };
        }

        return { isValid: true };
    }

    static validateHexField(value: string, fieldName: string, expectedLength?: number): HexFieldValidation {
        try {
            console.log(`Validating hex field ${fieldName}:`, {
                value,
                length: value.length,
                expectedLength: expectedLength ? expectedLength * 2 : 'not specified'
            });

            // Remove '0x' prefix if present
            const hex = value.replace('0x', '');

            // Check for valid hex characters
            if (!/^[0-9a-f]*$/i.test(hex)) {
                console.error(`Invalid hex characters in ${fieldName}:`, hex);
                return {
                    value: hex,
                    isValid: false,
                    error: `${fieldName} contains invalid hex characters`,
                    length: hex.length,
                    expectedLength: expectedLength ? expectedLength * 2 : undefined
                };
            }

            // Check length if specified
            if (expectedLength && hex.length !== expectedLength * 2) {
                console.error(`Invalid hex length for ${fieldName}:`, {
                    actual: hex.length,
                    expected: expectedLength * 2
                });
                return {
                    value: hex,
                    isValid: false,
                    error: `${fieldName} should be ${expectedLength} bytes (${expectedLength * 2} hex characters)`,
                    length: hex.length,
                    expectedLength: expectedLength * 2
                };
            }

            return {
                value: hex.toLowerCase(),
                isValid: true,
                length: hex.length,
                expectedLength: expectedLength ? expectedLength * 2 : undefined
            };
        } catch (error) {
            console.error(`Error validating hex field ${fieldName}:`, error);
            return {
                value: value,
                isValid: false,
                error: `Error validating ${fieldName}: ${error.message}`,
                length: value.length,
                expectedLength: expectedLength ? expectedLength * 2 : undefined
            };
        }
    }

    static validateRelayUrl(url: string): ValidationResult {
        if (!url) {
            return { isValid: false, error: 'URL is required' };
        }

        try {
            const parsedUrl = new URL(url);
            
            // Check protocol
            if (!['ws:', 'wss:'].includes(parsedUrl.protocol)) {
                return { 
                    isValid: false, 
                    error: 'Invalid protocol. Must be ws:// or wss://' 
                };
            }

            // Check for hostname
            if (!parsedUrl.hostname) {
                return { isValid: false, error: 'Invalid hostname' };
            }

            return { isValid: true };
        } catch (error) {
            return { 
                isValid: false, 
                error: 'Invalid URL format' 
            };
        }
    }

    static sanitizeRelayUrl(url: string): string {
        // Remove whitespace
        url = url.trim();

        // Ensure proper protocol
        if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
            // Default to wss:// if no protocol specified
            url = 'wss://' + url;
        }

        // Remove trailing slash
        url = url.replace(/\/+$/, '');

        return url;
    }

    static validateRelayUrls(urls: string[]): ValidationResult {
        if (!urls || urls.length === 0) {
            return { isValid: false, error: 'At least one relay URL is required' };
        }

        for (const url of urls) {
            const sanitizedUrl = this.sanitizeRelayUrl(url);
            const validation = this.validateRelayUrl(sanitizedUrl);
            if (!validation.isValid) {
                return { 
                    isValid: false, 
                    error: `Invalid relay URL (${url}): ${validation.error}` 
                };
            }
        }

        return { isValid: true };
    }

    static formatRelayUrls(urls: string[]): string[] {
        return urls
            .map(url => this.sanitizeRelayUrl(url))
            .filter(url => this.validateRelayUrl(url).isValid);
    }

    static isValidWebSocketUrl(url: string): boolean {
        try {
            const parsedUrl = new URL(url);
            return ['ws:', 'wss:'].includes(parsedUrl.protocol);
        } catch {
            return false;
        }
    }

    static getWebSocketState(ws: BasicWebSocket): string {
        const states = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];
        return states[ws.readyState] || 'UNKNOWN';
    }

    static logWebSocketState(ws: BasicWebSocket): void {
        console.log('WebSocket State:', {
            readyState: ws.readyState,
            stateString: this.getWebSocketState(ws)
        });
    }

    static getWebSocketStateString(ws: BasicWebSocket): string {
        return this.getWebSocketState(ws);
    }

    static validateEvent(event: any): EventValidation {
        try {
            // Create details object with all properties
            const details = {
                hasId: typeof event.id === 'string',
                hasPubkey: typeof event.pubkey === 'string',
                hasCreatedAt: typeof event.created_at === 'number',
                hasKind: typeof event.kind === 'number',
                hasTags: Array.isArray(event.tags),
                hasContent: typeof event.content === 'string',
                hasSig: typeof event.sig === 'string',
                idValid: false,
                pubkeyValid: false,
                sigValid: false
            };

            console.log('Validating event:', details);

            // Basic type checks
            if (!event
                || !details.hasId
                || !details.hasPubkey
                || !details.hasCreatedAt
                || !details.hasKind
                || !details.hasTags
                || !details.hasContent
                || !details.hasSig) {
                console.error('Event failed basic type checks');
                return {
                    isValid: false,
                    error: 'Event failed basic type checks',
                    details
                };
            }

            // Validate hex fields
            const idValidation = this.validateHexField(event.id, 'id', 32);
            const pubkeyValidation = this.validateHexField(event.pubkey, 'pubkey', 32);
            const sigValidation = this.validateHexField(event.sig, 'sig', 64);

            details.idValid = idValidation.isValid;
            details.pubkeyValid = pubkeyValidation.isValid;
            details.sigValid = sigValidation.isValid;

            if (!idValidation.isValid) {
                console.error('Invalid event id:', idValidation.error);
                return {
                    isValid: false,
                    error: `Invalid event id: ${idValidation.error}`,
                    details
                };
            }

            if (!pubkeyValidation.isValid) {
                console.error('Invalid event pubkey:', pubkeyValidation.error);
                return {
                    isValid: false,
                    error: `Invalid event pubkey: ${pubkeyValidation.error}`,
                    details
                };
            }

            if (!sigValidation.isValid) {
                console.error('Invalid event signature:', sigValidation.error);
                return {
                    isValid: false,
                    error: `Invalid event signature: ${sigValidation.error}`,
                    details
                };
            }

            // Validate tags format
            for (const tag of event.tags) {
                if (!Array.isArray(tag) || tag.some(item => typeof item !== 'string')) {
                    console.error('Invalid tag format:', tag);
                    return {
                        isValid: false,
                        error: 'Invalid tag format',
                        details
                    };
                }
            }

            return {
                isValid: true,
                details
            };
        } catch (error) {
            console.error('Error validating event:', error);
            return {
                isValid: false,
                error: `Error validating event: ${error.message}`,
                details: {
                    hasId: false,
                    hasPubkey: false,
                    hasCreatedAt: false,
                    hasKind: false,
                    hasTags: false,
                    hasContent: false,
                    hasSig: false,
                    idValid: false,
                    pubkeyValid: false,
                    sigValid: false
                }
            };
        }
    }
}
