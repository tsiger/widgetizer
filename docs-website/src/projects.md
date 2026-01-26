In Widgetizer, a **Project** is a container for your entire website. Each project holds all your pages, images, menus, and design settings. You can create and manage multiple projects, switching between them as needed.

# Understanding the Active Project

At any given time, one project is marked as **active**. This is the project you're currently working on. When you open the page editor or media library, you'll be working within the active project.

> **Important:** Your first project is automatically set as active when you create it.


# Creating a New Project

1. Click the **"New Project"** button
2. Fill in the project details:
   - **Project Name** (required): The name of your project
   - **Description** (optional): A brief description of what this project is for
   - **Theme** (required): Choose a design theme for your project
   - **Site URL** (optional): The base URL where your site will be hosted (e.g., `https://example.com`)
3. Click **"Create Project"**

### Understanding the Fields

- **Project Name**: This is displayed throughout Widgetizer and also determines your project's folder name. For example, "My Awesome Site" becomes a folder named `my-awesome-site`.
- **Description**: Helps you remember what each project is for, especially if you're managing multiple projects.
- **[Theme](themes.html)**: Defines the look and feel of your site. **Note:** You cannot change the theme after creating a project, so choose carefully!
- **Site URL**: The base URL where your site will be hosted (e.g., `https://example.com`). This is used for:
  - Generating absolute URLs in social media tags and SEO
  - **Automatically creating `sitemap.xml`** when you export your site
  - **Automatically creating `robots.txt`** with sitemap location when you export your site
  - If you're not sure yet, you can leave this empty and add it later. Note that sitemap and robots.txt will only be generated if you set a Site URL.


# Editing a Project

1. Go to the **Projects** page
2. Find your project in the list
3. Click the **pencil icon** (Edit)
4. Update the fields you want to change
5. Click **"Save Changes"**

### What You Can Edit

- **Project Name**: If you change this, the project folder will automatically be renamed
- **Description**: Update this anytime
- **Site URL**: Add or change your site's base URL
- **Theme**:  Cannot be changed after creation

### Project Folder Renaming

When you change a project's name, Widgetizer automatically renames the project folder in the background. For example:

- Original name: "My Site" → Folder: `my-site`
- New name: "My Amazing Site" → Folder: `my-amazing-site`

You don't need to do anything special—this happens automatically when you save your changes.


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
