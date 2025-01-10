# Changelog

## [0.86.7] - 2024-12-27
### Changed
- Migrated from ReferenceStore to ReferenceProcessor for better modularity
- Added IReference interface for consistent reference handling
- Improved reference handling with better separation of concerns
- Removed deprecated ReferenceStore implementation

## [0.86.6] - 2024-12-26
### Added
- New modular processor architecture for better code organization and maintainability
- TagProcessor for handling nostr event tags
- ReferenceProcessor for managing bi-directional references
- TemporalProcessor for chronological relationships
- Updated documentation in MODULAR_PROCESSORS.md

### Changed
- Refactored note handling to use new processor system
- Improved reference handling with better separation of concerns
- Enhanced temporal processing with Obsidian integration
- Removed deprecated code and legacy handlers

### Fixed
- Better type safety in processor implementations
- Improved error handling in event processing
- More consistent reference handling

## [0.86.5] - 2024-12-25
### Added
- NIP-50 search support in UnifiedFetchProcessor for efficient keyword searching
- New skipSave option for fine-grained control over file saving
- Improved error handling and progress tracking in KeywordSearchHandler

### Changed
- Keyword search now uses relay-side filtering for better performance
- Enhanced file path handling using Obsidian's API
- Better search result notifications with success/failure counts

## [0.86.4] - 2024-12-24
### Added
- New FETCH_SYSTEM.md documentation detailing the fetch architecture
- Improved settings persistence for fetch parameters
- Intelligent batch processing (70/30 split for new/existing authors)

### Changed
- Regular fetch settings now persist between sessions
- Settings modal saves changes immediately
- FetchProcessor respects user-defined limits consistently

## [0.86.3] - 2024-12-23
### Changed
- Right-click fetch now uses legacy fetch processor for better metadata and relationship handling
- Improved thread context fetching with complete reference tracking
- Enhanced profile fetching with richer metadata

## [0.86.2]
- Previous version with unified fetch processor

## [0.78.0]
- Initial release with basic nostr integration

## [0.77.0]
- Beta release
