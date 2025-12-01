# Events & Notifications System

This module provides system-wide event logging and notification management for all mutation operations (create, update, delete, assign, restore, trash, etc). Events are emitted using EventEmitter2 and persisted to the database for audit and notification purposes.

## Features

- Event schema for storing event type, details, user, resource, and timestamp
- EventEmitter2 integration for async event emission
- Centralized event listener service to persist events
- API endpoints for retrieving events/logs with filtering and pagination
- Designed for easy integration with all service mutation operations

## Usage

- Inject `EVENT_EMITTER` and emit events after mutation operations:
  ```ts
  this.eventEmitter.emit('create', 'User created', userId, 'User', userId);
  ```
- Events are automatically persisted via the listener service
- Query events via `/api/events` endpoint

## Event Types

- create, update, delete, assign, unassign, restore, trash, login, logout, other

## Example Event Document

```
{
  eventType: 'create',
  details: 'User created',
  user: '...',
  resourceType: 'User',
  resourceId: '...',
  occurredAt: '2025-11-14T10:00:00Z'
}
```
