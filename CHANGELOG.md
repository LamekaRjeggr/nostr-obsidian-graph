# Changelog

## [0.64.0] - 2024-03-08

### Added
- Enhanced profile linking system
  - Profile files now store pubkeys as aliases
  - Notes can link to profiles via both pubkey and display name
  - Improved bi-directional linking between notes and profiles
  - Better graph visualization with human-readable names
- Updated note frontmatter format
  - Added author name field alongside pubkey
  - Both fields now properly link to profile files
- Modified profile frontmatter structure
  - Pubkey now stored in aliases field for better Obsidian integration
  - Improved compatibility with Obsidian's native linking

### Changed
- Updated documentation to reflect new profile linking system
- Improved code organization for profile handling
- Enhanced profile resolution in file service

## [0.63.1] - 2024-03-08

### Fixed
- Hex key fetching now only gets notes for specified pubkey
  - No longer includes notes from contacts
  - More focused and efficient fetching
  - Better matches expected behavior

### Changed
- Updated documentation to clarify hex fetching behavior
- Improved code organization for fetch operations

## [0.63.0] - 2024-03-08

### Added
- Enhanced note frontmatter
  - Added 'kind' field to show nostr event kind
  - Added 'tags' field with raw tag array
  - Improved metadata accessibility
  - Better note categorization support

### Changed
- Improved fetch service to handle both npub and hex
- Enhanced error handling for fetch operations
- Updated command palette options

## [0.62.0] - 2024-03-08

### Added
- Direct hex key fetching
  - New command "Fetch Notes by Hex Key"
  - Direct hex input without npub conversion
  - Maintains all existing note organization
  - Works alongside npub fetching
- Comprehensive documentation
  - Added DEVELOPMENT.md for technical details
  - Added HEX_FETCH.md quick reference guide
  - Updated README.md with module structure

## [0.61.1] - 2024-03-07

### Changed
- Increased maximum fetch batch size from 200 to 500 notes

## [0.61.0] - 2024-03-07

### Added
- Reply separation feature
  - New setting to separate reply notes into their own directory
  - Optional nostr/replies directory for reply posts
  - Toggle in settings to enable/disable feature
  - No migration needed for existing notes

### Changed
- Directory handling improvements
  - Better support for optional directories
  - More robust directory creation
  - Improved path handling

### Fixed
- Directory creation error handling
- Optional directory type safety
- Undefined directory handling

## [0.60.0] - Initial Release

### Features
- Nostr integration
- Note fetching
- Profile management
- Auto-update support
- Relay configuration
- Note linking
- Profile display options
