import * as cheerio from "cheerio";
import { htmlToJsx } from "./html-to-jsx.js";
import fs from "fs-extra";
import path from "path";

export async function extractComponents(html, outputDir) {
  const $ = cheerio.load(html);
  const components = [];

  const selectors = [
    { selector: "#masthead", name: "Header" },
    { selector: "#colophon", name: "Footer" },
  ];

  for (const { selector, name } of selectors) {
    const el = $(selector).first();
    if (el.length) {
      // Remove unwanted scripts/banners from the component itself
      el.find("script").remove();
      el.find("#cmplz-cookiebanner-container").remove();

      const componentHtml = el.prop('outerHTML');
      const jsx = htmlToJsx(componentHtml);
      
      const componentContent = `
import React from 'react';

export default function ${name}() {
  return (
    ${jsx}
  );
}
`;
      const filePath = path.join(outputDir, "..", "components", `${name}.jsx`);
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, componentContent);
      
      components.push({ selector, name });
    }
  }

  return components;
}
