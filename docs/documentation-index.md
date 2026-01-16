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

**Key topics**: Theme manifest, layout templates, widgets, global settings, menu rendering, asset management, export behavior

---

### **[theming-widgets.md](theming-widgets.md)** - Widget Authoring Guide

**Purpose**: Complete guide to creating widgets for themes **When to use**:

- Building new widgets from scratch
- Understanding widget file structure (schema.json + widget.liquid)
- Implementing design tokens and CSS patterns
- Working with typography and layout utilities
- Adding JavaScript interactivity to widgets
- Following accessibility best practices

**Key topics**: Widget structure, CSS design tokens, typography system, layout utilities, component patterns, JavaScript initialization, schema conventions, accessibility, blocks

---

### **[theming-setting-types.md](theming-setting-types.md)** - Setting Types Reference

**Purpose**: Comprehensive reference for all available setting types in theme.json and widget schemas **When to use**:

- Defining settings in theme.json global configuration
- Creating widget schemas with proper setting types
- Understanding setting properties and behaviors
- Implementing CSS variable output

**Key topics**: Setting types (color, text, range, select, etc.), common properties, CSS variable generation

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

**Key topics**: Project CRUD operations, active project management, state management, backend API endpoints

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

**Key topics**: Theme display, upload process, validation, theme switching

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

## 🔧 Troubleshooting

### **[troubleshooting-media-race-condition.md](troubleshooting-media-race-condition.md)** - Media Write Race Condition

**Purpose**: Diagnoses and resolves intermittent `ENOENT` errors during media file writes **When to use**:

- Encountering `ENOENT: no such file or directory, rename` errors in media operations
- Debugging concurrent file access issues during development (hot reload + autosave)
- Understanding file locking mechanisms and retry strategies

**Key topics**: Race condition analysis, lock order fixes, unique temp files, retry logic with exponential backoff, autosave interaction, development vs production considerations

---

## 🎯 Quick Reference by Role

### **Theme Developers**

Primary docs: `theming.md`, `theming-widgets.md`, `theming-setting-types.md` Secondary: `core-export.md`, `core-menus.md`

### **Frontend Developers**

Primary docs: `core-page-editor.md`, `core-projects.md`, `core-pages.md` Secondary: `core-media.md`, `core-appSettings.md`

### **Backend Developers**

Primary docs: `core-export.md`, `core-media.md`, `core-projects.md` Secondary: `core-pages.md`, `core-menus.md`, `core-appSettings.md`

### **System Architects**

Primary docs: `theming.md`, `core-projects.md`, `core-hooks.md` Secondary: All other documents for comprehensive understanding

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

### **[rules-comments.md](rules-comments.md)** - Code Comments Guidelines

**Purpose**: Guidelines for writing effective code comments that help new contributors understand complex logic **When to use**:

- Writing new code and deciding what to comment
- Reviewing code for comment quality
- Understanding when comments are helpful vs. noise
- Refactoring code with better documentation

**Key topics**: Comment philosophy, when to comment, explaining complex logic, anti-patterns, best practices

---

## 💻 Desktop Builds

### **[build-windows.md](build-windows.md)** - Windows Portable Build

**Purpose**: Step-by-step guide for creating the portable Windows distribution with system tray app **When to use**:

- Building the Windows desktop version
- Creating portable Windows distributions
- Understanding the Windows tray app (C#)

**Key topics**: Build process, portable Node.js, tray app compilation, packaging, distribution

---

### **[build-macos.md](build-macos.md)** - macOS Portable Build

**Purpose**: Step-by-step guide for creating the portable macOS distribution with menu bar app **When to use**:

- Building the macOS desktop version
- Creating portable macOS distributions
- Understanding the macOS menu bar app (Swift)

**Key topics**: Build process, portable Node.js, Swift app compilation, .app bundle, packaging, distribution

---

## 🔄 Maintenance Notes

- **theming.md** – Most comprehensive, covers theme system architecture.
- **theming-setting-types.md** – Reference document, stable API definitions.
- All other docs – Feature-specific implementation guides.

When adding new features, always update the relevant documentation **and** this index.
