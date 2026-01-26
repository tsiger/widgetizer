---
description: Create and manage pages in Widgetizer. Configure page settings, SEO metadata, social sharing images, and organize your website structure.
---

Pages are the individual sections of your website. Each page can have its own content, layout, and SEO settings. You'll use the page editor to add widgets and build your content, but first you need to create the pages themselves.


# Creating a New Page

1. Click the **"New Page"** button
2. Fill in the page details (see field explanations below)
3. Click **"Create Page"**

### Page Fields

#### Title

The title shown in the browser tab and search results. If left empty, your page name will be used.

#### Filename

The name of the HTML file that will be created when you export your site. For example:

- `index` becomes `index.html` (your homepage)
- `about` becomes `about.html`
- `contact-us` becomes `contact-us.html`

The filename is automatically generated from your page name, but you can edit it.

**Special filenames:**

- **`index`** or **`home`**: These will be your homepage


### SEO Settings (Collapsible Section)

Click "More settings" to expand these advanced options:

#### Meta Description

A short summary shown in search results (150-160 characters recommended). This helps people understand what your page is about before clicking.

#### Social Media Title

A custom title used when your page is shared on Facebook, Twitter, and other social platforms. If left empty, the main **Title** field will be used.

This is useful when you want a different, more social-media-friendly title for sharing.

#### Social Media Image

The image shown when someone shares your page on social media (recommended size: 1200x630px).

**To add an image:**

1. Click **"Upload"** or **"Browse"**
2. Choose from your media library or upload a new image
3. You'll see a preview of the selected image

> **Note:** For social media images to work with absolute URLs, make sure you've set a **Site URL** in your [project settings](projects.html).

#### Canonical URL

The preferred URL for this page if it exists elsewhere. This tells search engines which version of a page is the "main" one when you have duplicate or very similar content.

**When to use:**

- If this content exists on another website
- If you have multiple URLs pointing to the same content
- To prevent duplicate content issues in SEO

**Example:** If your page is at both `example.com/about` and `example.com/about-us`, set the canonical URL to your preferred version.

#### Search Engine Indexing

Controls whether search engines can find and index this page.

**Options:**

- **Index and Follow (Default)**: Search engines can index this page and follow its links
- **No Index**: Search engines should not include this page in search results (useful for thank you pages, private content, etc.)

> When you [export your site](export.html) with a Site URL set, pages marked as "No Index" will automatically be added to your `robots.txt` file's disallow rules.


# Editing a Page

1. Go to the **Pages** list
2. Find your page
3. Click the **pencil icon** (Edit)
4. Update the fields you want to change
5. Click **"Save Changes"**

### Important: Changing the Filename

If you change a page's filename, the file will be renamed automatically when you export. For example:

- Old filename: `about` → `about.html`
- New filename: `about-us` → `about-us.html`

>  **Warning:** If your page is already published and indexed by search engines, changing the filename will break existing links to that page.


# Deleting Pages

1. Go to the **Pages** list
2. Find the page you want to delete
3. Click the **trash icon** (Delete)
4. Confirm the deletion

### Bulk Delete

You can delete multiple pages at once:

1. Check the boxes next to the pages you want to delete
2. Click **"Delete Selected"**
3. Confirm the deletion

>  **Warning:** Deletion is permanent. All content and widgets on the page will be removed.


# Other Page Actions

### Duplicating a Page

Click the **copy icon** to duplicate a page. This creates an exact copy with all widgets and content, but with a new filename (usually the original with `-copy` appended).


# Tips & Best Practices

### Homepage

Always create a page with the filename `index` or `home` to serve as your homepage.

### SEO

- Write unique titles and descriptions for each page
- Keep titles under 60 characters
- Keep meta descriptions between 150-160 characters
- Use descriptive, keyword-rich filenames

### Social Sharing

- Add social media images to important pages (1200x630px recommended)
- Use the **Social Media Title** field for share-friendly titles
- Make sure your project has a Site URL set for absolute URLs in social tags
- Test how your page looks when shared using tools like Facebook's Sharing Debugger

### Organization

- Use clear, descriptive page names
- Keep filenames simple and readable
- Consider your site structure before creating pages

### Search Engine Control

- Use "No Index" for pages you don't want in search results (thank you pages, member-only pages, etc.)
- Set canonical URLs when you have duplicate or similar content
- Remember that pages marked "No Index" are automatically added to robots.txt when you [export](export.html)
