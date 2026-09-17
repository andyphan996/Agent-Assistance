# Security Spec

## Data Invariants
1. `tasks` must belong to a user, indicated by `userId`.
2. Tasks timestamps should not be overly abused. Wait, we use `startTime`, `endTime` (ms).
3. `userId` in `tasks` must strictly equal `request.auth.uid`.
4. `memories` must define `userId` that equals `request.auth.uid`.
5. `users/{userId}` can only be updated/read by `{userId}`.
6. The `status` field in `tasks` must be one of the enum values if present.

## Dirty Dozen Payloads
1. Create a task with someone else's userId.
2. Create a task without a title.
3. Update someone else's task.
4. Update a task to change its userId.
5. Provide a string instead of number for startTime.
... etc.
