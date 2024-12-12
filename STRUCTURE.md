# Project Structure

## File System Structure
```
nostr-obsidian-graph/
├── src/
│   ├── main.ts                 # Plugin entry point
│   ├── types.ts               # Type definitions
│   ├── core/
│   │   ├── interfaces/        # Core interfaces
│   │   │   ├── IEventValidator.ts
│   │   │   ├── IReferenceManager.ts
│   │   │   └── ITemporalManager.ts
│   │   └── handlers/         # Event handlers
│   │       ├── validators/
│   │       │   └── NoteEventValidator.ts
│   │       ├── references/
│   │       │   └── NoteReferenceManager.ts
│   │       ├── temporal/
│   │       │   └── NoteTemporalManager.ts
│   │       └── note-handler.ts
│   ├── services/
│   │   ├── core/              # Core services
│   │   │   ├── relay-service.ts       # Relay connections
│   │   │   ├── event-service.ts       # Event handling
│   │   │   ├── file-service.ts        # File operations
│   │   │   ├── key-service.ts         # Key management
│   │   │   └── current-file-service.ts # Current file context
│   │   ├── temporal/          # Temporal services
│   │   │   ├── temporal-chain-service.ts  # Modern chain implementation
│   │   │   └── temporal-event-store.ts    # Event storage
│   │   ├── references/        # Reference handling
│   │   │   └── note-reference-manager.ts  # Note references
│   │   ├── fetch/             # Fetch operations
│   │   │   ├── fetch-service.ts       # Main fetch coordination
│   │   │   ├── fetch-processor.ts     # Event processing
│   │   │   ├── mentioned-note-fetcher.ts  # Note mentions
│   │   │   └── mentioned-profile-fetcher.ts # Profile mentions
│   │   ├── reactions/         # Reaction handling
│   │   │   └── reaction-processor.ts   # Likes and zaps
│   │   ├── file/             # File utilities
│   │   │   ├── formatters/
│   │   │   │   ├── note-formatter.ts
│   │   │   │   └── profile-formatter.ts
│   │   │   └── utils/
│   │   │       └── frontmatter-util.ts
│   │   ├── event-emitter.ts   # Event system
│   │   └── chronological-chain.ts  # Legacy chain (deprecated)
│   └── views/                # UI components
│       ├── settings-tab.ts    # Settings interface
│       └── hex-input-modal.ts # Hex key input
├── manifest.json            # Plugin manifest
└── package.json            # Project configuration
```

## Service Architecture

### Core Layer
- **Interfaces**: Define contracts for validators, managers, and handlers
- **Handlers**: Process different types of events with specialized components
- **Services**: Core functionality like relay connections and file operations

### Temporal Layer
- **TemporalChainService**: Modern implementation for chronological event handling
- **TemporalEventStore**: Event storage and retrieval
- **NoteTemporalManager**: Temporal ordering of notes

### Reference Layer
- **NoteReferenceManager**: Handle note references and relationships
- **ReferenceStore**: Store and manage reference relationships

### Event System
- **EventEmitter**: Core event system with improved error handling
- **EventService**: Central event coordination

### Legacy Support
- **ChronologicalChain**: Backwards compatibility wrapper (deprecated)

## Generated Vault Structure
nostr/
├── notes/                  # Original posts
├── profiles/              # Profile information
│   └── mentions/          # Mentioned profiles
└── replies/               # Reply posts
