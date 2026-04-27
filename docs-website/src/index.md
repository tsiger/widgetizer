---
description: Widgetizer is a visual website builder for creating high-performance static websites. Your content lives in human-readable files, and the published site is pure static HTML.
---

Widgetizer is a powerful, yet simple, visual website builder designed to create high-performance static websites. It is specifically built for creating small websites, providing the tools to bring your vision to life without the complexity of traditional web development.

# Core Philosophy

Widgetizer is built on two fundamental principles: **simplicity** and **portability**.

### 1. File-Based Content

Your page content, global widgets (header/footer), menus, theme files, and uploaded media all live as plain files inside your project folder. Page content is stored as readable JSON, themes are normal Liquid templates, and uploads are the original binaries you put in. A small local SQLite database (`data/widgetizer.db`) tracks editor metadata such as the project list, media metadata and usage, app settings, and export history — but the content itself is always on disk.

### 2. Privacy & Static Output

You own your data: it stays on your machine, in files you can read. When you publish, Widgetizer exports your project to a folder of static HTML, CSS, JS, and assets — no database, no server-side processing, no vendor lock-in. Drop the export onto any static host and you're live.

# Key Concepts

### Projects

A [Project](projects.html) is a container for your website. It holds all the pages, images, menus, and design settings specific to that site. You can manage multiple projects simultaneously, switching between them with a single click.

### Themes

A [Theme](themes.html) is a ready-made design package that defines the "look and feel" of your site. When you start a new project, you choose a theme as your foundation. You can then customize colors, typography, and other global styles to make it uniquely yours.

### Visual Editing with Widgets

Building pages in Widgetizer is as easy as arranging building blocks.

- **What is a Widget?** Widgets are the main building blocks of your page. Examples include a **Hero Banner**, a **Text Widget**, a **Gallery**, or a **Video Popup**. Each widget is self-contained and comes with its own set of customization options (like background colors, alignment, and spacing).
- **What is a Block?** Blocks are smaller, flexible units _inside_ certain widgets. For example, if you have a "Features" widget, each individual feature is a **block**. This allows you to add as many features as you need, reorder them, or remove them without affecting the overall layout of the widget.

### Media Library

The [Media Library](media.html) is your central hub for images.

- **Automatic Optimization**: When you upload an image, Widgetizer automatically creates different sizes to ensure your site loads instantly on both mobile and desktop.
- **Usage Tracking**: The system knows exactly which page is using which image, protecting you from accidentally deleting something that's currently live on your site.

### Navigation Menus

Easily manage your site's [navigation menus](menus.html) through a simple drag-and-drop interface. Create hierarchical menus (with sub-menus) and link them to your pages with ease.

# The Workflow: From Idea to Live Site

Working with Widgetizer follows a simple, three-step journey:

1.  **Create**: Start a new project by choosing a theme that fits your needs.
2.  **Build**: Use the visual editor to add widgets, customize their settings, and fill them with your content. Arrange blocks within widgets to create dynamic layouts.
3.  **Publish**: When your site is ready, use the [Export](export.html) feature. Widgetizer converts your project into a collection of fast, secure, static HTML files.

# Why Widgetizer?

- **Speed**: Static sites are naturally faster than dynamic ones.
- **Security**: The exported site has no database or server-side processing, so there are fewer "moving parts" for hackers to target.
- **Simplicity**: Focus on content and design without worrying about technical stacks or server maintenance.
- **Control**: Your data stays on your machine, in files you can read.
