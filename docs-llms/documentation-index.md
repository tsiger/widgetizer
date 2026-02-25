# Documentation Index & Reference Guide

This document serves as a comprehensive index to all documentation in the Widgetizer project. Use this guide to quickly find the appropriate documentation for your needs, whether you're developing, troubleshooting, or understanding system architecture.

---

## 📚 Core System Documentation

### **[theming.md](theming.md)** - Theme Development & Structure

**Purpose**: Complete guide to creating and customizing themes **When to use**:

- Building new themes from scratch
- Understanding theme structure and file organization
- Working with Liquid templates and widgets
- Implementing global components (header/footer)
- Managing theme assets and CSS variables
- Implementing scroll reveal animations

**Key topics**: Theme manifest, layout templates, widgets, global settings, menu rendering, asset management, scroll reveal animations, export behavior, theme presets

---

### **[theming-widgets.md](theming-widgets.md)** - Widget Authoring Guide

**Purpose**: Complete guide to creating widgets for themes **When to use**:

- Building new widgets from scratch
- Understanding widget file structure (schema.json + widget.liquid)
- Implementing design tokens and CSS patterns
- Working with typography and layout utilities
- Adding JavaScript interactivity to widgets
- Implementing scroll reveal animations
- Following accessibility best practices

**Key topics**: Widget structure, CSS design tokens, typography system, layout utilities, component patterns, JavaScript initialization, scroll reveal animations, schema conventions, accessibility, blocks

---

### **[theme-design-system.md](theme-design-system.md)** - Arch Theme Design System

**Purpose**: Complete reference for the Arch theme's visual design language, CSS custom properties, layout system, component patterns, and modifiers **When to use**:

- Understanding the Arch theme's design tokens and CSS variables
- Looking up spacing, typography, or color token values
- Understanding the color scheme system (standard/highlight)
- Working with layout containers, grids, and content width modifiers
- Using component classes (cards, buttons, forms, icons)
- Implementing scroll reveal animations
- Understanding the CSS variable pipeline from theme.json to rendered CSS
- Following widget template conventions

**Key topics**: Design tokens, color schemes, typography system, spacing scale, layout containers, grid system, card/button/form/icon components, block system, header/footer globals, utility classes, reveal animations, responsive breakpoints, CSS variable pipeline, widget conventions

---

### **[theming-setting-types.md](theming-setting-types.md)** - Setting Types Reference

**Purpose**: Comprehensive reference for all available setting types in theme.json and widget schemas **When to use**:

- Defining settings in theme.json global configuration
- Creating widget schemas with proper setting types
- Understanding setting properties and behaviors
- Implementing CSS variable output

**Key topics**: Setting types (color, text, range, select, etc.), common properties, CSS variable generation

---

### **[theme-updates.md](theme-updates.md)** - Theme Update System

**Purpose**: Documents the theme versioning and update system for distributing theme improvements to projects **When to use**:

- Understanding how theme updates work
- Publishing new theme versions
- Applying theme updates to projects
- Understanding which files are updated vs. protected

**Key topics**: Version folders, latest snapshot, update eligibility, settings merge, project update flow, developer tools

---

### **[theme-presets.md](theme-presets.md)** - Theme Presets

**Purpose**: Specification for theme preset variants that override settings and/or demo content **When to use**:

- Understanding how presets work (directory structure, fallback chain, settings overrides)
- Creating preset variants for themes
- Understanding the project creation flow with presets
- Working with the preset selection UI

**Key topics**: Preset registry, settings overrides, template/menu fallback chain, preset resolution, UI integration

---

### **[core-widgets.md](core-widgets.md)** - Core Widgets System

**Purpose**: Explains the built-in, theme-agnostic widgets that ship with Widgetizer **When to use**:

- Understanding which widgets are always available
- Learning how themes can opt-out via `useCoreWidgets`
- Adding new core widgets to the platform

**Key topics**: Spacer, Divider, opt-out flag, loading & rendering flow, file structure

---

## 🏛️ Platform Architecture

### **[core-security.md](core-security.md)** - Platform Security

**Purpose**: Outlines the core security measures protecting the application, its data, and users. **When to use**:

- Understanding the server's security layers
- Reviewing protection against common vulnerabilities
- Configuring the application for a production environment

**Key topics**: Rate Limiting, HTTP Security Headers, CORS Whitelisting, Input Validation, Global Error Handling, Environment Configuration

---

### **[core-ux.md](core-ux.md)** - Core UX Patterns & Audit

**Purpose**: Documents standard UX patterns, workflows, and implementation status **When to use**:

- Understanding standard user flows (creation, deletion, etc.)
- Checking implementation status of core features
- Implementing consistent UI behaviors (toasts, redirects)
- Reviewing UX guidelines (consistency, feedback, protection)

**Key topics**: Project/Page/Menu management workflows, toast notifications, redirect patterns, confirmation modals

---

### **[core-project-id-architecture.md](core-project-id-architecture.md)** - Project Identity System

**Purpose**: Explains the dual-identifier system (UUID vs FolderName) for projects **When to use**:

- Understanding how projects are identified and stored
- Implementing project renaming logic
- Working with filesystem paths vs API IDs
- Troubleshooting "project not found" errors

**Key topics**: UUID vs FolderName, controller implementation, filesystem organization, renaming workflows

---

## 🎨 Content Management

### **[core-projects.md](core-projects.md)** - Project Management System

**Purpose**: Complete workflow for project creation, management, and updates **When to use**:

- Understanding project lifecycle and data flow
- Implementing project-related features
- Troubleshooting project state management
- Working with the project store (Zustand)

**Key topics**: Project CRUD operations, active project management, state management, backend API endpoints, preset selection during creation

---

### **[core-pages.md](core-pages.md)** - Page Management System

**Purpose**: Page creation, editing, and management within projects **When to use**:

- Understanding page data structure and storage
- Implementing page-related functionality
- Working with page metadata and widgets
- Managing page routing and slugs

**Key topics**: Page JSON structure, CRUD operations, slug generation, widget integration

---

### **[core-page-editor.md](core-page-editor.md)** - Visual Page Editor

**Purpose**: Central page editing interface and component orchestration **When to use**:

- Understanding the page editor architecture
- Working with editor components and state management
- Implementing editor features and workflows
- Troubleshooting editor functionality

**Key topics**: Editor components, state management stores, widget selection, settings panels, auto-save

---

## 🗂️ Content Organization

### **[core-menus.md](core-menus.md)** - Navigation Menu System

**Purpose**: Menu creation, management, and hierarchical structure handling **When to use**:

- Building navigation systems
- Understanding menu data structure
- Implementing menu editing interfaces
- Working with nested menu items

**Key topics**: Menu JSON structure, drag-and-drop editing, backend API, file-based storage

---

### **[core-media.md](core-media.md)** - Media Library System

**Purpose**: File upload, storage, and media management **When to use**:

- Implementing file upload functionality
- Understanding media storage and metadata
- Working with image processing and thumbnails
- Managing media library interfaces
- Understanding usage tracking and deletion protection

**Key topics**: File storage, metadata management, upload workflows, thumbnail generation, bulk operations, usage tracking, deletion protection

---

## 🛠️ Theme & Content Distribution

### **[core-themes.md](core-themes.md)** - Theme Management Interface

**Purpose**: User interface for viewing and uploading themes **When to use**:

- Understanding theme upload and installation
- Working with theme preview cards
- Implementing theme management UI
- Troubleshooting theme installation

**Key topics**: Theme display, upload process, validation, theme switching, theme presets, preset API

---

### **[core-export.md](core-export.md)** - Static Site Export & Version Management

**Purpose**: Exporting projects to static HTML websites with comprehensive version control **When to use**:

- Understanding the export process and version management
- Working with static site generation
- Implementing export functionality and history tracking
- Managing export versions and storage limits
- Troubleshooting export issues

**Key topics**: Export workflow, version control system, asset copying, HTML generation, export history API, ZIP downloads, automatic cleanup, smart file detection

---

## ⚙️ Configuration & Settings

### **[core-appSettings.md](core-appSettings.md)** - Global Application Settings

**Purpose**: System-level configuration management **When to use**:

- Managing global application settings
- Understanding server-side setting enforcement
- Implementing setting validation
- Working with nested setting objects

**Key topics**: Global settings management, server-side validation, setting persistence

---

### **[core-hooks.md](core-hooks.md)** - Custom React Hooks

**Purpose**: Documentation for reusable React hooks used throughout the application **When to use**:

- Understanding confirmation modal patterns
- Implementing navigation protection
- Working with selection state management
- Building media management interfaces
- Creating consistent user interactions

**Key topics**: useConfirmationModal, useNavigationGuard, usePageSelection, media hooks, export hooks, app settings hooks

---

## 🗺️ Architecture & Reference

### **[core-architecture.md](core-architecture.md)** - Application Architecture

**Purpose**: Comprehensive documentation of the app's architecture across all major sections **When to use**:

- Understanding how frontend, queries, routes, controllers, and services connect
- Onboarding new developers to the codebase
- Planning refactoring or improvements
- Finding where specific functionality is implemented

**Key topics**: Projects, Pages, Menus, Media, Themes, Export, App Settings, Preview, Page Editor architecture; improvement opportunities

---

### **[core-database.md](core-database.md)** - Database & Storage Architecture

**Purpose**: Documents the SQLite schema, legacy JSON import path, and the hybrid storage model (DB metadata + filesystem content) **When to use**:

- Understanding where data is stored now
- Tracing legacy import behavior and compatibility wrappers
- Planning changes to repositories/controllers that touch persisted metadata

**Key topics**: Tables and relationships, migrations, import/backups, repository pattern, DB vs filesystem boundaries

---

## 🌐 Publisher Platform (Hosted Service)

The Publisher is the hosting platform built on Cloudflare Workers that hosts sites created with the open-source editor. Its documentation lives in the sibling `widgetizer-publisher/docs-llms/` directory.

### Key Publisher Docs (cross-reference)

| Document | What it covers |
|----------|---------------|
| `publisher/docs-llms/publisher.md` | Full API reference — endpoints, database, deployment |
| `publisher/docs-llms/publisher-analytics.md` | Analytics system — separate worker (`analytics.widgetizer.org`), Cloudflare Analytics Engine, event schema, privacy posture, snippet auto-injection |
| `publisher/docs-llms/forms.md` | Form submissions — tokens, Turnstile, email notifications |
| `publisher/docs-llms/pricing.md` | Tier definitions and feature limits |

### How Analytics Connects to the Editor

The open-source editor does **not** contain any analytics code. When a user exports a site and uploads it to Publisher (or publishes via the hosted editor), the Publisher API **auto-injects** a lightweight tracking snippet (`<script data-widgetizer-analytics="1" ...>`) into all HTML files during upload/deploy. This means:

- Open-source users get analytics automatically on Publisher with zero configuration.
- The editor's export pipeline does not need to know about analytics.
- Users can disable auto-injection or revoke the analytics token from the Publisher dashboard.

See `publisher/docs-llms/publisher-analytics.md` for the full architecture and event schema.

---

## 🎯 Quick Reference by Role

### **Theme Developers**

Primary docs: `theming.md`, `theming-widgets.md`, `theming-setting-types.md`, `theme-updates.md`, `theme-presets.md` Secondary: `core-export.md`, `core-menus.md`

### **Frontend Developers**

Primary docs: `core-page-editor.md`, `core-projects.md`, `core-pages.md` Secondary: `core-media.md`, `core-appSettings.md`

### **Backend Developers**

Primary docs: `core-export.md`, `core-media.md`, `core-projects.md` Secondary: `core-pages.md`, `core-menus.md`, `core-appSettings.md`

### **System Architects**

Primary docs: `theming.md`, `core-projects.md`, `core-hooks.md`, `core-architecture.md` Secondary: All other documents for comprehensive understanding

### **Content Managers / End-Users**

Primary docs: `core-themes.md`, `core-page-editor.md` Secondary: `core-media.md`, `core-menus.md`

---

## 📖 Documentation Standards

1. **Structure** – Each document includes overview, implementation details, and workflows.
2. **Code Examples** – Practical examples with proper syntax highlighting.
3. **API References** – Complete endpoint documentation with parameters.
4. **File Paths** – Exact file locations for reference.
5. **Cross-References** – Links to related docs where applicable.

---

## 🎨 Code Quality & Standards

### **[beta-testing-script.md](beta-testing-script.md)** - Beta Testing Checklist

**Purpose**: End-to-end manual validation checklist for core product workflows **When to use**:

- Running a full regression pass before release
- Validating project/theme/media/export workflows manually
- Coordinating beta testing with explicit pass/fail checklists

**Key topics**: Core flow scenarios, expected results, edge-case checks, release readiness validation

---

## 💻 Desktop Builds

### **[core-electron.md](core-electron.md)** - Electron Desktop App

**Purpose**: Guide for developing, building, and distributing the Electron desktop application **When to use**:

- Running Electron in development mode
- Building production distributions for macOS and Windows
- Understanding runtime paths and app packaging
- Code signing and distribution

**Key topics**: Development workflow, production build, runtime paths, app icons, distribution, code signing

---

## 🔄 Maintenance Notes

- **theming.md** – Most comprehensive, covers theme system architecture.
- **theming-setting-types.md** – Reference document, stable API definitions.
- All other docs – Feature-specific implementation guides.

When adding new features, always update the relevant documentation **and** this index.
