---
description: Configure Widgetizer app settings including language, image optimization, upload limits, and export preferences.
---

App Settings control global preferences that apply across all your projects in Widgetizer. These settings affect how the application behaves, how files are processed, and how exports are managed. You can access App Settings from the main navigation menu.

# General Settings

### Language

Sets the language for the Widgetizer admin interface. This affects all menus, buttons, labels, and messages you see while using the application.

**Available languages:**
- English
- French
- German
- Greek
- Italian
- Spanish

Changing the language takes effect immediately after saving. You don't need to restart the application.

### Date Format

Controls how dates are displayed throughout Widgetizer. This affects dates shown in the media library, project lists, and anywhere else dates appear in the interface.

**Available formats:**
- **MM/DD/YYYY** - 12/31/2024
- **DD/MM/YYYY** - 31/12/2024
- **YYYY-MM-DD** - 2024-12-31
- **MMM D, YYYY** - Dec 31, 2024
- **MMMM D, YYYY** - December 31, 2024
- **D MMM YYYY** - 31 Dec 2024
- **D MMMM YYYY** - 31 December 2024
- **MM/DD/YYYY h:mm A** - 12/31/2024 2:15 PM
- **DD/MM/YYYY HH:mm** - 31/12/2024 14:15
- **YYYY-MM-DD HH:mm** - 2024-12-31 14:15
- **MMM D, YYYY h:mm A** - Dec 31, 2024 2:15 PM
- **MMMM D, YYYY h:mm A** - December 31, 2024 2:15 PM
- **D MMM YYYY HH:mm** - 31 Dec 2024 14:15

Choose the format that matches your region or preference. The format you select applies to all dates shown in Widgetizer.


# Media & Upload Settings

### File Upload Limits

These settings control the maximum file size allowed for uploads across all projects. If a file exceeds these limits, it will be rejected with an error message.

#### Maximum Image Upload Size

Sets the maximum size for individual image files (JPEG, PNG, GIF, WebP, SVG).

- **Default:** 5 MB
- **Range:** 1 MB to 100 MB
- **Applies to:** All image uploads across all projects

#### Maximum Video Upload Size

Sets the maximum size for individual video files (MP4).

- **Default:** 50 MB
- **Range:** 1 MB to 500 MB
- **Applies to:** All video uploads across all projects

> **Note:** Videos are not automatically optimized or resized. Consider compressing large videos before uploading to keep file sizes manageable.

#### Maximum Audio Upload Size

Sets the maximum size for individual audio files (MP3).

- **Default:** 25 MB
- **Range:** 1 MB to 100 MB
- **Applies to:** All audio uploads across all projects


### Image Processing Configuration

When you upload an image, Widgetizer automatically creates multiple sizes to optimize your website's performance. These settings control how images are processed.

#### Image Quality

Sets the quality level for all generated image sizes. This single setting applies to thumbnails, small, medium, and large image variants.

- **Default:** 85
- **Range:** 1 to 100
- **Higher values:** Better image quality but larger file sizes
- **Lower values:** Smaller files but reduced image quality
- **Recommended:** 80-85 for a good balance between quality and file size

#### Image Sizes

Configure which image sizes are automatically generated and their dimensions. Each size can be enabled or disabled, and you can customize the maximum width.

##### Thumbnail

Small preview images used in the media library grid view.

- **Default width:** 150px
- **Range:** 50px to 500px
- **Default:** Enabled
- **Use case:** Media library thumbnails, small previews

##### Small

Optimized for mobile devices and small screens.

- **Default width:** 480px
- **Range:** 100px to 1000px
- **Default:** Enabled
- **Use case:** Mobile devices, small displays

##### Medium

Standard responsive breakpoint for tablets and small desktops.

- **Default width:** 1024px
- **Range:** 500px to 2000px
- **Default:** Enabled
- **Use case:** Tablets, small desktop screens

##### Large

High-resolution images for large desktop displays.

- **Default width:** 1920px
- **Range:** 1000px to 4000px
- **Default:** Enabled
- **Use case:** Large desktop screens, high-resolution displays

#### Smart Size Generation

Widgetizer automatically determines which sizes to create:

- Only sizes **smaller** than your original image are generated
- If your original is 800px wide, it won't create a "large" size (1920px would just be a stretched copy)
- This saves storage space and keeps your projects lean

> **Note:** SVG images are never resized since they're vector graphics that scale perfectly at any size.


# Export & Versioning Settings

These settings control [site exporting](export.html) behavior.

### Maximum Export Versions to Keep

Controls how many export versions are stored per project. Widgetizer keeps a history of your exports so you can access previous versions if needed.

- **Default:** 10 versions
- **Range:** 1 to 50 versions
- **Behavior:** When this limit is exceeded, the oldest exports are automatically deleted to save storage space

> **Tip:** Keep more versions if you frequently need to access previous exports. Keep fewer versions if storage space is limited.

### Maximum Project Import Size

Sets the maximum file size allowed when importing a project ZIP file.

- **Default:** 500 MB
- **Range:** 10 MB to 2000 MB (2 GB)
- **Use case:** Increase this if you need to import large projects with many media files

When importing a project, if the ZIP file exceeds this limit, the import will be rejected with an error message.


# Tips & Best Practices

### File Upload Limits

- Set limits based on your typical file sizes and storage capacity
- Consider your hosting environment's limitations when setting maximum sizes
- Larger limits allow more flexibility but may slow down uploads

### Image Processing

- **Quality:** 80-85 is usually perfect for most websites
- **Sizes:** Disable sizes you don't use to save storage space
- **Custom widths:** Match image sizes to your theme's design breakpoints
- Let Widgetizer's automatic sizing do the work—it's smart about what to generate

### Export Management

- Keep enough versions to have backups but not so many that they consume excessive storage
- Consider your storage capacity when setting the maximum versions to keep
- Export projects regularly as backups, especially before making major changes

### Storage Optimization

- Disable unused image sizes to reduce storage usage
- Regularly review and delete old export versions if storage is limited
- Consider compressing large media files before uploading
