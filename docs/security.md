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

### 3. HTTP Security Headers

- **What it is:** A collection of special HTTP headers are sent with every response from the server.
- **Why it's important:** These headers instruct the browser to enable its built-in security features, providing powerful protection against attacks like clickjacking, MIME-type sniffing, and cross-site scripting.
- **Implementation:** The `helmet` package is used as a global middleware to set these headers on all responses.

### 4. Cross-Origin Resource Sharing (CORS) Whitelist

- **What it is:** In a production environment, the server will only accept API requests from a specific, pre-approved domain.
- **Why it's important:** Prevents other websites from making unauthorized requests to your API, which could expose user data.
- **Implementation:** The `cors` package is configured to check the `NODE_ENV` environment variable.
  - In `production`, it only allows origins specified in the `PRODUCTION_URL` environment variable.
  - In `development`, it allows requests from `http://localhost:3000` for ease of local development.

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

## Area 3: Deployment & Performance

These are the final steps to get your app ready to be served to the world.

- [x] **Generate a Production Build of the Frontend**

  - **What it is:** Running the `npm run build` command for your React app.
  - **Why it's important:** The Vite development server (`npm run dev`) is not for production. The `build` command creates a super-optimized, minified, and fast version of your React app in a `dist` folder.
  - **Deep Dive Topic:** Run `npm run build` and explore the `dist` folder it creates to see how Vite packages your application.

- [x] **Configure Express to Serve Production React App**
  - **What it is:** Configuring your Express server to serve the built React app from the `dist` folder.
  - **Why it's important:** In production, your Node.js server must serve both your API and the main `index.html` file of your React app.
  - **Deep Dive Topic:** In `server/index.js`, add `app.use(express.static('dist'))` and a catch-all route `app.get('*', ...)` to send `dist/index.html` for any request that doesn't match an API route. This allows React Router to work correctly.
