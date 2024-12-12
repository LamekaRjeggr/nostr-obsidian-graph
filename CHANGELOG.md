# Changelog

## [0.73.0] - 2024-01-25
### Changed
- Major code refactoring for improved maintainability
  - Split NoteHandler into specialized components
  - Added core interfaces for better dependency management
  - Improved service organization and structure
- Moved note-reference-manager to dedicated references directory
- Created new temporal-chain-service as modern replacement for chronological-chain
- Improved error handling in event-emitter
- Removed console logging in favor of proper error handling
- Updated documentation to reflect new structure

### Deprecated
- ChronologicalChain class (use TemporalChainService instead)
  - Maintains backwards compatibility
  - Will be removed in future version

## [0.72.0] - 2024-01-20
### Added
- Reaction tracking in note frontmatter
  - Track like counts from kind 7 events
  - Track zap counts and amounts from kind 9735 events
  - Three new frontmatter fields: likes, zaps, zap_amount
- Improved fetch process notifications
  - Relay connection status
  - Contact and profile fetch progress
  - Note fetch progress
- Better error handling and notifications
  - Connection status checks
  - Error reporting for each fetch stage
  - Progress reporting for batched operations

### Changed
- Updated relay connection handling
- Improved error handling in fetch process
- Enhanced notification system for better feedback
- Separated reaction processing from main event flow

## [0.71.0] - 2024-01-15
### Added
- Editable relay configuration in settings
- Add/remove relay functionality
- Proper relay URL validation
- User feedback for relay configuration changes

### Changed
- Updated settings UI for better relay management
- Improved relay validation with error messages
- Prevented removal of last relay to ensure connectivity
- Fixed dependency conflicts using legacy peer deps

[Previous versions...]
