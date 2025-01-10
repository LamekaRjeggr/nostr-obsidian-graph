# Project Structure

## Directory Layout

```
src/
├── experimental/
│   ├── event-bus/          # Event bus system
│   └── polls/              # Poll support
├── services/
│   ├── core/              # Core services
│   ├── fetch/
│   │   ├── handlers/      # Specialized fetch handlers
│   │   └── ...
│   └── ...
└── views/
    ├── modals/            # Modal components
    │   ├── sections/      # Modal section components
    │   │   ├── regular-fetch-section.ts
    │   │   ├── thread-fetch-section.ts
    │   │   ├── hex-fetch-section.ts
    │   │   └── keyword-search-section.ts
    │   ├── fetch-settings-modal.ts
    │   └── types.ts
    ├── settings-tab.ts
    ├── hex-input-modal.ts  # Quick hex input modal
    └── support-section.ts
```

## Service Architecture

### Core Layer
- **Interfaces**: Define contracts for validators, managers, and handlers
- **Handlers**: Process different types of events with specialized components
- **Services**: Core functionality like relay connections and file operations

### Event Bus Layer
- **NostrEventBus**: Central event management system
  - Handles event subscription and publishing
  - Manages handler priorities
  - Provides error handling and timeouts
- **Event Types**: Structured event definitions
  - Note events
  - Thread events
  - Search events
  - Fetch events

### Contact Graph Layer
- **ContactGraphService**: Manages follow relationships
  - Caches direct follows and follows-of-follows
  - Provides network scope filtering
  - Supports degree-based filtering

### Fetch Layer
- **UnifiedFetchProcessor**: Central fetch operations manager
  - Configurable fetch options
  - Filtering capabilities
  - Event type handling
  - Relay optimization
  - Thread context support
  - Direct Obsidian API integration
- **Specialized Handlers**:
  - HexFetchHandler: Author-specific fetches (up to 500 notes)
  - ThreadFetchHandler: Thread context fetches
  - KeywordSearchHandler: Search operations
  - NodeFetchHandler: Context-aware content fetches
    - Triggered via context menu
    - Profile mode:
      - Detects profile files by path and metadata
      - Uses hex fetch settings for author's notes
      - Integrated with hex fetch handler
    - Note mode:
      - Detects note files by path and metadata
      - Fetches thread context and references
      - Integrated with thread fetch handler
    - Uses unified fetch processor for all operations
    - Shares settings with other fetch modes

## Modal Architecture

### Fetch Settings Modal
- **Base Modal**: Central container with toolbar navigation
- **Section Components**: Modular sections for different fetch types
  - Regular: Basic fetch settings
  - Thread: Thread context fetching
  - Hex: Author-specific fetching (1-500 notes)
  - Keyword: Advanced search functionality
- **Modal Behavior**:
  - Auto-closes after fetch operations
  - Preserves settings between sessions
  - Separates settings management from fetch operations

### Settings Management
- Settings persist per section
- No default values that could override user settings
- Immediate saving when settings change
- Settings maintained between sessions

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
```

### Fetch Operation Flow
```
User Action → Settings Update → Fetch Button → Modal Close → Background Processing
                ↓                    ↓             ↓              ↓
           Save Settings      Initiate Fetch    Show Progress   Save Results
```

### Thread Fetch Flow
```
Event → EventBus → ThreadFetchHandler → Context Building → Storage
         ↓            ↓                    ↓               ↓
      Validate    Handle Event        Build Thread    Save Notes
                                     Structure
```

## Migration Status
- Regular fetch: Working
- Hex fetch: Fully migrated, supports up to 500 notes
- Thread fetch: Using legacy processor for better metadata
- Keyword search: Working with scope options
- Node-based fetch:
  - Profile mode: Using legacy processor for richer metadata
  - Note mode: Using legacy processor for complete reference tracking

## Future Improvements
1. Thread Fetching:
   - Enhance thread context building
   - Improve metadata handling

2. Data Management:
   - ✓ Remove clear notes command
   - Implement more granular data refresh
   - Better cache management

3. General:
   - Complete event bus migration
   - Optimize relay connections
   - Enhance error handling
   - Improve event validation
