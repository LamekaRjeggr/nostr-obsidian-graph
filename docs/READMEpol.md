# Nostr Polls Implementation (NIP-1068)

This is an experimental implementation of Nostr polls following the NIP-1068 specification. It uses the new event bus architecture for event handling and state management.

## Features

- Process NIP-1068 poll events
- Support for single and multiple choice polls
- Real-time vote tracking and state management
- Automatic vote counting and validation
- Poll file creation with frontmatter metadata
- Event bus integration for event handling
- Configurable poll directory and settings

## Architecture

### Components

1. **PollService**
   - Main service coordination
   - Poll creation and management
   - Vote handling
   - Event bus integration
   - File system operations

2. **Processors**
   - **PollProcessor**: Handles poll creation events
   - **VoteProcessor**: Handles vote events
   - Both integrate with event bus

3. **Services**
   - **ValidationService**: Validates poll and vote events
   - **StateManager**: Manages poll states and votes

## Poll Event Structure

### Poll Creation Event
```json
{
  "content": "Poll question",
  "created_at": 1234567890,
  "kind": 1068,
  "tags": [
    ["option", "option1_id", "Option 1 text"],
    ["option", "option2_id", "Option 2 text"],
    ["polltype", "singlechoice|multiplechoice"],
    ["relay", "wss://relay.example.com"],
    // ... additional relay tags
  ]
}
```

### Vote Event
```json
{
  "content": "",
  "created_at": 1234567890,
  "kind": 1068,
  "tags": [
    ["e", "poll_event_id"],
    ["option", "selected_option_id"]
  ]
}
```

## Implementation Details

### Poll Fetching
- Fetches kind 1068 events from configured relays
- No time window filtering (polls may have future timestamps)
- Processes both poll creation and vote events
- Handles relay-specific event distribution

### Event Processing Flow
```
Poll Event → Validation → State Check → Processing → File Creation
         ↓            ↓            ↓           ↓
      Validate    Check State   Process    Create Poll
      NIP-1068    & Cache      via Bus     File

Vote Event → Validation → State Check → Processing → State Update
         ↓            ↓            ↓           ↓
      Validate    Check Vote    Process    Update Poll
      Vote        Eligibility  via Bus     File & Cache
```

### File Structure and Naming

Poll files are created in the configured polls directory with the following format:
- File naming: `[event_id].md` (using hex event ID for uniqueness)
- Directory: `nostr/polls/` (configurable in settings)

File content structure:
```markdown
---
id: "poll_event_id"
pubkey: "author_pubkey"
created: 1234567890
created_at: "2024-01-28T12:00:00Z"
kind: 1068
question: "Poll question"
options:
  - id: "option1_id"
    text: "Option 1 text"
    votes: 0
  - id: "option2_id"
    text: "Option 2 text"
    votes: 0
poll_type: "singlechoice|multiplechoice"
total_votes: 0
closed: false
nostr_tags:
  - ["option", "option1_id", "Option 1 text"]
  - ["option", "option2_id", "Option 2 text"]
  - ["polltype", "singlechoice|multiplechoice"]
---

# Poll question

_Single/Multiple choice poll_

## Options
- [ ] Option 1 text (0 votes)
- [ ] Option 2 text (0 votes)

Total votes: 0
```

## Performance Considerations

### Initialization
- Poll service initialization is part of the plugin's startup sequence
- Directory creation is verified before any file operations
- Relay connections are established with retry logic
- Initial state is loaded from existing poll files

### File Operations
- Files are created using event IDs for consistent naming
- Race conditions are handled for concurrent writes
- Directory existence is verified before operations
- File updates are batched where possible

### Event Processing
- Events are processed in order of creation
- Vote processing is optimized to minimize file writes
- State is maintained in memory for active polls
- Cache is used for frequently accessed data

### Memory Management
- Poll state is cleared when plugin is disabled
- Cache size is limited to active polls
- Memory is released when polls are closed
- Inactive polls are removed from state

## Validation Rules

### Poll Creation
- Must have kind 1068
- Must have question in content
- Must have at least 2 options
- Must specify poll type (singlechoice/multiplechoice)
- Valid option IDs and text

### Votes
- Must reference valid poll
- Must specify valid option
- No duplicate votes in single choice
- Poll must be open

## Error Handling

1. **Validation Errors**
   - Invalid poll structure
   - Invalid vote structure
   - Missing required fields

2. **State Errors**
   - Poll not found
   - Poll already closed
   - Duplicate vote
   - Invalid option

3. **Processing Errors**
   - File system errors
   - State update errors
   - Concurrent access errors

## Future Improvements

1. **Features**
   - Poll closing mechanism
   - Vote delegation
   - Poll templates
   - Poll analytics

2. **Performance**
   - Batch vote processing
   - Enhanced caching
   - Optimized state updates
   - Lazy file loading

3. **UI/UX**
   - Poll creation wizard
   - Vote visualization
   - Poll statistics
   - Interactive voting

## Contributing

1. Follow experimental feature guidelines
2. Maintain type safety
3. Add comprehensive tests
4. Update documentation
5. Follow code style
6. Keep files under 200 lines
