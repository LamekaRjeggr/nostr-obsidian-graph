# Project Structure

## Directory Layout

```
src/
├── core/
│   └── interfaces/        # Core interfaces
│       ├── IEventHandler.ts
│       ├── IEventFetcher.ts
│       ├── IEventValidator.ts
│       ├── IFileManager.ts
│       ├── IProfileManager.ts
│       ├── IReference.ts
│       ├── IReaction.ts
│       └── IStreamProcessor.ts
├── experimental/
│   ├── event-bus/        # Event bus system
│   │   ├── event-bus.ts
│   │   └── types.ts
│   └── polls/           # Poll support (NIP-1068)
├── services/
│   ├── core/           # Core services
│   │   ├── current-file-service.ts
│   │   ├── event-service.ts
│   │   ├── file-service.ts
│   │   └── relay-service.ts
│   ├── fetch/
│   │   ├── handlers/   # Specialized fetch handlers
│   │   │   ├── contact-handler.ts
│   │   │   ├── hex-fetch-handler.ts
│   │   │   ├── keyword-search-handler.ts
│   │   │   ├── node-fetch-handler.ts
│   │   │   ├── note-handler.ts
│   │   │   ├── profile-handler.ts
│   │   │   └── thread-fetch-handler.ts
│   │   ├── processors/
│   │   │   └── batch-processor.ts
│   │   ├── fetch-processor.ts
│   │   ├── fetch-service.ts
│   │   ├── mentioned-note-fetcher.ts
│   │   └── unified-fetch-processor.ts
│   ├── file/
│   │   ├── cache/
│   │   │   └── note-cache-manager.ts
│   │   ├── formatters/        # Content formatting
│   │   │   ├── note-formatter.ts     # Note content with ISO timestamps
│   │   │   └── profile-formatter.ts  # Profile content formatting
│   │   ├── system/
│   │   │   └── directory-manager.ts
│   │   └── utils/
│   │       ├── path-utils.ts
│   │       └── text-processor.ts
│   ├── temporal/
│   │   └── temporal-utils.ts    # Consistent ISO timestamp formatting for notes and polls
│   ├── processors/
│   │   ├── reaction-processor.ts
│   │   ├── reference-processor.ts
│   │   └── tag-processor.ts
│   └── reactions/
│       ├── reaction-processor.ts
│       └── reaction-store.ts
└── views/
    ├── modals/         # Modal components
    │   ├── sections/   # Modal section components
    │   │   ├── regular-fetch-section.ts
    │   │   ├── thread-fetch-section.ts
    │   │   ├── hex-fetch-section.ts
    │   │   └── keyword-search-section.ts
    │   ├── fetch-settings-modal.ts
    │   └── types.ts
    ├── settings-tab.ts
    └── support-section.ts
```

## Service Architecture

### Note and Profile Relationships
- **Tag-based System**: Relationships between notes are based on nostr tags
  - Root references: 'e' tags with 'root' marker
  - Reply references: 'e' tags with 'reply' marker
  - Mentions: Other 'e' tags and 'p' tags
  - Topics: 't' tags
- **Reference Processing**:
  - TagProcessor: Extracts and categorizes tags
  - ReferenceProcessor: Manages bi-directional references
  - Metadata: Stores references in note frontmatter
- **Profile Linking**:
  - Obsidian Native: Uses Obsidian's built-in link resolution
  - Bi-directional: Links maintained through [[Profile Name]] syntax
  - Frontmatter: Profile mentions stored in note frontmatter
  - Backlinks: Automatically managed by Obsidian's cache

### Core Layer
- **Interfaces**: Define contracts for validators, managers, and handlers
- **Handlers**: Process different types of events with specialized components
- **Services**: Core functionality like relay connections and file operations
  - FileService: Centralized file operations and link management
  - DirectoryManager: File system operations and path handling
  - ProfileFormatter: Consistent profile note formatting
- **Contact Graph**: Manages contact relationships and follows
  - Direct follows tracking
  - Follows-of-follows support
  - Profile data integration
  - Contact event validation

### Event Bus Layer
- **NostrEventBus**: Central event management system
  - Type-safe event handling with generics
  - Priority-based handler execution
  - Handler timeout protection
  - Detailed error reporting
  - Optional logging
  - Cleanup handling
- **Event Types**: Structured event definitions
  - Note events (kind 1)
  - Thread events
  - Search events
  - Fetch events
  - Poll events (kind 1068)
  - Reaction events (kind 7)
  - Zap events (kind 9735)

### Reaction System
- **ReactionProcessor**: Handles reactions and zaps
  - Processes kind 7 events (likes)
  - Processes kind 9735 events (zaps)
  - Updates frontmatter metadata
  - Maintains reaction counts
- **ReactionStore**: Manages reaction state
  - Caches reaction data
  - Provides reaction queries
  - Handles state updates

### Poll System (NIP-1068)
- **PollService**: Manages poll operations
  - Creates and updates polls (kind 1068)
  - Processes votes (kind 1018)
  - Maintains poll state
  - Event bus integration
  - One vote per pubkey enforcement
- **Poll Features**:
  - Single/multiple choice support
  - Real-time vote tracking with response tags
  - Automatic file updates with frontmatter
  - State persistence with validation
  - Vote deduplication per user

### Fetch Layer
- **UnifiedFetchProcessor**: Bulk operations manager
  - Configurable fetch options
  - Filtering capabilities
  - Event type handling
  - Relay optimization
  - Thread context support
  - Batch processing
  - Direct Obsidian API integration

- **FetchProcessor**: Interactive operations manager
  - Stream-based event handling
  - Real-time metadata updates
  - Direct event processing
  - Right-click operation support
  - Event chain management

- **Specialized Handlers**:
  - HexFetchHandler: Author-specific fetches (up to 500 notes)
  - ThreadFetchHandler: Thread context fetches
  - KeywordSearchHandler: NIP-50 search operations with enhanced UI
    * Dedicated keyword input field
    * Comma-separated keyword support
    * Configurable search scope and time range
    * Content type filtering
  - NodeFetchHandler: Context-aware content fetches
  - ContactHandler: Follow relationship management
  - ProfileHandler: Profile data management
  - NoteHandler: Note content management

### Processor Integration
- **Event Flow**:
  - UnifiedFetchProcessor: Batch → Process → Store
  - FetchProcessor: Stream → Process → Update
  - Shared ReferenceProcessor for relationships
  - Common TagProcessor for nostr tags

- **State Management**:
  - Metadata handled differently per processor
  - References shared through ReferenceProcessor
  - Thread context maintained across processors
  - Cache management varies by approach

## Event Flow

### Core Event Flow
```
Event → EventBus → Handler → Processing → Storage
         ↓           ↓          ↓           ↓
      Validate   Route to    Process     Save to
      Event      Handler     Event       Files
```

### Unified Fetch Flow
```
Request → UnifiedFetchProcessor → Relay Query → Processing → Storage
           ↓                        ↓             ↓           ↓
        Build        Query Multiple     Process    Save to
        Filters         Relays          Results    Files
           ↓
     Contact Graph
     Integration
        ↓
    Profile Data
     Processing
```

### Poll Event Flow
```
Poll Event (1068) → Validation → State Check → Processing → File Update
         ↓              ↓            ↓            ↓            ↓
      Validate      Check State   Process     Update Poll   Update File
      NIP-1068      & Cache      via Bus      State        & Metadata

Vote Event (1018) → Validation → Response Check → Vote Count → File Update
         ↓              ↓             ↓             ↓            ↓
      Validate      Check Poll    Validate      Update Poll   Save Poll
      Response      Exists       Responses      Vote Count    to File
      Tags
```

### Reaction Flow
```
Reaction → EventBus → ReactionProcessor → State Update → File Update
    ↓          ↓             ↓               ↓             ↓
 Validate   Route to      Process         Update       Update Note
  Event     Handler       Reaction        Cache        Frontmatter
```

## Migration Status
- Regular fetch: Working with unified processor
- Hex fetch: Fully migrated, supports up to 500 notes
- Thread fetch: Using unified processor
- Keyword search: Working with NIP-50 support
- Node-based fetch: Fully migrated to unified processor
- Reactions: Migrated to event bus
- Polls: Using event bus system
- Contact processing: Integrated with unified processor
  - Contact graph support
  - Profile data handling
  - Follow relationship tracking
  - Event validation

## Future Improvements

1. Event Bus Migration:
   - ✓ Reaction handler migration
   - ✓ Poll handler migration
   - Complete remaining handlers

2. Performance:
   - Enhanced caching system
   - Relay connection pooling
   - Request deduplication
   - Batch processing optimization

3. Features:
   - Enhanced thread context
   - Advanced search capabilities
   - Profile analytics
   - Poll visualization
   - Interactive graph views
   - Contact graph visualization
   - Follow relationship analytics

4. Architecture:
   - Complete modular processor system
   - Enhanced error handling
   - Improved state management
   - Better type safety
