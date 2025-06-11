# Images Action Plan

## Overview

This document outlines the action plan for implementing comprehensive image optimization and improved theme developer experience (DX) for Widgetizer. The goal is to ensure non-technical users can upload large images without impacting site performance, while making image handling seamless for theme developers.

## Problem Statement

### Current Issues

- Users upload large images (2MB+) from phones that slow down exported sites
- Theme developers write repetitive boilerplate for every image
- No responsive image support for retina displays
- Inconsistent image handling across widgets
- Linter errors when metadata is missing

### Target Users

- **End Users**: Non-technical people building websites who don't understand image optimization
- **Theme Developers**: Need simple, consistent image APIs
- **Site Visitors**: Should get fast-loading, optimized images on any device

## Technical Requirements

### Image Processing Pipeline

1. **Automatic resize on upload** - Generate multiple sizes for each uploaded image
2. **Retina support** - Create 2x versions for high-DPI displays
3. **Format optimization** - WebP with JPEG fallback
4. **Quality optimization** - Different quality settings per size

### Responsive Image Sizes

Generate the following sizes for each uploaded image:

| Size Name | Width  | Use Case              | Retina Version |
| --------- | ------ | --------------------- | -------------- |
| `thumb`   | 150px  | Admin thumbnails      | 300px          |
| `small`   | 480px  | Mobile devices        | 960px          |
| `medium`  | 1024px | Tablets/small desktop | 2048px         |
| `large`   | 1920px | Large screens/heroes  | 3840px         |

### Quality Settings

- **Large images**: 85% quality
- **Thumbnails**: 90% quality
- **WebP**: 80% quality (smaller file sizes)

## Implementation Plan

### Phase 1: Backend Image Processing

#### 1.1 Image Processing Service

- [ ] Create image processing service using Sharp.js or similar
- [ ] Implement automatic resize pipeline on upload
- [ ] Generate all required sizes (1x and 2x versions)
- [ ] Add WebP generation with JPEG fallback
- [ ] Store size/format metadata in database

#### 1.2 Upload API Updates

- [ ] Modify upload endpoint to trigger image processing
- [ ] Update media metadata structure to include all sizes
- [ ] Add validation for supported image formats
- [ ] Implement file naming convention for different sizes

Example metadata structure:

```json
{
  "filename": "hero-image.jpg",
  "alt": "Hero image",
  "title": "Main hero image",
  "original": {
    "width": 4032,
    "height": 3024,
    "size": 2.1MB
  },
  "sizes": {
    "thumb": { "width": 150, "height": 113, "1x": "hero-image-thumb.jpg", "2x": "hero-image-thumb@2x.jpg" },
    "small": { "width": 480, "height": 360, "1x": "hero-image-small.jpg", "2x": "hero-image-small@2x.jpg" },
    "medium": { "width": 1024, "height": 768, "1x": "hero-image-medium.jpg", "2x": "hero-image-medium@2x.jpg" },
    "large": { "width": 1920, "height": 1440, "1x": "hero-image-large.jpg", "2x": "hero-image-large@2x.jpg" }
  },
  "webp": {
    "thumb": { "1x": "hero-image-thumb.webp", "2x": "hero-image-thumb@2x.webp" },
    "small": { "1x": "hero-image-small.webp", "2x": "hero-image-small@2x.webp" },
    "medium": { "1x": "hero-image-medium.webp", "2x": "hero-image-medium@2x.webp" },
    "large": { "1x": "hero-image-large.webp", "2x": "hero-image-large@2x.webp" }
  }
}
```

### Phase 2: Theme DX Improvements

#### 2.1 Liquid Image Filter

Create a simple filter that handles all image complexity:

```liquid
<!-- Simple usage -->
{{ widget.settings.image | image }}

<!-- With options -->
{{ widget.settings.image | image: size: 'large', class: 'hero-image', lazy: true }}

<!-- Responsive usage -->
{{ widget.settings.image | responsive_image: sizes: 'large', class: 'hero-image' }}
```

#### 2.2 Filter Implementation Details

- [ ] Create `image` filter for basic image rendering
- [ ] Create `responsive_image` filter for srcset generation
- [ ] Add automatic WebP detection and fallback
- [ ] Include lazy loading by default
- [ ] Handle missing metadata gracefully
- [ ] Add proper width/height attributes

#### 2.3 Filter Options

Support these options:

- `size`: 'thumb', 'small', 'medium', 'large' (default: 'medium')
- `class`: CSS class name
- `lazy`: Enable lazy loading (default: true)
- `retina`: Include retina versions (default: true)
- `webp`: Use WebP format when supported (default: true)
- `alt`: Override alt text
- `title`: Override title text

### Phase 3: Widget Updates

#### 3.1 Update Existing Widgets

- [ ] Replace image boilerplate in `basic-text.liquid`
- [ ] Replace image boilerplate in `media-with-text.liquid`
- [ ] Update any other widgets using images

#### 3.2 Before/After Example

**Before (current boilerplate):**

```liquid
{% if widget.settings.widgetImage != blank %}
  {% assign widgetImageFilename = widget.settings.widgetImage | split: '/' | last %}
  {% assign widgetImageData = mediaMetadata[widgetImageFilename] %}
  <img
    src="{{ imagePath }}/{{ widgetImageFilename }}"
    class="basic-text__widget-image"
    {% if widgetImageData %}
      alt="{{ widgetImageData.alt }}"
      title="{{ widgetImageData.title }}"
      width="{{ widgetImageData.width }}"
      height="{{ widgetImageData.height }}"
    {% endif %}
  >
{% endif %}
```

**After (with new filter):**

```liquid
{{ widget.settings.widgetImage | responsive_image: size: 'medium', class: 'basic-text__widget-image' }}
```

### Phase 4: Export Optimization

#### 4.1 Static Export Updates

- [ ] Ensure all image sizes are copied during export
- [ ] Update export process to include WebP files
- [ ] Generate proper folder structure for different sizes
- [ ] Update image paths in exported HTML

#### 4.2 Export Folder Structure

```
exported-site/
├── assets/
│   ├── images/
│   │   ├── hero-image-thumb.jpg
│   │   ├── hero-image-thumb@2x.jpg
│   │   ├── hero-image-thumb.webp
│   │   ├── hero-image-thumb@2x.webp
│   │   ├── hero-image-small.jpg
│   │   ├── hero-image-small@2x.jpg
│   │   ├── hero-image-small.webp
│   │   ├── hero-image-small@2x.webp
│   │   └── ... (medium, large variants)
│   └── ...
└── ...
```

## Technical Considerations

### Performance

- **Processing Time**: Image processing should be async to avoid blocking uploads
- **Storage**: Multiple sizes will increase storage requirements (~3-4x)
- **CDN Ready**: Exported sites should work with any CDN

### Browser Support

- **WebP**: Supported by 95%+ of browsers, JPEG fallback for older browsers
- **Srcset**: Supported by 95%+ of browsers, graceful degradation
- **Lazy Loading**: Native browser support, JavaScript fallback if needed

### Error Handling

- [ ] Graceful handling when image processing fails
- [ ] Fallback to original image if sizes missing
- [ ] Clear error messages for unsupported formats
- [ ] Retry mechanism for processing failures

## Documentation Updates

### For Theme Developers

- [ ] Update theming.md with new image filters
- [ ] Add image filter reference documentation
- [ ] Create migration guide for existing widgets
- [ ] Add best practices for image usage

### For End Users

- [ ] Update media.md with automatic optimization info
- [ ] Document supported image formats
- [ ] Add file size recommendations
- [ ] Explain automatic optimization benefits

## Testing Strategy

### Automated Tests

- [ ] Unit tests for image processing service
- [ ] Integration tests for upload pipeline
- [ ] Tests for Liquid filters
- [ ] Export process tests

### Manual Testing

- [ ] Upload various image sizes and formats
- [ ] Test responsive image display on different devices
- [ ] Verify WebP fallback behavior
- [ ] Test exported site performance

## Success Metrics

### Performance Improvements

- Page load time reduction of 50%+ for image-heavy pages
- Lighthouse performance score improvements
- Smaller exported site sizes despite multiple image variants

### Developer Experience

- Reduce image-related code in widgets by 80%
- Eliminate linter errors related to missing image attributes
- Consistent image handling across all widgets

## Future Enhancements

### Advanced Features (Post-MVP)

- [ ] Smart cropping based on focal points
- [ ] Progressive JPEG support
- [ ] AVIF format support (next-gen format)
- [ ] Automatic alt text generation using AI
- [ ] Image compression based on content type
- [ ] Blur-up placeholders for lazy loading

### Admin Features

- [ ] Image optimization dashboard
- [ ] Bulk image reprocessing
- [ ] Storage usage analytics
- [ ] Image performance metrics

## Implementation Timeline

### Sprint 1 (Week 1-2): Backend Foundation

- Image processing service
- Upload API updates
- Metadata structure

### Sprint 2 (Week 3-4): Liquid Filters

- Create image filters
- Testing and refinement
- Documentation

### Sprint 3 (Week 5-6): Widget Updates

- Update existing widgets
- Test theme compatibility
- Performance optimization

### Sprint 4 (Week 7-8): Export & Polish

- Export process updates
- Documentation updates
- Final testing and bug fixes

## Notes

- All images should remain compatible with static export (no server-side dependencies)
- Consider progressive enhancement approach
- Maintain backward compatibility during transition
- Monitor storage costs and implement compression strategies if needed
