---
description: Manage collections in Widgetizer — theme-defined content types like News, Projects, and Services. Add, edit, and organize repeatable items.
---

Collections are content types your theme provides — things like **News**, **Projects**, **Services**, or **Team**. Each collection holds many **items** of the same shape (every news article has a title, date, and body; every project has a name, image, and description). You fill in the items; the theme decides how they look on your site.

# Where Collections Come From

Collections are defined by your **theme**, not created by hand. When a theme ships collection types, they appear in the sidebar — one entry per type (e.g. "News", "Projects"). If your theme doesn't define any collections, you won't see this section, and that's normal.

> **Note:** Because collections come from the theme, you can't add or remove collection *types* yourself — only the items inside them. This is similar to how [themes](themes.html) define which widgets are available.

# Adding an Item

1. Open the collection from the sidebar (e.g. **News**).
2. Click **"Add Item"** (or **"New Article"**, depending on the theme's labels).
3. Fill in the fields. These are defined by the theme — a news article might have Title, Publication Date, Excerpt, Featured Image, and Body.
4. Click **Save**.

The **Title** field (whichever field the theme marks as the title) also generates the item's web address. For example, an article titled "Summer Sale" is saved at `news/summer-sale`.

# Editing, Duplicating, and Deleting

From a collection's item list you can:

- **Edit** — click an item to open it, change fields, and save.
- **Duplicate** — make a copy to use as a starting point for a similar item.
- **Delete** — remove an item (with confirmation). You can also select several and delete them together.
- **Reorder** — when the theme uses manual ordering, drag items to set the order they appear on the site.

# Item Pages

Some collection types give each item its **own page** on your published site (for example, a full article page for each news item). Others are "list only" — their items appear in a grid or list somewhere but don't have standalone pages. This is set by the theme.

For types with item pages:

- **Preview** — once an item is saved, use the **Preview** button to see its page exactly as it will look on your site.
- **SEO settings** — like regular [pages](pages.html), each item has optional meta description, social title, social image, canonical URL, and indexing controls. These default to sensible values, so you only set them when you want to override.

# How Items Appear on Your Site

Your theme places collection content using its own widgets — for example a "News Grid" widget that lists recent articles, or a "Projects" gallery. Add that widget to a page in the editor and it pulls in your items automatically. The exact widgets available depend on your theme.

# Exporting

When you [export](export.html) your site, every item that has its own page becomes an HTML file (e.g. `news/summer-sale.html`) and is included in your `sitemap.xml`. List-only items are rendered wherever the theme's widgets display them. Your item content lives in your project files and is never touched by [theme updates](themes.html#theme-updates).
