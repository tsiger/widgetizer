The Media Library is your central hub for all the images, videos, and audio files used in your website. Widgetizer automatically optimizes your images and tracks where they're being used to help you manage your media efficiently.

# Uploading Files

### Drag and Drop

1. Go to the **Media** page
2. Drag files from your computer into the upload zone
3. Or click **"Choose Files"** to browse

You can upload multiple files at once. Widgetizer will process them in batches.

### Supported File Types

**Images:**

- JPEG/JPG
- PNG
- GIF
- WebP
- SVG

**Videos:**

- MP4

**Audio:**

- MP3

### Upload Limits

File size limits can be configured in [App Settings](settings.html):

- **Images**: Default maximum size per file
- **Videos**: Separate maximum size per file
- **Audio**: Separate maximum size per file

If a file exceeds the limit, it will be rejected with an error message.

# Automatic Image Optimization

When you upload an image, Widgetizer automatically creates multiple sizes for better website performance. This means your site loads faster because browsers can download the appropriate size for each screen.

### Generated Image Sizes

By default, Widgetizer creates these sizes:

- **Thumb** (150px wide) - For small previews
- **Small** (480px wide) - For mobile devices
- **Medium** (1024px wide) - For tablets and small desktops
- **Large** (1920px wide) - For large desktop screens

> **Note:** SVG images are never resized since they're vector graphics that scale perfectly at any size.

### Smart Size Generation

Widgetizer is smart about which sizes to create:

- If your original image is 800px wide, it won't create a "large" size (1920px would just be a stretched copy)
- Only sizes that are **smaller** than your original are generated
- This saves storage space and keeps your project lean

### Configuring Image Processing

You can customize how images are processed in [App Settings](settings.html) → **Media**:

**Image Quality:**

- Set a quality level from 1-100
- Higher quality = larger file sizes
- Lower quality = smaller file sizes (but may look worse)
- Recommended: 80-85 for a good balance

**Enable/Disable Sizes:**

- Turn individual sizes on or off
- For example, disable "Large" if you never need images that big
- Disabled sizes won't be generated, saving storage

**Customize Size Dimensions:**

- Change the maximum width for each size
- For example, set "Medium" to 768px instead of 1024px
- Useful for matching your theme's design

# Viewing Your Media

### Grid View

Shows your files as thumbnail cards. Great for browsing images visually.

### List View

Shows your files in a table with detailed information (filename, size, type, dimensions, upload date).

Switch between views using the toggle buttons in the toolbar.

### Searching

Use the search bar to filter files by filename. The search updates in real-time as you type.

### Filtering by Type

Use the type filter dropdown to show:

- **All files**
- **Images only**
- **Videos only**
- **Audio only**

# Managing Files

### Editing Metadata

Each file can have metadata for accessibility and SEO:

1. Click the **pencil icon** (Edit) on any file
2. Add or update:
   - **Alt Text**: Describes the image for screen readers and SEO
   - **Title**: Optional title text
3. Click **"Save"**

> **Tip:** Always add alt text to images for better accessibility and SEO.

### Deleting Files

#### Single Delete

1. Click the **trash icon** (Delete) on any file
2. Confirm the deletion

#### Bulk Delete

1. Check the boxes next to files you want to delete
2. Click **"Delete Selected"**
3. Confirm the deletion

### Delete Protection

Widgetizer tracks which pages use which files. **You cannot delete a file that's currently being used** in:

- Page content (widgets)
- Header widget
- Footer widget

If you try to delete a file in use, you'll see an error message showing which pages are using it.

# Usage Tracking

Widgetizer automatically tracks where your media files are being used. This helps prevent you from accidentally deleting images that are live on your site.

### How It Works

- When you save a page, Widgetizer scans its content for media files
- Files are marked as "used in" specific pages
- The Media Library shows usage badges on each file

### Usage Badges

In Grid View, files display badges showing how many pages use them:

- No badge: File isn't being used anywhere
- Badge with number: File is used in that many pages

### Refreshing Usage

If you think the usage tracking is out of sync, you can manually refresh it:

1. Click the **"Refresh Usage"** button in the toolbar
2. Widgetizer will rescan all pages and update the usage information

# File Organization

### File Naming

When you upload a file, Widgetizer:

1. Converts the filename to a URL-friendly format (lowercase, hyphens instead of spaces)
2. Checks if that filename already exists
3. If it exists, adds a number (e.g., `my-image-1.jpg`, `my-image-2.jpg`)

**Example:**

- Upload: "My Awesome Photo.JPG"
- Stored as: `my-awesome-photo.jpg`

### Storage Location

Files are stored in your project directory:

- **Images**: `/data/projects/your-project/uploads/images/`
- **Videos**: `/data/projects/your-project/uploads/videos/`
- **Audio**: `/data/projects/your-project/uploads/audios/`

Generated image sizes are stored with prefixes:

- `thumb_my-image.jpg`
- `small_my-image.jpg`
- `medium_my-image.jpg`
- `large_my-image.jpg`

# Tips & Best Practices

### Image Optimization

- Optimize images before uploading (reduce resolution for photos that don't need to be huge)
- Use JPG for photos, PNG for graphics with transparency
- Use WebP when possible for better compression

### Organization

- Use descriptive filenames before uploading (easier to find later)
- Add alt text to all images for SEO and accessibility
- Regularly review unused files and delete what you don't need

### Performance

- Let Widgetizer's automatic sizing do the work
- Configure image quality in App Settings (80-85 is usually perfect)
- Disable size variants you don't use to save storage

### Videos

- Videos are NOT processed or optimized automatically
- Compress videos before uploading to keep file sizes manageable
- MP4 is the most compatible format across browsers

### Bulk Operations

- Use bulk delete to quickly clean up multiple unused files
- Use search and filter to find groups of files
- Always check usage before deleting to avoid breaking your site
