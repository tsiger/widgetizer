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
  - A stricter, general limit for most API endpoints.
  - A more lenient limit for editor-related endpoints (`/api/projects`, `/api/pages`, etc.) to accommodate their higher request volume during content creation.

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

### 5. Global Error Handling

- **What it is:** A catch-all "safety net" middleware that handles any unexpected errors that occur within the application.
- **Why it's important:** Prevents the server from crashing due to unhandled exceptions. It also ensures that sensitive error details (like stack traces) are not leaked to the client in a production environment.
- **Implementation:** A custom error-handling middleware is registered as the final middleware in `server/index.js`.

## ⚙️ Configuration & Monitoring

### Environment Variables (`.env`)

Sensitive configuration and environment-specific settings are stored in a `.env` file, which is kept out of version control. Key variables include:

- `NODE_ENV`: Controls whether the application runs in `development` or `production` mode.
- `PRODUCTION_URL`: The whitelisted domain for CORS in production.
- `VITE_API_URL`: The URL for the backend API, used by the frontend.

### Request Logging

- **What it is:** All incoming API requests are logged to a file.
- **Purpose:** This is primarily for development and debugging, allowing developers to monitor API traffic and analyze request patterns.
- **Implementation:** A custom middleware logs the timestamp, method, and URL of every request to `logs/api-requests.log`. This directory is excluded from version control and development server hot-reloading.

## ⚙️ Deployment Security

### Production Build

- **Frontend**: The `npm run build` command creates an optimized, minified production build of the React application in the `dist` folder.
- **Backend**: The Express server is configured to serve these static assets efficiently in production mode.

### Static File Serving

- **Configuration**: In production (`NODE_ENV=production`), the server uses `express.static` to serve files from the `dist` directory.
- **Fallback**: A catch-all route (`*`) ensures that React Router handles client-side routing correctly by serving `index.html` for unknown routes.
- **Trust Proxy**: The `trust proxy` setting is enabled in production to ensure rate limiting works correctly behind reverse proxies (like Nginx or Heroku).
