# Nostr Graph Plugin for Obsidian

This plugin integrates Nostr with Obsidian, allowing you to fetch and organize your Nostr content within Obsidian's vault structure.

## Features

### Fetch Operations
- Multiple fetch modes with dedicated settings:
  - Regular fetch: Get notes from your npub (up to 500 notes per batch)
  - Thread fetch: Get complete thread context and replies
  - Hex fetch: Get notes from specific authors (up to 500 notes)
  - Keyword search: Advanced search with configurable scope (up to 5000 notes)
  - Node-based fetch: Context-aware fetch from right-click menu
    - Profile mode: Fetches author's notes using hex fetch settings
    - Note mode: Fetches thread context and referenced content
- Improved fetch operation feedback:
  - Modal automatically closes after initiating fetch
  - Clear visibility of background fetch progress
  - Separate settings management from fetch operations

### Content Organization
- Smart profile linking system
  - Link to profiles via both pubkey and display name
  - Automatic bi-directional linking
  - Better graph visualization
- Organized directory structure
  - Separate directories for notes, replies, and polls
  - Configurable directory paths
  - Clean file organization

### Metadata Support
- Complete nostr tag preservation
  - Raw nostr tags stored in frontmatter
  - Compatible with Obsidian's metadata system
  - Topic tags integrated with Obsidian's tagging
- Human-readable timestamps
  - Preserves Unix timestamps for API compatibility
  - Adds formatted dates in frontmatter
  - Native JavaScript date formatting

### Relay Management
- Customizable relay configuration
  - Add/remove relays as needed
  - Enable/disable individual relays
  - Validation for proper relay URLs
  - At least one relay must remain active

### Enhanced Features
- Reaction tracking
  - Track likes from kind 7 events
  - Track zaps from kind 9735 events
  - Frontmatter fields for reaction counts
- Poll Support (NIP-1068)
  - Process poll events automatically
  - Single and multiple choice polls
  - Real-time vote tracking
  - Poll state management

## Installation

1. Open Obsidian Settings
2. Go to Community Plugins
3. Search for "Nostr Graph"
4. Install and enable the plugin

## Usage

### Fetch Settings Modal
Access via Command Palette (Mod+Shift+F) to configure:

1. Regular Fetch
   - Notes per profile (1-500)
   - Batch size
   - Include own notes option
   - Dedicated fetch button with auto-close

2. Thread Fetch
   - Thread depth limit
   - Context inclusion
   - Auto-populated from current note
   - Dedicated fetch button with auto-close

3. Hex Fetch
   - Batch size (1-500 notes)
   - Supports npub/hex input
   - Auto-populated from current file
   - Dedicated fetch button with auto-close

4. Keyword Search
   - Batch size up to 5000 notes
   - Scope options (direct follows, follows-of-follows, global)
   - Time range filtering
   - Content type filtering
   - Dedicated search button with auto-close

### Quick Commands
- Fetch Notes: Get notes for configured npub
- Fetch Mentioned Profiles: Get profiles for mentioned users

## Architecture

The plugin uses an event-driven architecture with:

- Event Bus: Central communication system
- UnifiedFetchProcessor: Handles all relay interactions
- Specialized Handlers: Process different types of fetch operations
- Modular Components: Separate concerns for better maintainability

For detailed architecture information, see STRUCTURE.md.

## Known Issues

1. Node-based Fetch
   - Note mode: Inconsistent linking of referenced notes
   - Note mode: Not retrieving mentioned profiles
   - Profile mode: Working as intended

2. Profile Fetching
   - Fetch mentioned profile command not functioning
   - Under investigation for fix

3. Keyword Search (Experimental)
   - May have issues pulling notes from relays
   - Under investigation for improvement

## Context Menu Usage

Right-click on any nostr file to access the node-based fetch:
- On profile files: Fetches the author's notes with complete metadata and relationships
- On note files: Fetches full thread context including:
  - Root and reply relationships
  - Profile mentions and metadata
  - Bi-directional references
  - Temporal context
- Uses legacy processing for richer metadata and relationships

## Development Status

The plugin is actively maintained with recent improvements:

- Modular fetch settings interface
- Enhanced hex fetch capabilities
- Improved settings persistence
- Better error handling
- Separated settings management from fetch operations
- Improved fetch operation feedback with auto-closing modal

Stay tuned for updates as we continue to improve the plugin's functionality.
