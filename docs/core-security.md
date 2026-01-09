# Platform Security

This document outlines the key security measures implemented in the Widgetizer backend to protect the application, its data, and its users.

## 🛡️ Core Security Layers

These layers are applied automatically to API endpoints and provide a robust baseline of protection.

### 1. Input Validation & Sanitization

- **What it is:** All incoming data from the client (e.g., in `req.body` or `req.params`) is rigorously validated and sanitized before being processed by the controllers.
- **Why it's important:** This is the primary defense against common web vulnerabilities like Cross-Site Scripting (XSS) and data integrity issues. It ensures that only well-formed data is accepted by the application.
- **Implementation:** Achieved using the `express-validator` library on all API routes that accept input.

### 2. API Rate Limiting

- **What it is:** Limits the number of requests an IP address can make to the API within a specific timeframe.
- **Why it's important:** Prevents abuse and Denial-of-Service (DoS) attacks where a single actor could overwhelm the server, making it unavailable for legitimate users.
- **Implementation:** Uses the `express-rate-limit` package. Two policies are in place:
  - **Editor routes** (`/api/projects`, `/api/themes`, `/api/pages`, `/api/preview`): 1500 requests per 15 minutes
  - **Other API routes** (`/api/menus`, `/api/media`, `/api/export`, `/api/settings`): 5000 requests per 15 minutes

### 3. HTTP Security Headers [PENDING]

- **What it is:** A collection of special HTTP headers are sent with every response from the server.
- **Why it's important:** These headers instruct the browser to enable its built-in security features, providing powerful protection against attacks like clickjacking, MIME-type sniffing, and cross-site scripting.
- **Implementation:** The `helmet` package can be used as a global middleware to set these headers on all responses. _This is not currently implemented._

### 4. Cross-Origin Resource Sharing (CORS)

- **What it is:** The server controls which domains are allowed to access the API.
- **Why it's important:** Prevents unauthorized websites from making requests to your API.
- **Implementation:** The `cors` package is enabled globally (`app.use(cors())`). In a production environment, this should be configured to whitelist specific domains.

### 5. Multi-layered SVG Sanitization

- **What it is:** All uploaded SVG files are sanitized twice: first on the client using `DOMPurify` before upload, and then again on the server using `isomorphic-dompurify`.
- **Why it's important:** SVGs are XML files that can contain JavaScript (XSS vectors). Defense-in-depth ensures that even if client-side sanitization is bypassed, the server protects the filesystem.
- **Implementation:** Integrated into `useMediaUpload.js` (client) and `mediaController.js` (server).

### 6. Global Error Handling

- **What it is:** A catch-all "safety net" middleware that handles any unexpected errors that occur within the application.
- **Why it's important:** Prevents the server from crashing due to unhandled exceptions. It also ensures that sensitive error details (like stack traces) are not leaked to the client in a production environment.
- **Implementation:** A custom error-handling middleware (`server/middleware/errorHandler.js`) is registered as the final middleware in `server/index.js`.

## ⚙️ Configuration

### Environment Variables (`.env`)

Sensitive configuration and environment-specific settings are stored in a `.env` file, which is kept out of version control. Key variables include:

- `NODE_ENV`: Controls whether the application runs in `development` or `production` mode.
- `PRODUCTION_URL`: The whitelisted domain for CORS in production.
- `VITE_API_URL`: The URL for the backend API, used by the frontend.
- `PORT`: The port number for the server (defaults to 3001).

### Health Check Endpoint

- **What it is:** A simple endpoint (`/health`) that returns the server status and current timestamp.
- **Purpose:** Used for monitoring and load balancer health checks in production environments.
- **Response:** `{ "status": "ok", "timestamp": "..." }`

## ⚙️ Deployment Security

### Production Build

- **Frontend**: The `npm run build` command creates an optimized, minified production build of the React application in the `dist` folder.
- **Backend**: The Express server is configured to serve these static assets efficiently in production mode.

### Static File Serving

- **Configuration**: In production (`NODE_ENV=production`), the server uses `express.static` to serve files from the `dist` directory.
- **Fallback**: A catch-all route (`*`) ensures that React Router handles client-side routing correctly by serving `index.html` for unknown routes.
- **Trust Proxy**: The `trust proxy` setting is enabled in production to ensure rate limiting works correctly behind reverse proxies (like Nginx or Heroku).

---

**See also:**

- [Media Library](core-media.md) - SVG sanitization in media uploads
- [Custom Hooks](core-hooks.md) - Client-side sanitization in `useMediaUpload`
