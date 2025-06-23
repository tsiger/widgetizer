# Security & Deployment Readiness Roadmap

This document outlines the key areas to focus on when preparing the application for a production environment. Each item is a "deep dive" topic for exploration.

## Area 1: Backend Security

This is the most critical area for protecting your application and its users.

- [x] **Implement Input Sanitization & Validation**

  - **What it is:** Checking and cleaning any data sent from the frontend (`req.body`, `req.params`) _before_ you use it. Validation ensures required fields exist (e.g., a project `name` isn't empty). Sanitization cleans the data to prevent malicious code from being stored.
  - **Why it's important:** Your primary defense against users submitting bad data and preventing attacks like Cross-Site Scripting (XSS).
  - **Deep Dive Topic:** Explore the `express-validator` library to create validation chains for your API routes.

- [x] **Add API Rate Limiting**

  - **What it is:** Limiting how many times a single IP address can hit your API endpoints in a given amount of time (e.g., 100 requests per minute).
  - **Why it's important:** Prevents a single user or an attacker from overwhelming your server with requests, which could crash it or rack up costs.
  - **Deep Dive Topic:** Use the `express-rate-limit` package as global middleware in `server/index.js` to apply a general limit to all `/api/*` routes.

- [x] **Set HTTP Security Headers**

  - **What it is:** A set of special headers sent with every server response that tell the browser to enable extra security features.
  - **Why it's important:** An easy, powerful way to protect against a wide range of common attacks like clickjacking and cross-site scripting.
  - **Deep Dive Topic:** Use the `helmet` package. A strong layer of security can be added by simply using `app.use(helmet());` in `server/index.js`.

- [x] **Configure CORS Whitelisting for Production**
  - **What it is:** Configuring the `cors` package to only allow API requests from your specific website domain, rather than from anywhere.
  - **Why it's important:** Prevents other websites from making requests to your API on behalf of their users.
  - **Deep Dive Topic:** In `server/index.js`, change `app.use(cors())` to `app.use(cors({ origin: 'https://your-production-domain.com' }))` when in production mode.

## Area 2: Reliability & Configuration

These steps ensure your server is stable and easy to configure.

- [x] **Create a Global Error Handler**

  - **What it is:** A special Express middleware that acts as a "catch-all" for any unexpected errors that happen in your controllers.
  - **Why it's important:** Prevents your server from crashing. Instead, this middleware will catch the error and send a clean, generic "500 Internal Server Error" message to the client.
  - **Deep Dive Topic:** Create a global error-handling middleware function in `server/index.js`. It's a function that takes four arguments: `(err, req, res, next)`.

- [x] **Expand Use of Environment Variables (`.env`)**
  - **What it is:** Storing configuration (secrets, ports, database URLs) outside of your code. You are already using this for `PORT`.
  - **Why it's important:** Security (never commit secrets to Git) and flexibility.
  - **Deep Dive Topic:** Add a `NODE_ENV=development` variable and check for `process.env.NODE_ENV === 'production'` in your code to enable production-only settings, like the CORS whitelist.

## Area 3: Deployment & Performance

These are the final steps to get your app ready to be served to the world.

- [ ] **Generate a Production Build of the Frontend**

  - **What it is:** Running the `npm run build` command for your React app.
  - **Why it's important:** The Vite development server (`npm run dev`) is not for production. The `build` command creates a super-optimized, minified, and fast version of your React app in a `dist` folder.
  - **Deep Dive Topic:** Run `npm run build` and explore the `dist` folder it creates to see how Vite packages your application.

- [ ] **Configure Express to Serve Production React App**
  - **What it is:** Configuring your Express server to serve the built React app from the `dist` folder.
  - **Why it's important:** In production, your Node.js server must serve both your API and the main `index.html` file of your React app.
  - **Deep Dive Topic:** In `server/index.js`, add `app.use(express.static('dist'))` and a catch-all route `app.get('*', ...)` to send `dist/index.html` for any request that doesn't match an API route. This allows React Router to work correctly.
