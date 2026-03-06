# Image Support Gap Analysis

> **Last Updated**: January 14, 2026
> **Status**: Analysis & Proposal

---

## Executive Summary

The T3 App Template has partial image support but lacks **upload capability**. Users can insert images by URL, but cannot:
- Paste images from clipboard
- Drag and drop image files
- Upload images directly to storage

### Key Context: Reference Implementation Model

The T3 app is a **reference implementation** - clients/businesses fork it to build their own apps. Andamio is moving to an **API-first model** where:

- Andamio provides the **platform APIs** (DB API, Tx API, Indexer)
- Clients build and host their **own frontend apps**
- Clients should bring their **own infrastructure** (storage, etc.)

**Implication**: Andamio should NOT manage client storage. Instead, provide components/SDK that clients configure with their own storage credentials.

---

## Current State

### What Works

| Feature | Status | Location |
|---------|--------|----------|
| `ImageBlock` Tiptap extension | ✅ Works | `src/components/editor/extensions/ImageBlock/` |
| Insert image by URL (toolbar) | ✅ Works | `EditorToolbar.tsx:316-375` (ImageDialog) |
| Next.js Image optimization | ✅ Works | `next.config.js` (remotePatterns) |
| Markdown image syntax in paste | ✅ Works | `tiptap-markdown` extension |
| Display GCS-hosted images | ✅ Works | Domain allowed in `next.config.js` |

### What's Missing

| Feature | Status | Impact |
|---------|--------|--------|
| **Paste image from clipboard** | ❌ Missing | Users must upload elsewhere first |
| **Drag-and-drop upload** | ❌ Missing | Poor UX for content creators |
| **Upload API endpoint** | ❌ Missing | No backend to receive files |
| **Storage integration** | ❌ Missing | Nowhere to store uploaded files |

### Evidence: Editor README Roadmap

From `src/components/editor/README.md` (line 553-560):

> **3. File Uploads / Drag & Drop Images**
> **Why**: Currently images require URL input; direct upload would significantly improve UX.
>
> **Implementation approach**:
> - Integrate with cloud storage (S3, Cloudflare R2, etc.)
> - Add drag-and-drop zone
> - Show upload progress
> - Thumbnail preview before upload

This is listed as **HIGH PRIORITY** in the implementation matrix.

---

## Legacy Platform Implementation

The Andamio Platform (legacy) has full image upload support via GCS:

### Architecture

```
User Action                    Frontend                         Backend                      Storage
───────────────────────────────────────────────────────────────────────────────────────────────────────
Paste/Drop Image  ──────────▶  ImageUpload Hook  ──────────▶  /api/gcp/upload  ──────────▶  GCS Bucket
                                     │                              │                            │
                               Create FormData                 Validate file                Store file
                               Add file + name                 Generate UUID                Return URL
                                     │                              │                            │
                               Receive URL  ◀─────────────────  Return GCS URL  ◀─────────────────
                                     │
                               Insert imageBlock
                               with GCS URL
```

### Key Files (Legacy Platform)

| File | Purpose |
|------|---------|
| `src/components/editor/extensions/ImageUpload/view/hooks.ts` | Upload logic, FormData creation |
| `src/pages/api/gcp/upload.ts` | Next.js API route for GCS upload |
| `src/components/editor/extensions/ImageBlock/ImageBlock.ts` | Tiptap node for block images |

### GCS Upload Endpoint (Legacy)

```typescript
// /api/gcp/upload.ts (simplified)
import { Storage } from '@google-cloud/storage';

const storage = new Storage();
const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);

export default async function handler(req, res) {
  const file = req.body.file;
  const fileName = `${uuid()}-${file.name}`;

  await bucket.file(fileName).save(file.buffer, {
    contentType: file.type,
  });

  res.json({
    url: `https://storage.googleapis.com/${bucket.name}/${fileName}`
  });
}
```

### Tiptap JSON Format

```json
{
  "type": "imageBlock",
  "attrs": {
    "src": "https://storage.googleapis.com/andamio-bucket/uuid-filename.png",
    "width": "600",
    "height": "600",
    "align": "center",
    "alt": "Description"
  }
}
```

---

## Solution Options

### Option 1: Replicate Legacy GCS Approach (Hardcoded)

**Pros**: Proven pattern, direct parity with legacy platform
**Cons**: Couples to Google, not portable for clients

**Implementation**:
1. Add `/api/upload` route using `@google-cloud/storage`
2. Create `ImageUpload` Tiptap extension with paste/drop handlers
3. Configure GCS bucket and credentials

**Effort**: Medium (3-5 days)
**Fit for Reference Model**: ❌ Poor - hardcoded to one provider

---

### Option 2: Andamio DB API Upload Endpoint (Managed)

**Pros**: Centralized storage, could be monetized
**Cons**: Andamio bears storage costs, doesn't fit API-first model

**Implementation**:
1. Add `POST /storage/upload` endpoint to DB API
2. API handles GCS/R2 storage internally
3. Frontend calls API, receives URL

**Effort**: Medium (2-3 days API, 2-3 days frontend)
**Fit for Reference Model**: ⚠️ Partial - could work as paid tier, but adds operational burden

---

### Option 3: Third-Party Service (Uploadthing, Cloudinary)

**Pros**: Fast implementation, managed infrastructure
**Cons**: External dependency, vendor lock-in, costs passed to client

**Implementation**:
1. Integrate Uploadthing or similar
2. Configure in T3 app with client's API keys
3. No changes to DB API needed

**Effort**: Low (1-2 days)
**Fit for Reference Model**: ⚠️ Partial - easy but locks clients to specific vendor

---

### Option 4: Storage-Agnostic SDK (Recommended) ⭐

**Pros**:
- Clients bring their own storage (GCS, S3, R2, Azure Blob)
- No storage costs for Andamio
- Enterprise-friendly (data residency, existing infrastructure)
- Portable reference implementation

**Cons**:
- More upfront development
- Clients must configure storage

**Implementation**:
1. Create `@andamio/storage` package with provider adapters
2. T3 template includes Next.js API route that uses SDK
3. Clients configure via environment variables
4. SDK handles upload, returns public URL

**Effort**: Medium-High (5-7 days for SDK + adapters)
**Fit for Reference Model**: ✅ Excellent - aligns perfectly with API-first philosophy

---

### Option 5: Hybrid (SDK + Optional Managed Tier)

**Pros**: Best of both worlds - flexibility + convenience
**Cons**: Most complex to implement and maintain

**Implementation**:
1. Build Option 4 (Storage-Agnostic SDK) as foundation
2. Andamio offers optional managed storage as paid API feature
3. Clients choose: BYO storage (free) or Andamio-managed (paid)

**Effort**: High (Option 4 + API endpoint)
**Fit for Reference Model**: ✅ Excellent - serves all client types

---

## Recommended Approach: Storage-Agnostic SDK

### Philosophy

Follow the pattern of successful SDK libraries like:
- **Auth.js (NextAuth)** - You bring your own OAuth providers
- **Prisma** - You bring your own database
- **Stripe SDK** - You bring your own Stripe account

Andamio provides the **components and wiring**, clients provide their **infrastructure credentials**.

---

### Phase 1: Current State (URL Insert)
- ✅ Already works
- Users can upload to external services and paste URL
- Acceptable for initial launch

---

### Phase 2: `@andamio/storage` SDK

Create a storage abstraction package with provider adapters:

```typescript
// @andamio/storage

// Provider interface
interface StorageProvider {
  upload(file: Buffer, options: UploadOptions): Promise<UploadResult>;
  delete(url: string): Promise<void>;
  getSignedUrl?(key: string, expiresIn: number): Promise<string>;
}

// Adapters for each provider
export { GCSAdapter } from './adapters/gcs';
export { S3Adapter } from './adapters/s3';
export { R2Adapter } from './adapters/r2';
export { AzureBlobAdapter } from './adapters/azure';

// Factory function
export function createStorage(config: StorageConfig): StorageProvider {
  switch (config.provider) {
    case 'gcs': return new GCSAdapter(config);
    case 's3': return new S3Adapter(config);
    case 'r2': return new R2Adapter(config);
    case 'azure': return new AzureBlobAdapter(config);
    default: throw new Error(`Unknown provider: ${config.provider}`);
  }
}
```

**Configuration via environment variables:**

```bash
# .env - Client configures their own storage
STORAGE_PROVIDER=gcs          # or s3, r2, azure
STORAGE_BUCKET=my-bucket
STORAGE_REGION=us-central1

# Provider-specific credentials
GCS_PROJECT_ID=my-project
GCS_KEY_FILE=./service-account.json

# Or for S3/R2
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
```

---

### Phase 3: T3 Template Integration

The reference implementation includes a ready-to-use API route:

```typescript
// src/app/api/upload/route.ts
import { createStorage } from '@andamio/storage';
import { env } from '~/env';

const storage = createStorage({
  provider: env.STORAGE_PROVIDER,
  bucket: env.STORAGE_BUCKET,
  // ... credentials from env
});

export async function POST(request: Request) {
  // Auth check
  const session = await getServerSession();
  if (!session) return new Response('Unauthorized', { status: 401 });

  // Handle upload
  const formData = await request.formData();
  const file = formData.get('file') as File;

  const result = await storage.upload(
    Buffer.from(await file.arrayBuffer()),
    {
      filename: file.name,
      contentType: file.type,
      folder: 'uploads',
    }
  );

  return Response.json({ url: result.url });
}
```

---

### Phase 4: Enhanced Editor UX

Add Tiptap extension for seamless upload experience:

1. **`ImageUpload` Extension**
   - Intercept paste events for image data
   - Handle drag-and-drop files
   - Show upload progress overlay
   - Insert `imageBlock` on completion

2. **`useImageUpload` Hook**
   ```typescript
   const { upload, isUploading, progress } = useImageUpload();

   // Returns URL after upload completes
   const url = await upload(file);
   ```

3. **Toolbar Enhancement**
   - Add "Upload" tab to ImageDialog
   - File picker button
   - Drag-drop zone with preview

---

### Phase 5 (Optional): Managed Tier

For clients who don't want to manage storage:

```
POST /api/v0/storage/upload  (Andamio DB API)
Authorization: Bearer <jwt>
X-Storage-Tier: managed      # Paid tier indicator

→ Uploads to Andamio-managed bucket
→ Metered/billed per GB
```

This is **additive** - the SDK remains the primary approach.

---

## Implementation Checklist

### Phase 1: Analysis ✅
- [x] Document current state
- [x] Analyze legacy implementation
- [x] Propose solution options
- [x] Consider reference implementation model
- [x] Recommend storage-agnostic approach

### Phase 2: `@andamio/storage` Package
- [ ] Create package structure in monorepo
- [ ] Define `StorageProvider` interface
- [ ] Implement GCS adapter (primary)
- [ ] Implement S3 adapter (most common)
- [ ] Implement R2 adapter (cost-effective)
- [ ] Add file validation (type, size limits)
- [ ] Add comprehensive tests
- [ ] Write package README with setup guide
- [ ] Publish to npm

### Phase 3: T3 Template Integration
- [ ] Add `/api/upload` route using `@andamio/storage`
- [ ] Add storage env vars to `.env.example`
- [ ] Create `useImageUpload` hook
- [ ] Test with each storage provider

### Phase 4: Editor Enhancement
- [ ] Create `ImageUpload` Tiptap extension
- [ ] Add paste handler for image data
- [ ] Add drag-and-drop handler
- [ ] Update ImageDialog with upload tab
- [ ] Add upload progress indicator
- [ ] Test with various image formats
- [ ] Update editor README

### Phase 5: Documentation
- [ ] Add storage setup guide to T3 README
- [ ] Document provider-specific configuration
- [ ] Add migration guide for legacy platform users
- [ ] Create troubleshooting guide

---

## `@andamio/storage` Package Structure

```
packages/andamio-storage/
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── index.ts              # Main exports
│   ├── types.ts              # StorageProvider interface, types
│   ├── factory.ts            # createStorage() factory
│   ├── validation.ts         # File type/size validation
│   ├── adapters/
│   │   ├── gcs.ts            # Google Cloud Storage
│   │   ├── s3.ts             # AWS S3 / S3-compatible
│   │   ├── r2.ts             # Cloudflare R2
│   │   └── azure.ts          # Azure Blob Storage
│   └── utils/
│       ├── mime.ts           # MIME type detection
│       └── filename.ts       # UUID filename generation
└── tests/
    ├── gcs.test.ts
    ├── s3.test.ts
    └── validation.test.ts
```

### Core Interface

```typescript
// types.ts
export interface UploadOptions {
  filename: string;
  contentType: string;
  folder?: string;
  maxSize?: number;          // bytes, default 5MB
  allowedTypes?: string[];   // ['image/png', 'image/jpeg', ...]
}

export interface UploadResult {
  url: string;               // Public URL
  key: string;               // Storage key/path
  size: number;              // File size in bytes
  contentType: string;
}

export interface StorageProvider {
  upload(file: Buffer, options: UploadOptions): Promise<UploadResult>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

export interface StorageConfig {
  provider: 'gcs' | 's3' | 'r2' | 'azure';
  bucket: string;
  region?: string;
  // Provider-specific options
  credentials?: Record<string, string>;
}
```

---

## Configuration Requirements

### Environment Variables (T3 App with SDK)

```bash
# Storage Provider (required)
STORAGE_PROVIDER=gcs                    # gcs | s3 | r2 | azure
STORAGE_BUCKET=my-course-content
STORAGE_REGION=us-central1

# Google Cloud Storage
GCS_PROJECT_ID=my-gcp-project
GCS_CLIENT_EMAIL=storage@my-project.iam.gserviceaccount.com
GCS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# AWS S3 / S3-Compatible
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_ENDPOINT_URL=                       # Optional, for S3-compatible services

# Cloudflare R2
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...

# Azure Blob Storage
AZURE_STORAGE_CONNECTION_STRING=...
```

### Next.js Image Domains

```javascript
// next.config.js
// Clients add their own storage domains
images: {
  remotePatterns: [
    // GCS
    { protocol: "https", hostname: "storage.googleapis.com" },
    // S3
    { protocol: "https", hostname: "*.s3.*.amazonaws.com" },
    // R2 (custom domain or r2.dev)
    { protocol: "https", hostname: "*.r2.dev" },
    // Azure
    { protocol: "https", hostname: "*.blob.core.windows.net" },
  ],
}
```

---

## File Size & Format Limits

| Constraint | Recommended Value | Rationale |
|------------|-------------------|-----------|
| Max file size | 5 MB | Balance quality vs. load time |
| Allowed formats | PNG, JPG, GIF, WebP | Common web formats |
| Max dimensions | 4096 x 4096 | Reasonable for course content |

---

## Security Considerations

1. **Authentication Required** - Only authenticated users can upload
2. **File Validation** - Verify MIME type matches extension
3. **Size Limits** - Prevent storage abuse
4. **Unique Filenames** - UUID prefix prevents overwrites
5. **Public URLs** - All uploaded images are public (no signed URLs for reads)

---

## Related Files

### T3 App Template
- `src/components/editor/extensions/ImageBlock/` - Existing image display
- `src/components/editor/components/ContentEditor/EditorToolbar.tsx` - Toolbar with ImageDialog
- `src/components/editor/extension-kits/shared.ts` - Extension configuration
- `next.config.js` - Image domain allowlist

### Legacy Platform (Reference)
- `andamio-platform/src/components/editor/extensions/ImageUpload/` - Upload extension
- `andamio-platform/src/pages/api/gcp/upload.ts` - GCS upload endpoint

---

## Open Questions

1. **MVP Scope**: Start with just GCS adapter, or ship with S3 + R2 from day one?
2. **Image Optimization**: Should SDK resize/optimize images on upload? Or leave to client?
3. **Signed URLs**: Add support for private buckets with time-limited signed URLs?
4. **Cleanup Policy**: Provide utility for finding/deleting orphaned images?
5. **Video Support**: Extend to video uploads? Different size limits?

---

## Comparison: SDK vs Managed Storage

| Aspect | SDK (BYO Storage) | Managed (Paid Tier) |
|--------|-------------------|---------------------|
| **Cost to Andamio** | None | Storage + bandwidth |
| **Cost to Client** | Their own cloud bill | Andamio subscription |
| **Setup Complexity** | Medium (configure creds) | Low (just works) |
| **Data Ownership** | Client owns data | Andamio stores data |
| **Enterprise Fit** | Excellent | Limited |
| **Indie/Hobbyist Fit** | Requires cloud account | Convenient |
| **Implementation** | Required (core) | Optional (later) |

**Recommendation**: Build SDK first. Add managed tier later if demand exists.

---

## Appendix A: Prior Art / Inspiration

| Library | Pattern | What We Can Learn |
|---------|---------|-------------------|
| **Auth.js** | BYO OAuth providers | Environment-based config, adapters per provider |
| **Prisma** | BYO database | Clear migration path, great DX |
| **Uploadthing** | Managed uploads | Simple API, good progress UX |
| **Supabase Storage** | Integrated storage | Row-level security patterns |

---

## Appendix B: MCP Tool Integration (Future)

MCP tools (like Lesson Coach) can use the same `@andamio/storage` SDK:

```typescript
// lesson-coach MCP tool
import { createStorage } from '@andamio/storage';

const storage = createStorage({
  provider: 'gcs',
  bucket: process.env.STORAGE_BUCKET,
  // ... credentials
});

async function uploadLessonImage(filePath: string): Promise<string> {
  const buffer = readFileSync(filePath);
  const result = await storage.upload(buffer, {
    filename: basename(filePath),
    contentType: 'image/png',
    folder: 'lessons',
  });
  return result.url;
}
```

This enables:
- Batch image uploads for course content
- Programmatic content generation with images
- Consistent storage across all Andamio tools (web app, CLI, MCP)

---

## Appendix C: Migration from Legacy Platform

For teams migrating from the Andamio Platform (legacy):

1. **Existing images stay in GCS** - No migration needed, URLs still work
2. **Configure SDK with same bucket** - Continue using existing GCS bucket
3. **Update Next.js config** - Ensure `storage.googleapis.com` is allowed (already is)
4. **Test upload flow** - Verify paste/drop works in new editor

```bash
# Same credentials as legacy platform
STORAGE_PROVIDER=gcs
STORAGE_BUCKET=andamio-bucket           # Same bucket as before
GCS_PROJECT_ID=andamio-platform
GCS_CLIENT_EMAIL=...
GCS_PRIVATE_KEY=...
```
