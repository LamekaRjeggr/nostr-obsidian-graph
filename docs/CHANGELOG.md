# Changelog

## [0.87.4] - 2024-01-15

### Added
- Enhanced keyword search UI in UnifiedFetchModal with dedicated search field and button
- Improved timestamp formatting consistency between notes and polls using ISO format

### Changed
- Integrated keyword search directly into the unified fetch interface
- Updated temporal utils to use consistent timestamp formatting across all content types

# Previous Versions

## [0.87.3] - 2024-01-14

### Fixed
- Removed duplicate profile event handler in UnifiedFetchService
- Improved profile event handling pipeline
- Reduced profile duplication issues

### Changed
- Documented profile processing challenges in KNOWN_ISSUES.md
- Improved event service lifecycle management
- Better profile event handling architecture

## [0.87.1] - 2024-01-13

### Added
- Parallel thread fetching with concurrent batches
- Retry logic with exponential backoff for failed fetches
- Enhanced progress tracking and reporting
- Optimized batch processing for vault-wide thread fetching

### Changed
- Improved vault-wide thread fetching performance
- Better error handling in thread fetching
- More detailed progress notifications
- Optimized relay request patterns
- Reduced bundle size to 356.5kb (from ~500kb)

### Fixed
- Thread fetch reliability with retry mechanism
- Progress tracking accuracy
- Batch processing efficiency
- TypeScript dependency conflicts

### Added
- Parallel thread fetching with concurrent batches
- Retry logic with exponential backoff for failed fetches
- Enhanced progress tracking and reporting
- Optimized batch processing for vault-wide thread fetching

### Changed
- Improved vault-wide thread fetching performance
- Better error handling in thread fetching
- More detailed progress notifications
- Optimized relay request patterns

### Fixed
- Thread fetch reliability with retry mechanism
- Progress tracking accuracy
- Batch processing efficiency

## [0.87.0] - 2024-01-XX

### Added
- New UnifiedFetchService for improved fetch operations
- Enhanced settings modal with tabbed interface
- Support for advanced fetch options
- Better npub/hex key handling with KeyService integration
- Improved error handling with event bus integration

### Changed
- Migrated from FetchProcessor to UnifiedFetchProcessor
- Improved settings management system
- Reduced bundle size by ~30%
- Enhanced type safety throughout the codebase
- Better error handling and validation

### Deprecated
- Legacy FetchService (will be removed in 1.0.0)
- Legacy FetchProcessor (will be removed in 1.0.0)
- Old settings format (automatic migration provided)

### Fixed
- Memory usage in batch processing
- Event ordering issues
- Settings synchronization problems
- Proper npub to hex conversion handling

## [0.87.0] - 2024-12-30
### Added
- Integrated ContactGraphService with UnifiedFetchProcessor
- Contact relationship tracking with direct follows and follows-of-follows
- Contact event validation and processing
- Profile data integration with contact graph
- Improved contact metadata handling

### Changed
- Enhanced UnifiedFetchProcessor with contact graph support
- Improved profile fetching with contact context
- Better contact event validation
- More efficient profile data handling

### Architecture
- Added ContactGraphService for relationship management
- Integrated contact processing with event bus system
- Enhanced stream handler with contact support
- Improved documentation in STRUCTURE.md

## [0.86.9] - 2024-12-29
### Added
- Reference-based thread fetching system
- Single note thread fetch functionality
- Profile-based thread fetch functionality
- ReferenceProcessor integration for efficient reference tracking

### Architecture
- Maintained dual fetch processors for different use cases:
  - UnifiedFetchProcessor for bulk operations
  - FetchProcessor for interactive operations
- Enhanced metadata handling in both processors
- Improved thread context management

### Known Issues
- Vault-wide thread fetch not yet functional
- Need to investigate vault-wide reference scanning
- Processor synchronization challenges
- Metadata handling differences between processors

## [0.86.8] - 2024-12-28
### Changed
- Removed chronological linking in favor of pure tag-based relationships
- Removed TemporalProcessor while keeping TemporalUtils for timestamp formatting
- Updated UnifiedFetchProcessor to use proper tag types from TagProcessor
- Improved thread context handling with better tag marker support
- Enhanced documentation to reflect tag-based architecture

### Fixed
- Thread links now persist correctly using nostr tag markers
- More accurate relationship types based on tag markers (root, reply, mention)
- Simplified metadata structure by removing chronological fields

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
