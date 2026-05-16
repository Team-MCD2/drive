import puppeteer from "puppeteer";
import * as cheerio from "cheerio";
import path from "path";
import fs from "fs-extra";
import { htmlToJsx } from "./html-to-jsx.js";
import { buildRoutes } from "./rebuild-routing.js";
import { extractComponents } from "./extract-components.js";

const TARGET = "https://drivepneu.fr";
const OUTPUT = path.join(process.cwd(), "generated/src/pages");

const visited = new Set();
const pagesGenerated = [];
const globalStylesheets = new Set();
const globalInlineStyles = new Set();
let bodyClasses = "";
const MAX_DEPTH = 3;

async function crawl(url, depth = 0) {
  if (depth > MAX_DEPTH) return;
  
  // Normalize URL
  let normalizedUrl = url.replace(/\/$/, "");
  if (visited.has(normalizedUrl)) return;
  visited.add(normalizedUrl);

  console.log(`Visiting: ${url}`);
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  // Accept cookies to prevent Complianz from blocking iframes (maps, videos)
  await page.setCookie(
    { name: 'cmplz_marketing', value: 'allow', domain: '.drivepneu.fr' },
    { name: 'cmplz_statistics', value: 'allow', domain: '.drivepneu.fr' },
    { name: 'cmplz_preferences', value: 'allow', domain: '.drivepneu.fr' },
    { name: 'cmplz_consent_status', value: 'allow', domain: '.drivepneu.fr' }
  );
  
  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
    
    // Scroll to bottom
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        let distance = 200;
        let timer = setInterval(() => {
          let scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          if(totalHeight >= scrollHeight){
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });

    const html = await page.content();
    const $ = cheerio.load(html);

    // Collect all stylesheets
    $('link[rel="stylesheet"]').each((_, el) => {
      let href = $(el).attr("href");
      if (href) {
        if (href.startsWith("//")) href = "https:" + href;
        else if (href.startsWith("/")) href = TARGET + href;
        globalStylesheets.add(href);
      }
    });

    // Collect all inline styles
    $("style").each((_, el) => {
      const content = $(el).html();
      if (content) globalInlineStyles.add(content);
    });

    let currentBodyClasses = $("body").attr("class") || "";
    // Strip complianz classes
    currentBodyClasses = currentBodyClasses.replace(/cmplz-[a-zA-Z0-9_-]+/g, "").trim();
    if (url === TARGET || url === TARGET + "/") {
      bodyClasses = currentBodyClasses;
    }

    // Find links to same domain BEFORE cleaning up
    const urlsToCrawl = [];
    $("a").each((_, el) => {
      let href = $(el).attr("href");
      if (href) {
        if (href.startsWith(TARGET)) urlsToCrawl.push(href);
        else if (href.startsWith("/") && !href.startsWith("//")) urlsToCrawl.push(TARGET + href);
      }
    });

    console.log(`Found ${urlsToCrawl.length} potential links to crawl.`);

    // Extract common components ONLY from homepage
    if (url === TARGET || url === TARGET + "/") {
      await extractComponents(html, OUTPUT);
    }

    // Aggressive cleanup
    $("script").remove();
    $("noscript").remove();
    $("#cmplz-cookiebanner-container, #cmplz-manage-consent, .cmplz-cookiebanner, .cc-window").remove();
    
    // Remove common components to avoid duplication (extracted below)
    $("#masthead, .site-header, .site-footer, #colophon, footer").remove();

    // Unwrap complianz iframes
    $(".cmplz-placeholder-parent").each((_, el) => {
      const iframe = $(el).find("iframe");
      if (iframe.length) {
        // Clean up iframe classes
        iframe.removeClass("cmplz-placeholder-element cmplz-iframe cmplz-iframe-styles cmplz-no-video cmplz-processed cmplz-activated");
        // Ensure src is set
        const realSrc = iframe.attr("data-src-cmplz") || iframe.attr("src");
        if (realSrc) iframe.attr("src", realSrc);
        $(el).replaceWith(iframe);
      }
    });

    // Fix Elementor video backgrounds stuck inside boxed containers
    $(".e-con-inner > .elementor-background-video-container").each((_, el) => {
      const parentSection = $(el).closest(".elementor-element");
      if (parentSection.length) {
        $(el).prependTo(parentSection);
      }
    });

    // Clean up video styles (Puppeteer freezes their size, breaking responsiveness)
    $("video").removeAttr("style").attr("style", "width: 100%; height: 100%; object-fit: cover; position: absolute; top: 0; left: 0;");

    const bodyHtml = $("body").html() || "";
    const jsx = htmlToJsx(bodyHtml);
    
    // Path name logic
    let relPath = url.replace(TARGET, "").replace(/\/$/, "");
    const pathName = relPath === "" ? "index" : relPath.replace(/^\//, "");
    const safeFileName = pathName === "index" ? "HomePage" : pathName.replace(/\//g, "_");
    const componentName = safeFileName.split("_").filter(Boolean).map(s => s.charAt(0).toUpperCase() + s.slice(1).replace(/[^a-zA-Z0-9]/g, "")).join("") || "HomePage";

    const pageContent = `import React, { useEffect } from 'react';
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function ${componentName}() {
  useEffect(() => {
    document.body.className = "${currentBodyClasses}";
    return () => { document.body.className = ""; };
  }, []);

  return (
    <div className="page-wrapper">
      <Header />
      ${jsx}
      <Footer />
    </div>
  );
}
`;

    await fs.ensureDir(OUTPUT);
    await fs.writeFile(path.join(OUTPUT, `${safeFileName}.jsx`), pageContent);
    
    pagesGenerated.push({ 
      pathName: relPath === "" ? "/" : (relPath.startsWith("/") ? relPath : `/${relPath}`), 
      componentName, 
      safeFileName 
    });

    // Close page before recursion to save memory
    await browser.close();

    for (const link of [...new Set(urlsToCrawl)]) {
      if (!link.includes("#") && !link.includes("?") && !link.endsWith(".png") && !link.endsWith(".jpg") && !link.endsWith(".mov")) {
        await crawl(link, depth + 1);
      }
    }

  } catch (err) {
    console.error(`Error crawling ${url}:`, err);
    if (browser) await browser.close();
  }
}

async function start() {
  console.log("Starting final crawl of " + TARGET);
  
  const generatedDir = path.join(process.cwd(), "generated");
  if (await fs.pathExists(path.join(generatedDir, "src"))) {
    await fs.emptyDir(path.join(generatedDir, "src/pages"));
    await fs.emptyDir(path.join(generatedDir, "src/components"));
  }

  await crawl(TARGET);

  console.log("Building routes...");
  await buildRoutes(pagesGenerated, path.join(process.cwd(), "generated/src"));
  
  console.log("Generating index.html with ALL styles...");
  const indexPath = path.join(process.cwd(), "generated/index.html");
  const styleTags = Array.from(globalStylesheets).map(href => `<link rel="stylesheet" href="${href}">`).join("\n    ");
  const inlineStyles = Array.from(globalInlineStyles).map(content => `<style>${content}</style>`).join("\n    ");
  
  const indexTemplate = `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Drive Pneu - Garage Auto Plaisance-du-Touch</title>
    ${styleTags}
    ${inlineStyles}
    <style>
      body { margin: 0; padding: 0; }
      #root { width: 100%; }
      .ast-header-break-point #ast-desktop-header { display: none; }
      .ast-header-break-point #ast-mobile-header { display: block; }
      @media (min-width: 922px) {
        #ast-mobile-header { display: none !important; }
        #ast-desktop-header { display: block !important; }
      }
      @media (max-width: 921px) {
        #ast-desktop-header { display: none !important; }
        #ast-mobile-header { display: block !important; }
      }
      
      /* Elementor Background Video Fixes (Replaces missing JS) */
      .elementor-background-video-container {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100% !important;
        height: 100% !important;
        max-width: none !important;
        min-width: 100vw !important;
        z-index: 0 !important;
        overflow: hidden !important;
      }
      .elementor-background-video-hosted {
        width: 100% !important;
        height: 100% !important;
        max-width: none !important;
        min-width: 100vw !important;
        object-fit: cover !important;
      }
      .elementor-element-4c62737 { /* Target the specific hero section */
        position: relative !important;
      }
      /* Dark overlay for video to make text readable */
      .elementor-element-4c62737 .elementor-background-video-container::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.6);
        z-index: 1;
      }
      .elementor-element-4c62737 .e-con-inner {
        position: relative;
        z-index: 2;
      }
      /* Ensure Elementor sections can stretch to full width inside Astra */
      .ast-page-builder-template .site-content .ast-container {
        max-width: 100% !important;
        padding: 0 !important;
      }
      /* Ensure Astra Transparent Header overlaps */
      .ast-theme-transparent-header #masthead {
        position: absolute !important;
        top: 0;
        left: 0;
        width: 100%;
        z-index: 99;
      }
    </style>
  </head>
  <body class="${bodyClasses}">
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`;

  await fs.writeFile(indexPath, indexTemplate);
  console.log("Crawl and build complete!");
}

start();