# Widgetizer: Project Overview

Widgetizer is a powerful, yet simple, visual website builder designed to create high-performance static websites. Whether you're building a personal blog, a professional portfolio, or a business landing page, Widgetizer provides the tools to bring your vision to life without the complexity of traditional web development.

---

## 🌟 Core Philosophy

Widgetizer is built on two fundamental principles: **simplicity** and **portability**.

### 1. Hybrid Storage Architecture

Widgetizer uses a **hybrid model**:

- **SQLite metadata store** (`data/widgetizer.db`) for projects, media metadata/usage, app settings, and export history
- **Filesystem content store** for page JSON, menu JSON, global widgets, theme files, and uploaded media binaries

This gives fast relational lookups and safer concurrent writes without giving up portable project content folders.

### 2. Privacy & Portability

Because your site is just a collection of files, you own your data. You can easily move your entire project between folders, zip it up for backup, or share it with others. There's no "vendor lock-in."

---

## 🧩 Key Concepts

### Projects

A **Project** is a container for your website. It holds all the pages, images, menus, and design settings specific to that site. You can manage multiple projects simultaneously, switching between them with a single click.

### Themes

A **Theme** is a ready-made design package that defines the "look and feel" of your site. When you start a new project, you choose a theme as your foundation. You can then customize colors, typography, and other global styles to make it uniquely yours.

### Visual Editing with Widgets

Building pages in Widgetizer is as easy as arranging building blocks.

- **What is a Widget?** Widgets are the main building blocks of your page. Examples include a **Hero Banner**, a **Text Section**, a **Contact Form**, or a **Gallery**. Each widget is self-contained and comes with its own set of customization options (like background colors, alignment, and spacing).
- **What is a Block?** Blocks are smaller, flexible units _inside_ certain widgets. For example, if you have a "Features" widget, each individual feature is a **block**. This allows you to add as many features as you need, reorder them, or remove them without affecting the overall layout of the widget.

### Media Library

The **Media Library** is your central hub for images, videos, and audio files.

- **Automatic Optimization**: When you upload an image, Widgetizer automatically creates different sizes to ensure your site loads instantly on both mobile and desktop.
- **Usage Tracking**: The system knows exactly which page is using which image, protecting you from accidentally deleting something that's currently live on your site.

### Navigation Menus

Easily manage your site's navigation through a simple drag-and-drop interface. Create hierarchical menus (with sub-menus) and link them to your pages with ease.

---

## 🔄 The Workflow: From Idea to Live Site

Working with Widgetizer follows a simple, three-step journey:

1.  **Create**: Start a new project by choosing a theme that fits your needs.
2.  **Build**: Use the visual editor to add widgets, customize their settings, and fill them with your content. Arrange blocks within widgets to create dynamic layouts.
3.  **Publish**: When yours site is ready, use the **Export** feature. Widgetizer converts your project into a collection of fast, secure, static HTML files.

---

## 🚀 Why Widgetizer?

- **Speed**: Static sites are naturally faster than dynamic ones.
- **Security**: Without a database or server-side processing on the final site, there are fewer "moving parts" for hackers to target.
- **Simplicity**: Focus on content and design without worrying about technical stacks or server maintenance.
- **Control**: Your data stays in your files, exactly where it belongs.
