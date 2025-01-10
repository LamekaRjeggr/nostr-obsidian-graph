import { Vault } from 'obsidian';
import { NostrProfile, NoteFile, FileServiceConfig } from '../types';
import { NostrService } from '../core/nostr-service';
import { ReactionService } from './reaction-service';
import { EventEmitter } from './event-emitter';
import { PathManagerService } from './file/path-manager-service';
import { FileOperationService } from './file/file-operation-service';
import { ContentFormatterService } from './file/content-formatter-service';
import { FileManager } from './file/file-manager';

/**
 * Main file service that coordinates file operations using FileManager
 */
export class FileService {
    private fileManager: FileManager;
    private eventEmitter: EventEmitter;
    private isDisconnecting: boolean = false;
    private pendingOperations: Set<Promise<any>> = new Set();

    constructor(
        vault: Vault,
        nostrService: NostrService,
        reactionService: ReactionService,
        profilesDir: string = 'nostr/profiles',
        notesDir: string = 'nostr/notes'
    ) {
        // Use the same event emitter instance from NostrService
        this.eventEmitter = nostrService['eventEmitter'];

        // Create configuration
        const config: FileServiceConfig = {
            basePath: 'nostr',  // Base directory for all files
            profilesDir,
            notesDir,
            createDirs: true,
            validatePaths: true,
            validateContent: true
        };

        // Initialize services
        const pathManager = new PathManagerService(
            config.basePath,
            config.profilesDir,
            config.notesDir,
            this.eventEmitter
        );

        const fileOperations = new FileOperationService(
            vault,
            pathManager,
            this.eventEmitter
        );

        const contentFormatter = new ContentFormatterService(
            pathManager,
            fileOperations,
            this.eventEmitter
        );

        // Initialize FileManager with all services
        this.fileManager = new FileManager(
            config,
            this.eventEmitter,
            pathManager,
            fileOperations,
            contentFormatter
        );

        this.setupEventHandlers();
    }

    private setupEventHandlers(): void {
        // Listen for validation events
        this.eventEmitter.on('validation-complete', (event) => {
            if (!this.isDisconnecting && !event.result.isValid) {
                console.error(`Validation failed for ${event.type}:`, event.result.error);
            }
        });

        // Listen for profile events
        this.eventEmitter.on('profile-processed', async (profileData) => {
            if (this.isDisconnecting) return;
            try {
                console.log('Creating profile file:', profileData.profile.name || profileData.profile.pubkey);
                await this.createOrUpdateProfileFile(profileData.profile);
            } catch (error) {
                console.error('Error creating profile file:', error);
            }
        });

        // Listen for note events
        this.eventEmitter.on('note-processed', async (noteData) => {
            if (this.isDisconnecting) return;
            try {
                console.log('Creating note file:', noteData.id);
                await this.createOrUpdateNoteFile(noteData);
            } catch (error) {
                console.error('Error creating note file:', error);
            }
        });

        // Listen for disconnect events
        this.eventEmitter.on('relay-disconnected', () => {
            this.disconnect();
        });
    }

    /**
     * Initialize file structure
     */
    async initialize(): Promise<void> {
        this.isDisconnecting = false;
        await this.fileManager.initialize();
    }

    /**
     * Disconnect and cleanup
     */
    async disconnect(): Promise<void> {
        console.log('Disconnecting FileService...');
        this.isDisconnecting = true;

        // Wait for pending operations to complete
        if (this.pendingOperations.size > 0) {
            console.log(`Waiting for ${this.pendingOperations.size} pending operations to complete...`);
            try {
                await Promise.all(Array.from(this.pendingOperations));
            } catch (error) {
                console.error('Error waiting for pending operations:', error);
            }
        }

        // Clear event listeners
        this.eventEmitter.removeAllListeners('validation-complete');
        this.eventEmitter.removeAllListeners('profile-processed');
        this.eventEmitter.removeAllListeners('note-processed');
        this.eventEmitter.removeAllListeners('relay-disconnected');

        // Clear pending operations
        this.pendingOperations.clear();

        console.log('FileService disconnected');
    }

    /**
     * Track an operation
     */
    private trackOperation<T>(operation: Promise<T>): Promise<T> {
        if (this.isDisconnecting) {
            return Promise.reject(new Error('FileService is disconnecting'));
        }

        this.pendingOperations.add(operation);
        
        return operation.finally(() => {
            this.pendingOperations.delete(operation);
        });
    }

    /**
     * Create or update a note file
     */
    async createOrUpdateNoteFile(note: NoteFile): Promise<string> {
        return this.trackOperation(
            this.fileManager.createOrUpdateNoteFile(note, {
                validate: true,
                backup: true
            })
        );
    }

    /**
     * Create or update a profile file
     */
    async createOrUpdateProfileFile(profile: NostrProfile): Promise<string> {
        return this.trackOperation(
            this.fileManager.createOrUpdateProfileFile(profile, {
                validate: true,
                backup: true
            })
        );
    }

    /**
     * Read and parse a profile file
     */
    async readProfileFile(path: string): Promise<NostrProfile> {
        return this.trackOperation(
            this.fileManager.readProfileFile(path)
        );
    }

    /**
     * Check if a file exists
     */
    async exists(path: string): Promise<boolean> {
        return this.trackOperation(
            this.fileManager.exists(path)
        );
    }
}
