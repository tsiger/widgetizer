# Documentation Index & Reference Guide

This document serves as a comprehensive index to all documentation in the Widgetizer project. Use this guide to quickly find the appropriate documentation for your needs, whether you're developing, troubleshooting, or understanding system architecture.

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

### **[theme-settings.md](theme-settings.md)** - Setting Types Reference

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

## 🎨 Content Management

### **[projects.md](projects.md)** - Project Management System

**Purpose**: Complete workflow for project creation, management, and updates **When to use**:

- Understanding project lifecycle and data flow
- Implementing project-related features
- Troubleshooting project state management
- Working with the project store (Zustand)

**Key topics**: Project CRUD operations, active project management, state management, backend API endpoints

---

### **[pages.md](pages.md)** - Page Management System

**Purpose**: Page creation, editing, and management within projects **When to use**:

- Understanding page data structure and storage
- Implementing page-related functionality
- Working with page metadata and widgets
- Managing page routing and slugs

**Key topics**: Page JSON structure, CRUD operations, slug generation, widget integration

---

### **[page-editor.md](page-editor.md)** - Visual Page Editor

**Purpose**: Central page editing interface and component orchestration **When to use**:

- Understanding the page editor architecture
- Working with editor components and state management
- Implementing editor features and workflows
- Troubleshooting editor functionality

**Key topics**: Editor components, state management stores, widget selection, settings panels, auto-save

---

### **[page-editor-poc.md](page-editor-poc.md)** - Real-Time Updates POC ⚠️ **NOT IMPLEMENTED**

**Purpose**: ⚠️ **THEORETICAL DESIGN ONLY** - Technical design proposal for implementing real-time visual updates in the page editor **⚠️ WARNING**: This document describes functionality that **HAS NOT BEEN IMPLEMENTED**. Do not reference for current system capabilities.

**When to use**:

- **DO NOT USE** for understanding current functionality
- Reference only for potential future development planning
- Understanding theoretical approaches to real-time updates

**Key topics**: ⚠️ **CONCEPTUAL ONLY** - PostMessage communication, DOM updates, setting classification, update strategies

---

## 🗂️ Content Organization

### **[menus.md](menus.md)** - Navigation Menu System

**Purpose**: Menu creation, management, and hierarchical structure handling **When to use**:

- Building navigation systems
- Understanding menu data structure
- Implementing menu editing interfaces
- Working with nested menu items

**Key topics**: Menu JSON structure, drag-and-drop editing, backend API, file-based storage

---

### **[media.md](media.md)** - Media Library System

**Purpose**: File upload, storage, and media management **When to use**:

- Implementing file upload functionality
- Understanding media storage and metadata
- Working with image processing and thumbnails
- Managing media library interfaces

**Key topics**: File storage, metadata management, upload workflows, thumbnail generation, bulk operations

---

## 🛠️ Theme & Content Distribution

### **[themes.md](themes.md)** - Theme Management Interface

**Purpose**: User interface for viewing and uploading themes **When to use**:

- Understanding theme upload and installation
- Working with theme preview cards
- Implementing theme management UI
- Troubleshooting theme installation

**Key topics**: Theme display, upload process, validation, theme switching

---

### **[export.md](export.md)** - Static Site Export

**Purpose**: Exporting projects to static HTML websites **When to use**:

- Understanding the export process
- Working with static site generation
- Implementing export functionality
- Troubleshooting export issues

**Key topics**: Export workflow, asset copying, HTML generation, path optimization

---

## ⚙️ Configuration & Settings

### **[app-settings.md](app-settings.md)** - Global Application Settings

**Purpose**: System-level configuration management **When to use**:

- Managing global application settings
- Understanding server-side setting enforcement
- Implementing setting validation
- Working with nested setting objects

**Key topics**: Global settings management, server-side validation, setting persistence

---

## 🎯 Quick Reference by Role

### **Theme Developers**

Primary docs: `theming.md`, `theme-settings.md` Secondary: `export.md`, `menus.md`

### **Frontend Developers**

Primary docs: `page-editor.md`, `projects.md`, `pages.md` Secondary: `media.md`, `app-settings.md` ⚠️ **Avoid**: `page-editor-poc.md` (not implemented)

### **Backend Developers**

Primary docs: `export.md`, `media.md`, `projects.md` Secondary: `pages.md`, `menus.md`, `app-settings.md`

### **System Architects**

Primary docs: `theming.md`, `projects.md` Secondary: All other documents for comprehensive understanding ⚠️ **Conceptual only**: `page-editor-poc.md` (design proposal, not implemented)

### **Content Managers / End-Users**

Primary docs: `themes.md`, `page-editor.md` Secondary: `media.md`, `menus.md`

---

## 📖 Documentation Standards

1. **Structure** – Each document includes overview, implementation details, and workflows.
2. **Code Examples** – Practical examples with proper syntax highlighting.
3. **API References** – Complete endpoint documentation with parameters.
4. **File Paths** – Exact file locations for reference.
5. **Cross-References** – Links to related docs where applicable.

---

## 🔄 Maintenance Notes

- **theming.md** – Most comprehensive, covers theme system architecture.
- **⚠️ page-editor-poc.md** – _NOT IMPLEMENTED_ – theoretical document only; do **not** reference for current functionality.
- **theme-settings.md** – Reference document, stable API definitions.
- All other docs – Feature-specific implementation guides.

When adding new features, always update the relevant documentation **and** this index.

### ⚠️ Important Warning About POC Documents

`page-editor-poc.md` contains conceptual designs that have **not** been implemented. Developers and LLMs must not rely on it for current functionality; use `page-editor.md` for the actual implementation.
