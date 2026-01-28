---
description: Learn how to create, manage, and organize projects in Widgetizer. Each project contains all pages, media, menus, and settings for a website.
---

In Widgetizer, a **Project** is a container for your entire website. Each project holds all your pages, images, menus, and design settings. You can create and manage multiple projects, switching between them as needed.

# Understanding the Active Project

At any given time, one project is marked as **active**. This is the project you're currently working on. When you open the page editor or media library, you'll be working within the active project.

> **Important:** Your first project is automatically set as active when you create it.


# Creating a New Project

1. Click the **"New Project"** button
2. Fill in the project details:
   - **Title** (required): The display name for your project
   - **Theme** (required): Choose a design theme for your project
3. Expand **"More settings"** to configure additional options:
   - **Folder Name** (required): Auto-generated from the title, but you can customize it
   - **Notes** (optional): Personal notes about the project for your own reference
   - **Website Address** (optional): The URL where your site will be hosted
4. Click **"Create Project"**

### Understanding the Fields

- **Title**: The display name shown throughout Widgetizer.
- **[Theme](themes.html)**: Defines the look and feel of your site. **Note:** You cannot change the theme after creating a project, so choose carefully!
- **Folder Name**: The folder where your project files are stored and exported. This is automatically generated from the title as a URL-friendly slug (e.g., "My Site" becomes `my-site`).
- **Notes**: Personal notes for your own reference. Useful for remembering what each project is for.
- **Website Address**: The base URL where your site will be hosted (e.g., `https://example.com`). This is used for:
  - Generating absolute URLs in social media tags and SEO
  - **Automatically creating `sitemap.xml`** when you export your site
  - **Automatically creating `robots.txt`** with sitemap location when you export
  - If you're not sure yet, you can leave this empty and add it later.


# Editing a Project

1. Go to the **Projects** page
2. Find your project in the list
3. Click the **pencil icon** (Edit)
4. Update the fields you want to change
5. Click **"Save Changes"**

### What You Can Edit

- **Title**: The display name shown throughout Widgetizer
- **Folder Name**: The folder where your project files are stored (can be changed independently of the title)
- **Notes**: Personal notes about your project
- **Website Address**: The base URL for your site
- **Theme**: Cannot be changed after creation


# Setting the Active Project

To switch which project you're working on:

1. Go to the **Projects** page
2. Find the project you want to work on
3. Click the **star icon** next to the project name

The active project will have a pink "Active" badge and a filled star icon.

> **Note:** You can only have one active project at a time. Setting a new project as active automatically deactivates the previous one.


# Deleting a Project

1. Go to the **Projects** page
2. Find the project you want to delete
3. Click the **trash icon** (Delete)
4. Confirm the deletion in the popup

### Important Notes

-  **You cannot delete the active project**. If you want to delete it, first set another project as active.
-  **Deletion is permanent**. All pages, media, and settings for that project will be removed.
- Consider exporting your project as a backup before deleting it.


# Other Project Actions

### Duplicating a Project

Want to create a copy of a project? Click the **copy icon** next to any project. This creates an exact duplicate with all pages, settings, and media.

### Exporting a Project

You can export any project as a ZIP file for backup or to transfer to another Widgetizer installation. Click the **export icon** to download a copy of your project.

> **Note:** This is different from site exporting. Project export creates a backup ZIP, while [site export](export.html) generates deployable HTML files.

### Importing a Project

To import a previously exported project, click **"Import Project"** and select the ZIP file. The imported project will appear in your projects list with a new name to avoid conflicts.


# Theme Updates for Projects

When a theme author releases an update, projects using that theme can receive the improvements.

### Identifying Projects with Available Updates

- Projects with available theme updates show an **arrow icon** in the project list
- The project card indicates the current version and the available version

### Applying a Theme Update

1. Go to the **Projects** page
2. Find the project with the update indicator
3. Click **Edit** to open the project settings
4. Click **"Apply Theme Update"**
5. The system updates your theme files while preserving your content

### What's Updated vs. Protected

**Updated:**
- Layout template, widgets, assets, snippets
- Theme settings schema (new settings are added)

**Protected (never changed):**
- Your pages and content
- Your media files
- Your existing menus and templates
- Your customized theme settings values

For more details on theme updates, see [Themes](themes.html#theme-updates).
