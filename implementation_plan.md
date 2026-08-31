# Implementation Plan — Database Chunk & Batch Write Optimization

Optimize database file storage writes in the upload API. This plan replaces the massive 10MB chunk writes with optimized 2MB chunks, batches them into groups of 4 chunks (8MB payloads), and writes them in parallel batches using `createMany` (bulk inserts) to avoid MongoDB Atlas write throttling, memory spikes, and connection timeouts on slower connections.

## Proposed Changes

### Backend: Batching & 2MB Chunk Sizing

#### [MODIFY] [route.ts](file:///c:/Users/jitsi/OneDrive/Desktop/SK%20Telecom/src/app/api/upload/route.ts)
- **Optimize Chunk Size**: Reduce the base64 chunk size from `10MB` to `2MB` (`2 * 1024 * 1024` characters) to make BSON documents smaller and easier for MongoDB Atlas M0 free tier to write to disk.
- **Batch Insertion**: Group the 2MB chunks into batches of 4 (approx. 8MB total payload per batch). This stays safely under the MongoDB BSON query limit of 16MB.
- **Bulk Write (createMany)**: Insert all chunks of a batch in a single database roundtrip using `prisma.fileChunk.createMany(...)` or raw `insert` commands, reducing the roundtrip network overhead.
- **Parallel Batch Execution**: Run all batch writes in parallel using `Promise.all(batchPromises)` (typically only 3-5 concurrent queries for a 20MB file), keeping the database connection count small and fast.

## Verification Plan

### Automated / Build Verification
- Compile and build using: `npx tsc --noEmit`

### Manual Verification
1. **Upload a 19MB PDF file**:
   - Verify that the upload completes successfully.
   - Verify that the time taken to process on the server is dramatically reduced (typically goes from minutes to under 5-10 seconds on local connections due to smaller BSON documents and fewer roundtrips).
