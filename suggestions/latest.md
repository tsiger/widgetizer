# Production Readiness Assessment & Suggestions

_Generated: 2024_ _Scope: All components except `PageEditor.jsx` and its sub-components_

This document provides a candid assessment of the current codebase organized by production readiness level, with actionable suggestions for each component.

---

## 🟢 Production Ready - Minor Adjustments Only

These components are solid and just need polish before shipping.

### Layout & Shell Components

**Files**: `src/components/layout/*`

- **Status**: Solid, small, stateless components
- **Suggestions**:
  - Add accessibility audit pass (ARIA labels, keyboard navigation)
  - Visual QA for responsive breakpoints
  - Add loading states for dynamic content areas

### Generic UI Library

**Files**: `src/components/ui/*`

- **Status**: Consistent API, accepts props spread properly
- **Suggestions**:
  - Set up Storybook for component documentation
  - Add snapshot tests to prevent visual regression
  - Audit for consistent prop naming patterns

### Media Library System

**Files**: `Media.jsx` + hooks (`useMediaState`, `useMediaUpload`, `useMediaSelection`, `useMediaMetadata`)

- **Status**: Freshly refactored with clean architecture
- **Suggestions**:
  - Add drag-and-drop keyboard support for accessibility
  - Write comprehensive unit tests for the four hooks
  - Add error boundaries for upload failures
  - Consider adding bulk upload progress aggregation

### Export System

**Files**: `ExportSite.jsx`, `ExportCreator.jsx`, `ExportHistoryTable.jsx`, `useExportState.js`

- **Status**: Works cross-platform after Windows path fix
- **Suggestions**:
  - Add throttling on export history polling
  - Implement server-side streaming for export progress events
  - Add export size estimation before generation
  - Consider adding export templates/presets

### App Settings System

**Files**: `AppSettings.jsx`, `AppSettingsPanel.jsx`, `useAppSettings.js`, JSON schema

- **Status**: Clean, isolated architecture with schema-driven configuration
- **Suggestions**:
  - Add field-level validation error UI
  - Implement optimistic save states
  - Add settings backup/restore functionality
  - Consider adding settings migration system for updates

### Theme Settings

**Files**: `Settings.jsx`, `SettingsPanel.jsx`

- **Status**: Battle-tested and stable
- **Suggestions**:
  - Sync visual styling with latest Tailwind design tokens
  - Add setting search/filter functionality
  - Consider adding setting groups collapse/expand

### Menu Management System

**Files**: `MenuEditor.jsx`, `MenuForm.jsx`, routes/controllers

- **Status**: Sophisticated drag-and-drop implementation with @dnd-kit, well-architected with performance optimizations
- **Suggestions**:
  - Extract complex logic into `useMenuEditor` hook for better testability
  - Add unit tests for drag/drop operations and nested item logic
  - Add visual indicators for valid drop zones during drag operations
  - Consider adding undo/redo functionality for menu operations
  - Add menu validation and error handling for malformed data

---

## 🟡 Works But Needs Major Refactor

These components function but have architectural issues that should be addressed.

### Project & Page CRUD Screens

**Files**: `Projects*.jsx`, `Pages*.jsx`

- **Issues**: Repetitive boilerplate, inline fetch logic
- **Suggestions**:
  - Extract generic `useCrudResource` hook
  - Create reusable table/form components
  - Standardize loading and error states
  - Add bulk operations (delete, export)
  - Implement proper pagination for large datasets

### Zustand Stores

**Files**: `pageStore.js`, `projectStore.js`, `widgetStore.js`, `themeStore.js`, `toastStore.js`

- **Issues**: Contain side-effects, duplication, no middleware
- **Suggestions**:
  - Introduce zustand middleware:
    - `persist` for localStorage integration
    - `immer` for immutable updates
    - `subscribeWithSelector` for fine-grained subscriptions
  - Co-locate actions with feature folders
  - Add store devtools integration
  - Implement proper error handling in stores
  - Consider migrating to Tanstack Query for server state

### Backend Controllers

**Files**: `server/controllers/*` (8 controllers)

- **Issues**: Nearly identical CRUD patterns, no validation, mixed async patterns
- **Suggestions**:
  - Create `BaseController` class with common CRUD operations
  - Adopt **Joi** or **Zod** for request validation
  - Standardize error response format
  - Add request/response logging middleware
  - Implement proper HTTP status codes
  - Add rate limiting per endpoint

### Utility Managers

**Files**: `*Manager.js` files

- **Issues**: Mix IO operations with business logic
- **Suggestions**:
  - Split into:
    1. Pure service layer (business logic)
    2. Thin data access utilities (file system operations)
  - Add dependency injection for testability
  - Implement proper error handling and logging
  - Consider adding caching layer for frequently accessed data

---

## 🟠 Not Production Ready

These components have significant issues that prevent production deployment.

### Preview Runtime

**Files**: `previewRuntime.js`, iframe messaging

- **Issues**: Race conditions on widget reloads, no CSP protection
- **Suggestions**:
  - Switch to postMessage handshake protocol
  - Add feature flags for preview capabilities
  - Implement debounced widget diffing
  - Add Content Security Policy headers
  - Handle iframe load failures gracefully
  - Add preview timeout handling

### Theme & Widget Loading

**Files**: `themeManager.js`, `widgetStore.js` dynamic imports

- **Issues**: Missing error boundaries, no fallback UI for broken Liquid widgets
- **Suggestions**:
  - Wrap dynamic imports in React.lazy + Suspense
  - Add widget error boundary with reset capability
  - Implement widget validation before rendering
  - Add fallback components for broken widgets
  - Create widget development mode with better error reporting

### Auto-save Infrastructure

**Files**: `saveStore.js`, `useAutoSave`

- **Issues**: setInterval-based, no backoff, can overwhelm API when offline
- **Suggestions**:
  - Migrate to `navigator.onLine` aware system
  - Implement exponential backoff for failed saves
  - Add request queue with conflict resolution
  - Implement proper change detection (deep diff)
  - Add save conflict resolution UI
  - Consider operational transforms for concurrent editing

### Server-side Upload Handling

**Files**: Media upload controllers, multer configuration

- **Issues**: Validation only in controller, missing middleware, no streaming for large files
- **Suggestions**:
  - Move limits to dedicated `uploadLimiter` middleware
  - Implement streaming uploads to temporary directory
  - Add virus scanning integration
  - Implement chunked upload for large files
  - Add upload resume capability
  - Proper cleanup of failed/abandoned uploads

---

## 🔴 Don't Even Think About Shipping

These components are incomplete, broken, or security risks.

### Page Editor POC Documentation

**Files**: `docs/page-editor-poc.md`

- **Issues**: Exploratory markdown doc, no corresponding implementation
- **Suggestions**:
  - Remove to avoid confusion
  - OR clearly mark as "Future Vision" document
  - Move to separate planning folder if keeping

### Legacy Widget Artifacts

**Files**: `core/widgets/spacer/` (empty folder)

- **Issues**: Empty placeholder, webpack will include and waste bytes
- **Suggestions**:
  - Remove empty folder
  - OR complete the spacer widget implementation
  - Clean up any other empty widget folders

### Configuration Security

**Files**: `server/config.js`

- **Issues**: Logs JWT secret, uses absolute `/tmp` paths
- **Suggestions**:
  - Move ALL secrets to environment variables
  - Set up dotenv for development
  - Fail fast when required environment variables are missing
  - Add configuration validation on startup
  - Use relative paths or configurable temp directories

### Testing Infrastructure

**Files**: Currently ~0% test coverage

- **Issues**: No unit tests, only ESLint in CI
- **Suggestions**:
  - Set up Vitest/Jest testing framework
  - Add smoke tests for every critical hook and controller
  - Implement integration tests for API routes
  - Add Cypress for end-to-end happy path testing
  - Set up test coverage reporting and thresholds

---

## Global Improvement Priorities

### 1. Testing Strategy

- **Unit Tests**: All hooks, utilities, and pure functions
- **Integration Tests**: API routes and database operations
- **E2E Tests**: Critical user journeys with Cypress
- **Coverage**: Aim for 80%+ on business logic

### 2. Observability & Monitoring

- **Server Logging**: winston/pino with structured logging
- **Client Monitoring**: Sentry for error tracking
- **Performance**: Add Core Web Vitals monitoring
- **Analytics**: User interaction tracking for product decisions

### 3. CI/CD Pipeline

- **GitHub Actions workflow**:
  1. Lint (ESLint + Prettier)
  2. Type check (if adding TypeScript)
  3. Test (unit + integration)
  4. Build (Vite production build)
  5. Docker image creation
  6. Deployment automation

### 4. Security Hardening

- **Express Security**: Helmet middleware for security headers
- **Rate Limiting**: Per-IP and per-user limits
- **Input Validation**: All body/query parameters
- **Dependency Audits**: Weekly npm audit + Snyk scanning
- **CSRF Protection**: For state-changing operations

### 5. Documentation Maintenance

- **Keep `/docs` current**: Update during refactors
- **Architecture Decision Records**: Document major technical decisions
- **API Documentation**: OpenAPI/Swagger for backend routes
- **Deployment Guide**: Production setup and maintenance

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

1. Set up testing infrastructure
2. Fix security configuration issues
3. Add basic error boundaries and logging

### Phase 2: Stability (Week 3-4)

1. Refactor auto-save system
2. Add proper error handling to preview runtime
3. Implement request validation on backend

### Phase 3: Architecture (Week 5-8)

1. Refactor Zustand stores with middleware
2. Extract CRUD patterns into reusable hooks/controllers
3. Modularize menu management system

### Phase 4: Polish (Week 9-12)

1. Enhanced testing coverage
2. Performance optimizations
3. Accessibility improvements
4. CI/CD pipeline completion

This roadmap provides a clear path from current state to production-ready application while maintaining feature development velocity.
