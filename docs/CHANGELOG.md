# Changelog

## [0.31.2] - 2024-01-04
### Added
- Added collapsible Raw Event JSON section to notes and profiles
- Complete event data preserved in each file for reference
- JSON data stored in Obsidian-friendly format

## [0.31.1] - 2024-01-03
### Changed
- Migrated from NDK to nostr-tools for improved performance
- Added PoolService for relay connections
- Improved connection management

## [0.31.0] - 2024-01-02
### Changed
- Simplified directory structure to be more user-friendly:
  - `user notes/` for text notes (kind 1)
  - `user profile/` for profile metadata (kind 0)
  - `user follows/` for follow lists (kind 3)
- Improved filename generation:
  - Notes use first sentence as filename
  - Profile and follow lists use pubkey as filename
- Updated vault service to handle new directory structure
- Updated documentation to reflect new organization

## [0.30.0] - 2024-01-01
### Changed
- Simplified note storage to use markdown files only
- Removed separate JSON storage for events
- Added event data as collapsible JSON section in markdown notes
- Updated vault service to read/write from markdown files
- Improved context menu to work with markdown notes

### Removed
- Removed kind-based directory structure
- Removed JSON file storage

## [0.29.0] - 2023-11-14
### Changed
- Simplified event storage structure to use kind-based directories
- Improved NDK integration with proper type definitions
- Removed unused pipeline and adapter code
- Updated relay service to handle NDK connections better
- Improved event service to use NDK's subscription system

### Fixed
- Fixed type errors with NDK event handling
- Fixed initialization issues with event service
- Fixed relay connection management

### Removed
- Removed fetch operations and templates
- Removed unused adapters and transformers
- Removed pipeline-related code and types

## [0.28.0] - 2023-11-13
- Initial release with basic Nostr functionality
- Support for profiles, notes, and follow lists
- Basic relay management
- Event storage in Obsidian vault
