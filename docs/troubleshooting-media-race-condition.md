# Media Handling Race Condition Analysis

## The Problem

Intermittent `ENOENT` error when updating media usage tracking:

```
Error: ENOENT: no such file or directory, rename
'/Users/tsiger/Playground/widgetizer/data/projects/widget-30/uploads/media.json.tmp.1768391376101'
-> '/Users/tsiger/Playground/widgetizer/data/projects/widget-30/uploads/media.json'
```

## Root Causes Identified

### 1. **Autosave + Hot Reload = Race Condition** ⚠️ PRIMARY SUSPECT

**The Flow:**

```
User edits widget
  ↓ (every keystroke/change)
markWidgetModified()
  ↓
resetAutoSaveTimer() - resets 60s countdown
  ↓ (60 seconds later)
save() with Promise.all([savePageContent(), saveGlobalWidget()])
  ↓
savePageContent() → POST /api/pages/{id}/content
  ↓
pageController.savePageContent()
  ↓
updatePageMediaUsage() → calls writeMediaFile()
  ↓
writeMediaFile() with in-memory lock
```

**The Problem:**

- **Hot reload** (auto-restart on file changes) creates a **NEW Node.js process**
- Each process has its **own `writeLocks` Map** in memory
- When dev server restarts:
  - Old process might be in the middle of writing media.json
  - New process starts with empty `writeLocks` Map
  - New autosave triggers immediately (60s timer expired during restart)
  - **Both processes try to write to the same file**
  - Temp file from old process gets orphaned → ENOENT on rename

### 2. **Multiple Concurrent Saves**

Since autosave uses `Promise.all()` to save multiple things in parallel:

```javascript
await Promise.all([
  savePageContent(page.id, page), // Updates media usage
  saveGlobalWidget("header", header), // Updates media usage
  saveGlobalWidget("footer", footer), // Updates media usage
]);
```

If a page and both global widgets use images, **3 writes to media.json happen simultaneously**:

- Each acquires the lock sequentially (lock works here)
- But if dev server restarts mid-save, the new process doesn't know about existing locks

### 3. **Lock Order Bug** (FIXED)

The old code released lock before deleting from Map:

```javascript
// OLD - WRONG ORDER
finally {
  releaseLock();           // ← Unblocks waiting operations
  writeLocks.delete(id);   // ← But lock still in Map briefly
}
```

A race could occur where:

1. Operation A releases lock
2. Operation B acquires lock (while A's entry still in Map)
3. Operation B creates temp file
4. Operation A deletes from Map
5. Both operations proceed simultaneously

## Fixes Implemented ✅

### 1. Fixed Lock Cleanup Order

```javascript
finally {
  writeLocks.delete(projectId);  // Remove first
  releaseLock();                 // Then unblock
}
```

### 2. Unique Temp Files (Collision-Proof)

```javascript
const uniqueId = `${process.pid}.${Date.now()}.${Math.random().toString(36).substr(2, 9)}`;
const tempFilePath = `${mediaFilePath}.tmp.${uniqueId}`;
```

Now includes:

- Process ID (prevents cross-process collisions)
- Timestamp (millisecond precision)
- Random string (prevents same-millisecond collisions)

### 3. Retry Logic with Exponential Backoff

```javascript
if (retryCount < MAX_RETRIES && (error.code === "ENOENT" || error.code === "EPERM" || error.code === "EBUSY")) {
  const backoffMs = Math.pow(2, retryCount) * 100; // 100ms, 200ms, 400ms
  await new Promise((resolve) => setTimeout(resolve, backoffMs));
  return writeMediaFile(projectId, data, retryCount + 1);
}
```

Retries up to 3 times on transient filesystem errors.

### 4. Comprehensive Diagnostic Logging

Every step now logs:

- Temp file path being created
- Directory verification
- File existence checks
- Success/failure of each operation
- Error codes and syscalls

## Why Autosave Makes This Worse

**Autosave Characteristics:**

- Triggers every 60 seconds after last modification
- Uses `Promise.all()` for parallel saves
- Saves page + header + footer simultaneously
- Each save calls `updatePageMediaUsage()` → `writeMediaFile()`

**During Development:**

- Hot reload restarts server frequently
- Autosave timers from old process can trigger in new process
- Multiple rapid edits reset timer, creating bursts of saves
- **3 concurrent writes to same file** when all widgets use media

**Example Scenario:**

```
T+0s:  User edits page widget → timer reset
T+5s:  Hot reload (file change detected)
T+5s:  New process starts, old process shutting down
T+5.5s: Old process's autosave triggers (was at T+60s before restart)
T+5.5s: New process's autosave triggers (60s timer from initial state)
        BOTH try to write media.json
        → ENOENT: temp file from one process missing when other tries to access it
```

## Additional Recommendations

### 1. Debounce Hot Reload (Development)

Consider adding a debounce to your dev server restart to prevent rapid restarts.

### 2. Graceful Shutdown Signal

Add shutdown handler to wait for pending writes:

```javascript
process.on("SIGTERM", async () => {
  console.log("Shutting down, waiting for pending writes...");
  // Wait for all locks to clear
  while (writeLocks.size > 0) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  process.exit(0);
});
```

### 3. File-Based Locking (Production)

For production or multi-instance deployments, consider using `proper-lockfile` for cross-process locking:

```javascript
import lockfile from "proper-lockfile";

const release = await lockfile.lock(mediaFilePath, { retries: 3 });
try {
  // write operations
} finally {
  await release();
}
```

### 4. Consider Batching Media Updates

Instead of updating media.json on every save, batch updates or use a write queue with single consumer.

## Expected Impact

✅ **Lock order fix**: Prevents race within single process ✅ **Unique temp files**: Prevents collision across processes  
✅ **Retry logic**: Handles transient filesystem issues ✅ **Diagnostic logging**: Makes next occurrence debuggable

The combination should significantly reduce occurrences, but **hot reload + autosave** will still create edge cases until file-based locking is implemented for true cross-process coordination.

## Monitoring

Watch for these logs to confirm the fix is working:

- `[writeMediaFile] Successfully moved temp file to target` - Happy path
- `[writeMediaFile] Retrying after Xms due to transient error` - Retry working
- No more ENOENT errors, or much rarer

If you still see errors after this:

1. Check if multiple terminal windows running the app
2. Check if external process (backup, sync) accessing /data folder
3. Consider implementing file-based locking (#3 above)
