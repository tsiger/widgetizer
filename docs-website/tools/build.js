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

// Read main package.json for version
const packageJson = JSON.parse(await fs.readFile(path.join(ROOT_DIR, "package.json"), "utf-8"));
const version = packageJson.version;

// Read sitemap
const sitemap = JSON.parse(await fs.readFile(path.join(SRC_DIR, "sitemap.json"), "utf-8"));

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

// Ensure dist directory exists
await fs.ensureDir(DIST_DIR);

// Copy logo (overwrite if exists)
try {
  await fs.copy(path.join(SRC_DIR, sitemap.logo), path.join(DIST_DIR, sitemap.logo), { overwrite: true });
} catch (error) {
  console.warn(`Warning: Could not copy logo: ${error.message}`);
}

// Copy styles (overwrite if exists)
try {
  await fs.copy(path.join(__dirname, "styles.css"), path.join(DIST_DIR, "styles.css"), { overwrite: true });
} catch (error) {
  console.warn(`Warning: Could not copy styles: ${error.message}`);
}

// GitHub icon SVG
const githubIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>`;

// Generate navigation HTML
function generateNav() {
  let html = '<nav class="sidebar">\n';
  html += `  <a href="index.html" class="logo">\n`;
  html += `    <img src="${sitemap.logo}" alt="Widgetizer" />\n`;
  html += `  </a>\n`;
  html += '  <ul class="nav-list">\n';

  for (const item of sitemap.navigation) {
    if (item.type === "header") {
      html += `    <li class="nav-header">${item.title}</li>\n`;
    } else if (item.type === "page") {
      const href = item.path.replace(".md", ".html");
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
  html += `  <a href="index.html" class="mobile-logo">\n`;
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
function generateHTML(title, content, activePath, description = "") {
  const nav = generateNav()
    .replace(`{{ACTIVE_${activePath}}}`, "active")
    .replace(/\{\{ACTIVE_[^}]+\}\}/g, "");

  const descriptionMeta = description ? `\n  <meta name="description" content="${description}">` : "";

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
  <title>${title} - ${sitemap.title}</title>${descriptionMeta}
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

    // Generate full HTML page
    const fullHTML = generateHTML(item.title, htmlContent, item.path, metadata.description);

    // Write HTML file
    try {
      await fs.writeFile(htmlPath, fullHTML);
      console.log(`✓ Generated ${item.path.replace(".md", ".html")}`);
    } catch (error) {
      console.warn(`⚠ Could not write ${item.path.replace(".md", ".html")}: ${error.message} (file may be open)`);
    }
  }
}

console.log("\n✨ Documentation site built successfully!\n");
