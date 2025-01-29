# Nostr Graph Plugin for Obsidian

A comprehensive Nostr integration for Obsidian, enabling you to fetch, organize, and visualize your Nostr content within Obsidian's vault structure.

## Features

### Fetch Operations
- Multiple fetch modes with dedicated settings:
  - Regular fetch: Get notes from your npub (up to 500 notes per batch)
    * Batch processing for better performance
    * Automatic retry on failure
    * Progress tracking with notifications
  - Thread fetch: Get complete thread context and replies
    * Root and reply context preservation
    * Bi-directional reference tracking
    * Parallel thread processing
  - Hex fetch: Get notes from specific authors (up to 500 notes)
    * Configurable batch size
    * Author-specific filtering
    * Metadata preservation
  - Keyword search: Advanced search with NIP-50 support (up to 5000 notes)
    * Dedicated search field for keywords
    * Comma-separated keyword input
    * Configurable search scope and time range
    * Content type filtering options
  - Node-based fetch: Context-aware fetch from right-click menu
    * Profile-based fetching
    * Thread context fetching
    * Automatic relationship mapping

### Known Limitations
- Memory Management:
  * Cache grows unbounded without size limits
  * No cache persistence between sessions
  * Title and link caches can get out of sync
- File Operations:
  * Potential race conditions during concurrent updates
  * Profile updates can break existing links
  * No atomic file operations
- Event Handling:
  * Limited retry mechanisms for failed fetches
  * No timeout handling for slow relay responses
  * Event stream can get stuck on errors
- Poll System:
  * Vote deduplication relies only on pubkey
  * No handling of poll close events
  * Vote counts can get out of sync

### Content Organization & Storage
- Tag-based relationship system
  - Thread relationships based on nostr 'e' tags with markers
  - Root and reply references preserved from nostr protocol
  - Mentions tracked through 'p' tags and unmarked 'e' tags
  - Topics from 't' tags
- Smart profile linking system
  - Link to profiles via both pubkey and display name
  - Automatic bi-directional linking
  - Better graph visualization
- Organized directory structure
  - Separate directories for notes, replies, and polls
  - Configurable directory paths
  - Clean file organization

### Enhanced Features
- Thread Context
  - Accurate thread relationships from nostr tags
  - Root and reply markers preserved
  - Complete conversation context
- Reaction tracking (kind 7 events)
- Poll Support (NIP-1068)
  - Single and multiple choice polls
  - Real-time vote tracking
  - Poll state management
- Metadata Support
  - Complete nostr tag preservation
  - Consistent ISO timestamp formatting across notes and polls
  - Unix timestamps preserved for reference
  - Topic tags integration

## Architecture

### Core Layer
- **Tag Processing**: Accurate relationship handling through nostr tags
  - Root and reply markers for thread structure
  - Mention detection from 'e' and 'p' tags
  - Topic extraction from 't' tags
- **Interfaces**: Define contracts for validators, managers, and handlers
- **Handlers**: Process different types of events with specialized components
- **Services**: Core functionality like relay connections and file operations

### Event Bus Layer
- **NostrEventBus**: Central event management system
  - Type-safe event handling
  - Priority-based processing
  - Enhanced error handling
  - Handler timeout protection
  - Detailed error reporting
  - Optional logging
  - Cleanup handling

### Fetch Layer
- **UnifiedFetchProcessor**: Central fetch operations manager
  - Configurable fetch options
  - Filtering capabilities
  - Event type handling
  - Relay optimization
  - Thread context support
  - Direct Obsidian API integration

### Poll Implementation
- Process NIP-1068 poll events
- Support for single/multiple choice polls
- Real-time vote tracking
- State management
- Event bus integration
- File system operations

## Usage

### Installation
1. Open Obsidian Settings
2. Go to Community Plugins
3. Search for "Nostr Graph"
4. Install and enable the plugin

### Directory Management

#### Directory Structure
The plugin maintains several key directories for organizing Nostr content:
- `nostr/notes`: Primary directory for notes
- `nostr/replies`: Directory for reply content
- `nostr/profiles`: Directory for user profiles
- `nostr/polls`: Directory for polls (when enabled)
- `nostr/User Profile`: Directory for user's own profile
- `nostr/User Notes`: Directory for user's own notes
- `nostr/Replies to User`: Directory for replies to user

#### Directory Initialization
The plugin automatically creates and manages these directories. Important notes:

1. Initial Setup
- Directories are created when the plugin first loads
- Each directory's state is tracked to ensure proper initialization
- Settings are persisted after successful directory creation

2. Directory Deletion Behavior
- If directories are manually deleted, the app needs to be reloaded twice:
  * First reload: Detects missing directories and triggers recreation
  * Second reload: Ensures proper initialization and state persistence
- This double-reload requirement is due to the plugin's state tracking system

#### Commands
- `Fetch Notes`: Get notes for configured npub
- `Fetch Mentioned Profiles`: Get profiles for mentioned users
- `Fetch Thread`: Get thread context for current note
- `Fetch Author Threads`: Get all threads for current profile
- `Fetch Vault Threads`: Get threads for all notes in vault
- `Node based fetch`: Context-aware fetch from right-click menu
  * On profile files: Fetches author's notes
  * On note files: Fetches full thread context

Each command is designed to maintain proper directory structure and organization while fetching content.

### Fetch Settings Modal
Access via Command Palette (Mod+Shift+F) to configure:
- Regular Fetch: Notes per profile (1-500)
- Thread Fetch: Thread depth and context
- Hex Fetch: Author-specific fetching
- Keyword Search: Advanced search options

### Quick Commands
- Fetch Notes: Get notes for configured npub
- Fetch Mentioned Profiles: Get profiles for mentioned users

### Context Menu Usage
Right-click on any nostr file to access:
- On profile files: Fetch author's notes
- On note files: Fetch full thread context

## Development Guidelines

### Code Organization
- Each feature gets its own directory
- Maximum 200 lines per file
- Clear separation of concerns
- Proper error handling
- Comprehensive documentation

### Testing Requirements
- Unit tests for all components
- Integration tests for features
- Test files alongside implementation
- Mock external dependencies
- Document test scenarios

### Documentation Standards
1. README.md must include:
   - Feature overview
   - Architecture description
   - Component documentation
   - Usage examples
   - Error handling
   - Future improvements

2. Code Documentation:
   - Clear interfaces
   - Function documentation
   - Error handling documentation
   - Usage examples in comments

## Future Improvements

### Core Features
1. Enhanced Profile System
   - Better profile linking
   - Profile verification
   - Profile analytics

2. Advanced Search
   - Full-text search
   - Tag-based search
   - Advanced filters

3. Thread Fetching
   - ✓ Enhanced thread context through tag markers
   - ✓ Accurate relationship preservation
   - Quote repost support

### Performance
1. Fetch Optimization
   - Smart batch size adjustment
   - Priority-based fetching
   - Adaptive rate limiting
   - Request deduplication

2. Resource Management
   - Improved memory management
   - Automatic reference cleanup
   - Better connection pooling
   - Enhanced caching system

3. Error Handling
   - Robust retry mechanisms
   - Comprehensive error propagation
   - Advanced recovery strategies

### UI/UX
1. Enhanced Visualization
   - Custom views
   - Interactive graphs
   - Enhanced navigation
   - Poll visualization

2. User Experience
   - Poll creation wizard
   - Better search result notifications
   - Improved settings interface
   - Progress tracking

## Contributing

1. Follow Development Guidelines
   - Keep files under 200 lines
   - Add comprehensive tests
   - Document everything
   - Use event bus for events

2. Feature Requirements
   - Clear use case
   - Well-defined scope
   - Error handling
   - Documentation

3. Code Style
   - TypeScript best practices
   - Clear error handling
   - Proper typing
   - Comprehensive comments
