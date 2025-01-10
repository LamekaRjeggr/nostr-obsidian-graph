# Event Bus

Core event handling system for experimental features. Provides a type-safe, centralized event management system.

## Features
- Singleton event bus instance
- Priority-based handler execution
- Handler timeout protection
- Detailed error reporting
- Optional logging
- Cleanup handling

## Usage

### Basic Usage
```typescript
// Get event bus instance
const eventBus = NostrEventBus.getInstance({
    enableLogging: true,
    maxHandlers: 10,
    handlerTimeout: 5000
});

// Create a handler
const handler: EventHandler = {
    handle: async (event) => {
        // Process event
    },
    priority: 1,
    filter: (event) => true,
    cleanup: async () => {
        // Cleanup resources
    }
};

// Subscribe to events
eventBus.subscribe(NostrEventType.POLL, handler);

// Publish events
await eventBus.publish(NostrEventType.POLL, pollEvent);

// Unsubscribe when done
await eventBus.unsubscribe(NostrEventType.POLL, handler);
```

### Error Handling
```typescript
const result = await eventBus.publish(NostrEventType.POLL, event);
if (!result.success) {
    console.error(
        `Error: ${result.error?.type}`,
        `Message: ${result.error?.message}`
    );
}
```

## Handler Interface

Handlers must implement the `EventHandler` interface:
```typescript
interface EventHandler<T = any> {
    // Required: Process an event
    handle(event: T): Promise<void>;
    
    // Required: Handler priority (lower numbers run first)
    priority: number;
    
    // Optional: Filter events
    filter?(event: T): boolean;
    
    // Optional: Cleanup when unsubscribed
    cleanup?(): Promise<void>;
}
```

## Configuration Options

```typescript
interface EventBusOptions {
    // Enable detailed logging
    enableLogging?: boolean;
    
    // Maximum handlers per event type
    maxHandlers?: number;
    
    // Handler timeout in milliseconds
    handlerTimeout?: number;
}
```

## Best Practices

1. Handler Implementation
   - Keep handlers focused and small
   - Implement proper error handling
   - Use appropriate priority levels
   - Clean up resources in cleanup()

2. Event Publishing
   - Check publish results
   - Handle errors appropriately
   - Consider using timeouts

3. Error Handling
   - Always check result.success
   - Log error details when needed
   - Implement recovery strategies

4. Resource Management
   - Unsubscribe handlers when done
   - Implement cleanup methods
   - Monitor handler count

## Testing

Test files should be placed alongside implementation:
```
event-bus/
├── event-bus.ts
├── types.ts
├── README.md
└── __tests__/
    └── event-bus.test.ts
```

Example test:
```typescript
describe('NostrEventBus', () => {
    let eventBus: NostrEventBus;

    beforeEach(() => {
        eventBus = NostrEventBus.getInstance();
        await eventBus.reset();
    });

    test('publishes events to handlers', async () => {
        const handler = {
            handle: jest.fn(),
            priority: 1
        };

        eventBus.subscribe(NostrEventType.POLL, handler);
        await eventBus.publish(NostrEventType.POLL, { data: 'test' });

        expect(handler.handle).toHaveBeenCalled();
    });
});
```

## Error Types

```typescript
enum EventError {
    HANDLER_TIMEOUT = 'HANDLER_TIMEOUT',
    HANDLER_ERROR = 'HANDLER_ERROR',
    INVALID_EVENT = 'INVALID_EVENT',
    MAX_HANDLERS_EXCEEDED = 'MAX_HANDLERS_EXCEEDED'
}
```

## Performance Considerations

1. Handler Priority
   - Use priority to order handlers
   - Critical handlers should have lower numbers
   - Consider execution order

2. Timeouts
   - Set appropriate timeout values
   - Monitor long-running handlers
   - Handle timeout errors

3. Memory Management
   - Unsubscribe unused handlers
   - Implement cleanup methods
   - Monitor handler count

## Integration Guidelines

1. Keep event types focused
2. Document handler behavior
3. Use proper error handling
4. Test thoroughly
5. Monitor performance
