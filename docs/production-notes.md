# Production Considerations

Notes for preparing the app for production/SaaS deployment.

---

## Rate Limiting

### Current State

- Rate limit: **5000 requests per 15 minutes** (in `server/middleware/rateLimiters.js`)
- This is appropriate for local development / single-user use
- For SaaS deployment, stricter limits are needed

### Recommended Production Configuration

```javascript
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 300 : 5000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.ip === "127.0.0.1", // Skip for localhost
  message: "Too many requests, please try again later",
});
```

### SaaS Security Checklist

| Concern             | Recommendation                                                  |
| ------------------- | --------------------------------------------------------------- |
| DDoS protection     | Use a CDN like Cloudflare                                       |
| API abuse           | Add authentication, rate limit per user (not just per IP)       |
| Brute force on auth | Extra strict limits on login endpoints (5-10 attempts)          |
| Resource exhaustion | Limit file upload sizes, queue heavy operations                 |
| Shared IP issues    | Users behind NAT share IPs - consider per-user limits with auth |

### Per-User Rate Limiting (for authenticated routes)

```javascript
import rateLimit from "express-rate-limit";

export const userApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  keyGenerator: (req) => req.user?.id || req.ip, // Rate limit by user ID if authenticated
  standardHeaders: true,
  legacyHeaders: false,
});
```

---

## Media Library Pagination

### Current State

- All media files are loaded into memory at once
- Works fine for ~500 files with caching
- No pagination or virtual scrolling

### When to Consider Changes

- Users regularly have 500+ files
- `media.json` loading becomes slow (>500ms)
- Browser memory becomes an issue with many thumbnails

### Options

1. **API Pagination** - More complex, requires offset/cursor handling
2. **Virtual Scrolling** - Only render visible items (recommended first step)
   - Libraries: `@tanstack/react-virtual` or `react-window`
