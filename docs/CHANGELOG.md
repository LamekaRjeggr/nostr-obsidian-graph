# Changelog

## [0.88.12] - 2024-01-26
- Added hex fetch modal with note limit slider
- Improved hex key validation and error handling
- Added command palette entry for hex fetching
- Enhanced user feedback during fetch operations

## [0.88.11] - 2024-01-26
- Enhanced profile linking using Obsidian's native link system
- Added bi-directional links between notes and mentioned profiles
- Improved profile backlinks with "Mentioned In" section
- Better integration with Obsidian's graph view

## [0.88.10] - 2024-01-26
- Improved file operations using Obsidian's native API through DirectoryManager
- Simplified race condition handling by leveraging Obsidian's file management
- Unified file operations across notes, polls, and profiles
- Reduced code complexity and potential edge cases

## [0.88.9] - 2024-01-26
- Improved thread context fetching using Obsidian's resolvedLinks API
- Enhanced type safety with ThreadContextWithReplies interface
- Optimized profile and note link resolution
- Reduced code duplication by consolidating path finding logic in FileService

## [0.88.8] - 2024-01-24
- Fixed right-click node-based fetch for profiles by using ThreadFetchService
- Unified profile thread fetching across all operations

## [0.88.7] - 2024-01-24
- Fixed profile fetching by using correct event kind
- Added cache-aware thread context fetching
- Improved type safety across fetch handlers
- Fixed node-based fetching for profiles and notes

## [0.88.6] - 2024-01-24
- Unified profile and thread fetching under single code path
- Enhanced profile fetching with full thread context
- Removed deprecated fetchProfileWithContext method
- Simplified codebase with consistent thread handling

## [0.88.5] - 2024-01-24
- Enhanced profile fetching with rich thread context
- Improved reference handling using Obsidian's cache
- Standardized profile fetching behavior across handlers
- Better integration with Obsidian's metadata system

## [0.88.4] - 2024-01-24
- Improved reply detection and organization
- Enhanced file path handling with better sanitization
- Fixed async/await handling in file operations
- Updated note path determination logic

## [0.88.3] - 2024-01-24
- Improved file operations using Obsidian's native API
- Enhanced metadata handling with Obsidian's cache system
- Optimized file listing and searching operations
- Better error handling and logging
- Reduced direct file system operations

## [0.88.2] - 2024-01-17
- Fixed thread fetching to properly handle root and parent relationships
- Added raw JSON display to notes, profiles, and polls
- Fixed race condition handling in poll saves

## [0.88.0] - 2025-01-16
- Removed deprecated modal components in favor of unified fetch system.

## [0.87.5] - 2024-01-16
- Updated poll vote handling to use kind 1018 events.

## [0.87.4] - 2024-01-15
- Enhanced keyword search UI and improved timestamp formatting.

## [0.87.3] - 2024-01-14
- Improved profile event handling and reduced duplication.

## [0.87.1] - 2024-01-13
- Added parallel thread fetching with improved performance.

## [0.87.0] - 2024-01-01
- Introduced UnifiedFetchService and improved settings management.

## [0.86.9] - 2023-12-29
- Added reference-based thread fetching system.

## [0.86.8] - 2023-12-28
- Switched to pure tag-based relationships.

## [0.86.7] - 2023-12-27
- Migrated to ReferenceProcessor architecture.

## [0.86.6] - 2023-12-26
- Introduced modular processor architecture.

## [0.86.5] - 2023-12-25
- Added NIP-50 search support.

## [0.86.4] - 2023-12-24
- Improved settings persistence and batch processing.

## [0.86.3] - 2023-12-23
- Enhanced thread context and profile fetching.

## [0.86.2] - 2023-12-22
- Initial unified fetch processor implementation.

## [0.78.0] - 2023-12-01
- Initial release with basic nostr integration.

## [0.77.0] - 2023-11-30
- Beta release.
