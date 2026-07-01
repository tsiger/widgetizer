import { marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

// Configure marked with syntax highlighting
marked.use(
  markedHighlight({
    langPrefix: "hljs language-",
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : "plaintext";
      return hljs.highlight(code, { language }).value;
    },
  }),
);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.join(__dirname, "../src");
const DIST_DIR = path.join(__dirname, "../dist");
const ROOT_DIR = path.join(__dirname, "../..");
const STYLES_PATH = path.join(__dirname, "styles.css");
const SITE_URL = "https://docs.widgetizer.org";

// Config reloaded on every build so version/sitemap edits are picked up in watch mode
let version;
let sitemap;

async function loadConfig() {
  const packageJson = JSON.parse(await fs.readFile(path.join(ROOT_DIR, "package.json"), "utf-8"));
  version = packageJson.version;
  sitemap = JSON.parse(await fs.readFile(path.join(SRC_DIR, "sitemap.json"), "utf-8"));
}

// Parse frontmatter from markdown content
function parseFrontmatter(content) {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { metadata: {}, content };
  }

  const frontmatter = match[1];
  const metadata = {};

  // Parse simple key: value pairs
  frontmatter.split("\n").forEach((line) => {
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      metadata[key] = value;
    }
  });

  return {
    metadata,
    content: content.slice(match[0].length),
  };
}

// Add id attributes to headings so in-page anchor links (#section) resolve.
// Slug: lowercase the heading text (inline tags/entities stripped) and collapse
// every run of non-alphanumeric characters to a single hyphen. Duplicate slugs on
// the same page get a numeric suffix (-1, -2, …).
function addHeadingIds(html) {
  const used = new Map();
  return html.replace(/<(h[1-6])>([\s\S]*?)<\/\1>/g, (match, tag, inner) => {
    const text = inner
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    let slug = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (!slug) slug = tag;
    if (used.has(slug)) {
      const n = used.get(slug) + 1;
      used.set(slug, n);
      slug = `${slug}-${n}`;
    } else {
      used.set(slug, 0);
    }
    return `<${tag} id="${slug}">${inner}</${tag}>`;
  });
}

// GitHub icon SVG
const githubIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>`;

// Generate navigation HTML
function generateNav() {
  let html = '<nav class="sidebar">\n';
  html += `  <a href="/" class="logo">\n`;
  html += `    <img src="${sitemap.logo}" alt="Widgetizer" />\n`;
  html += `  </a>\n`;
  html += `  <a href="https://widgetizer.org" class="back-to-site">\n`;
  html += `    <span aria-hidden="true">&larr;</span> Back to widgetizer.org\n`;
  html += `  </a>\n`;
  html += '  <ul class="nav-list">\n';

  for (const item of sitemap.navigation) {
    if (item.type === "header") {
      html += `    <li class="nav-header">${item.title}</li>\n`;
    } else if (item.type === "page") {
      const href = item.path === "index.md" ? "/" : "/" + item.path.replace(".md", "");
      const isActive = "{{ACTIVE_" + item.path + "}}";
      html += `    <li><a href="${href}" class="${isActive}">${item.title}</a></li>\n`;
    }
  }

  html += "  </ul>\n";
  html += '  <div class="sidebar-footer">\n';
  html += `    <span class="version">Latest version: <strong>v${version}</strong></span>\n`;
  html += `    <a href="https://github.com/tsiger/widgetizer" class="github-link" target="_blank" rel="noopener noreferrer" aria-label="GitHub">${githubIcon}</a>\n`;
  html += "  </div>\n";
  html += "</nav>";
  return html;
}

// Generate mobile nav
function generateMobileNav() {
  let html = '<div class="mobile-header">\n';
  html += `  <a href="/" class="mobile-logo">\n`;
  html += `    <img src="${sitemap.logo}" alt="Widgetizer" />\n`;
  html += `  </a>\n`;
  html += '  <button class="hamburger" aria-label="Menu">\n';
  html += "    <span></span>\n";
  html += "    <span></span>\n";
  html += "    <span></span>\n";
  html += "  </button>\n";
  html += "</div>\n";
  return html;
}

// Generate HTML template
function generateHTML(title, content, activePath, description = "", canonicalUrl = "") {
  const nav = generateNav()
    .replace(`{{ACTIVE_${activePath}}}`, "active")
    .replace(/\{\{ACTIVE_[^}]+\}\}/g, "");

  const descriptionMeta = description ? `\n  <meta name="description" content="${description}">` : "";
  const canonicalLink = canonicalUrl ? `\n  <link rel="canonical" href="${canonicalUrl}">` : "";

  return `<!--
    __          ___     _            _   _
    \\ \\        / (_)   | |          | | (_)
     \\ \\  /\\  / / _  __| | __ _  ___| |_ _ _______ _ __
      \\ \\/  \\/ / | |/ _\` |/ _\` |/ _ \\ __| |_  / _ \\ '__|
       \\  /\\  /  | | (_| | (_| |  __/ |_| |/ /  __/ |
        \\/  \\/   |_|\\__,_|\\__, |\\___|\\__|_/___\\___|_|
                          __/ |
                         |___/
    Widgetizer.org - ${version}
-->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - ${sitemap.title}</title>${descriptionMeta}${canonicalLink}
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  ${generateMobileNav()}
  ${nav}
  <main class="content">
    ${content}
  </main>
  <script>
    // Mobile menu toggle
    const hamburger = document.querySelector('.hamburger');
    const sidebar = document.querySelector('.sidebar');

    hamburger?.addEventListener('click', () => {
      sidebar.classList.toggle('active');
      hamburger.classList.toggle('active');
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768) {
        if (!sidebar.contains(e.target) && !hamburger.contains(e.target)) {
          sidebar.classList.remove('active');
          hamburger.classList.remove('active');
        }
      }
    });
  </script>
</body>
</html>`;
}

// Build the whole site once (reads config fresh, so it is safe to call repeatedly in watch mode)
async function build() {
  await loadConfig();

  await fs.ensureDir(DIST_DIR);

  // Copy logo (overwrite if exists)
  try {
    await fs.copy(path.join(SRC_DIR, sitemap.logo), path.join(DIST_DIR, sitemap.logo), { overwrite: true });
  } catch (error) {
    console.warn(`Warning: Could not copy logo: ${error.message}`);
  }

  // Copy styles (overwrite if exists)
  try {
    await fs.copy(STYLES_PATH, path.join(DIST_DIR, "styles.css"), { overwrite: true });
  } catch (error) {
    console.warn(`Warning: Could not copy styles: ${error.message}`);
  }

  // Process each page
  for (const item of sitemap.navigation) {
    if (item.type === "page") {
      const mdPath = path.join(SRC_DIR, item.path);
      const htmlPath = path.join(DIST_DIR, item.path.replace(".md", ".html"));

      // Read markdown
      const rawMarkdown = await fs.readFile(mdPath, "utf-8");

      // Parse frontmatter
      const { metadata, content: markdown } = parseFrontmatter(rawMarkdown);

      // Convert to HTML
      let htmlContent = marked.parse(markdown);

      // Rewrite relative links ending in .html to clean URLs
      htmlContent = htmlContent.replace(/href=(['"])([^'"]+?)\.html(#([^'"]*))?\1/g, (match, quote, slug, hashGroup, hash) => {
        if (slug.startsWith("http://") || slug.startsWith("https://") || slug.startsWith("//")) {
          return match;
        }
        const cleanPath = slug === "index" ? "/" : "/" + slug;
        const cleanHash = hash ? `#${hash}` : "";
        return `href=${quote}${cleanPath}${cleanHash}${quote}`;
      });

      // Process blockquotes and add type classes
      htmlContent = htmlContent.replace(/<blockquote>/g, (match, offset, string) => {
        // Find the blockquote content
        const blockquoteEnd = string.indexOf("</blockquote>", offset);
        if (blockquoteEnd === -1) return match;

        const blockquoteContent = string.substring(offset, blockquoteEnd);

        // Check for type keywords (case-insensitive, handles various formats)
        let type = null;
        const contentLower = blockquoteContent.toLowerCase();

        if (contentLower.includes("<strong>note")) {
          type = "note";
        } else if (contentLower.includes("<strong>important")) {
          type = "important";
        } else if (contentLower.includes("<strong>warning")) {
          type = "warning";
        } else if (contentLower.includes("<strong>tip")) {
          type = "tip";
        }

        return type ? `<blockquote class="blockquote-${type}">` : match;
      });

      // Add id attributes to headings so #section anchor links resolve
      htmlContent = addHeadingIds(htmlContent);

      // Compute canonical URL
      const cleanSlug = item.path === "index.md" ? "" : item.path.replace(".md", "");
      const canonicalUrl = `${SITE_URL}/${cleanSlug}`;

      // Generate full HTML page
      const fullHTML = generateHTML(item.title, htmlContent, item.path, metadata.description, canonicalUrl);

      // Write HTML file
      try {
        await fs.writeFile(htmlPath, fullHTML);
        console.log(`✓ Generated ${item.path.replace(".md", ".html")}`);
      } catch (error) {
        console.warn(`⚠ Could not write ${item.path.replace(".md", ".html")}: ${error.message} (file may be open)`);
      }
    }
  }

  // Generate sitemap.xml
  const lastmod = new Date().toISOString().split("T")[0];
  const urls = sitemap.navigation
    .filter((item) => item.type === "page")
    .map((item) => {
      const slug = item.path === "index.md" ? "" : item.path.replace(".md", "");
      const loc = `${SITE_URL}/${slug}`;
      const priority = item.path === "index.md" ? "1.0" : "0.8";
      return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
    })
    .join("\n");

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

  await fs.writeFile(path.join(DIST_DIR, "sitemap.xml"), sitemapXml);
  console.log("✓ Generated sitemap.xml");

  // Generate robots.txt
  const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;

  await fs.writeFile(path.join(DIST_DIR, "robots.txt"), robotsTxt);
  console.log("✓ Generated robots.txt");

  console.log("\n✨ Documentation site built successfully!\n");
}

// Run once, then (with --watch) rebuild on source changes and live-reload the browser
await build();

if (process.argv.includes("--watch")) {
  const { default: browserSync } = await import("browser-sync");
  const bs = browserSync.create();

  // Resolve clean URLs to their .html file, matching how the host serves them
  // in production (e.g. /getting-started -> getting-started.html).
  const cleanUrls = (req, res, next) => {
    const qIndex = req.url.search(/[?#]/);
    const pathPart = qIndex === -1 ? req.url : req.url.slice(0, qIndex);
    const suffix = qIndex === -1 ? "" : req.url.slice(qIndex);
    if (pathPart !== "/" && !path.extname(pathPart)) {
      const candidate = path.join(DIST_DIR, `${decodeURIComponent(pathPart)}.html`);
      if (fs.existsSync(candidate)) {
        req.url = `${pathPart}.html${suffix}`;
      }
    }
    next();
  };

  bs.init({
    server: {
      baseDir: DIST_DIR,
      middleware: [cleanUrls],
    },
    port: 5050,
    open: false,
    notify: false,
    ui: false,
  });

  let timer = null;
  let building = false;
  let queued = false;

  const rebuild = async () => {
    if (building) {
      queued = true;
      return;
    }
    building = true;
    try {
      await build();
      bs.reload();
    } catch (error) {
      console.error(`⚠ Build failed: ${error.message}`);
    }
    building = false;
    if (queued) {
      queued = false;
      rebuild();
    }
  };

  // Coalesce rapid saves into a single rebuild
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(rebuild, 150);
  };

  fs.watch(SRC_DIR, schedule);
  fs.watch(__dirname, (event, filename) => {
    if (filename === "styles.css") schedule();
  });

  console.log("👀 Watching src/ for changes — live preview at http://localhost:5050\n");
}
