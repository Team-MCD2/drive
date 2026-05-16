export function detectFramework(html) {
  const lower = html.toLowerCase();

  if (lower.includes("_next")) return "Next.js";
  if (lower.includes("shopify")) return "Shopify";
  if (lower.includes("wp-content")) return "WordPress";
  if (lower.includes("vue")) return "Vue";
  if (lower.includes("react")) return "React";

  return "Unknown";
}