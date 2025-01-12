# Known Issues

## Chronological Links

The temporal processor currently links notes based on timestamps rather than nostr tags:

1. Current Implementation
   - Notes are ordered purely by created_at timestamp
   - Previous/Next links are created based on this chronological order
   - No consideration of thread relationships from nostr tags

2. Desired Behavior
   - Should use 'e' tags with 'root' and 'reply' markers to build thread structure
   - Only fall back to timestamp ordering if no thread tags exist
   - Respect actual conversation flow in nostr

3. Impact
   - Thread context may be lost
   - Replies might not be properly linked to parent posts
   - Chronological view may not match actual conversation flow

4. Future Improvements
   - Update TemporalProcessor to check for thread tags
   - Implement proper thread structure building
   - Add fallback to timestamp ordering only when needed
