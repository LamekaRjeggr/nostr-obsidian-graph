# Experimental Features

This directory contains experimental features being developed for the Nostr Graph plugin. Each feature is isolated until ready for integration into the main codebase.

## Current Features

### 1. Event Bus System
- Type-safe event handling
- Priority-based processing
- Enhanced error handling
- Event validation
- See [event-bus/README.md](event-bus/README.md) for details

### Migration Strategy
The event bus will be migrated to core in phases, starting with the simplest event handler:

1. Phase 1: Reaction Handler Migration
   - Target: reaction-processor.ts
   - Rationale:
     - Simple event structure (kinds 7 and 9735)
     - Minimal dependencies
     - Atomic operations
     - Clear success/failure states
   - Steps:
     - Create event bus handlers for reactions
     - Test parallel operation
     - Validate functionality
     - Switch to event bus exclusively

2. Phase 2: Evaluate and Plan
   - Analyze Phase 1 results
   - Identify next handler
   - Update migration strategy

### 2. Poll Support (NIP-1068)
- Process poll events (kind 1068)
- Support for single and multiple choice polls
- Real-time vote tracking
- State management
- Event bus integration
- See [polls/README.md](polls/README.md) for details

### Poll Implementation Notes
The poll implementation:
1. Processes kind 1068 events without time window filtering
   - Polls may have future timestamps
   - No artificial time restrictions on event fetching
2. Uses configured relays from settings
3. Handles both poll creation and vote events
4. Stores polls in dedicated directory

## Development Guidelines

### Code Organization
- Each feature gets its own directory
- Maximum 200 lines per file
- Clear separation of concerns
- Proper error handling
- Comprehensive documentation

### Feature Structure
```
feature-name/
├── README.md           # Feature documentation
├── types.ts           # Type definitions
├── feature-service.ts # Main service
├── processors/        # Event processors
├── services/         # Supporting services
└── tests/            # Feature tests
```

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

### Event Bus Integration
1. Define event types
2. Create event handlers
3. Implement validation
4. Add error handling
5. Document event flow

## Feature Development Process

### 1. Planning
- Define feature scope
- Design architecture
- Plan event flow
- Document requirements

### 2. Implementation
- Create feature directory
- Implement core functionality
- Add event bus integration
- Write tests
- Document components

### 3. Testing
- Unit test components
- Integration test feature
- Test error handling
- Verify event flow

### 4. Documentation
- Write feature README
- Document architecture
- Add usage examples
- Document error handling

### 5. Review
- Code review
- Documentation review
- Test coverage review
- Architecture review

## Migration Path

When moving features from experimental to main:

1. Feature Stability
   - Complete test coverage
   - Documented error handling
   - Stable API design

2. Integration Steps
   - Move to appropriate directory
   - Update imports
   - Add to main services
   - Update documentation

3. Version Management
   - Update version numbers
   - Add to changelog
   - Update documentation

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

4. Testing
   - Unit tests
   - Integration tests
   - Error case tests
   - Documentation tests

## Future Features

Planned experimental features:

1. Enhanced Profile System
   - Better profile linking
   - Profile verification
   - Profile analytics

2. Advanced Search
   - Full-text search
   - Tag-based search
   - Advanced filters

3. Data Analytics
   - Note statistics
   - User analytics
   - Network analysis

4. UI Improvements
   - Custom views
   - Interactive graphs
   - Enhanced navigation
