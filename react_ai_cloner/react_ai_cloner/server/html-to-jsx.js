export function htmlToJsx(html) {
  if (!html) return "";

  // Remove HTML comments
  let jsx = html.replace(/<!--[\s\S]*?-->/g, "");

  // Remove curly brace placeholders that break React
  jsx = jsx.replace(/{([a-zA-Z0-9_-]+)}/g, "$1");

  // Attribute mappings
  jsx = jsx
    .replace(/ class=/g, " className=")
    .replace(/ for=/g, " htmlFor=")
    .replace(/ onclick=/g, " onClick=")
    .replace(/ onchange=/g, " onChange=")
    .replace(/ tabindex=/g, " tabIndex=")
    .replace(/ fetchpriority=/g, " fetchPriority=")
    .replace(/ srcSet=/g, " srcSet=")
    .replace(/ playsinline(?:="")?/g, " playsInline")
    .replace(/ autoplay(?:="")?/g, " autoPlay")
    .replace(/ muted(?:="")?/g, " muted")
    .replace(/ loop(?:="")?/g, " loop")
    .replace(/ itemType=/g, " itemType=")
    .replace(/ itemScope/g, " itemScope")
    .replace(/ itemID=/g, " itemID=")
    .replace(/ itemProp=/g, " itemProp=")
    // SVG Attributes
    .replace(/ clip-rule=/g, " clipRule=")
    .replace(/ fill-rule=/g, " fillRule=")
    .replace(/ stroke-width=/g, " strokeWidth=")
    .replace(/ stroke-linecap=/g, " strokeLinecap=")
    .replace(/ stroke-linejoin=/g, " strokeLinejoin=")
    .replace(/ stroke-miterlimit=/g, " strokeMiterlimit=")
    .replace(/ enable-background=/g, " enableBackground=")
    .replace(/ xml:space=/g, " xmlSpace=")
    .replace(/ xmlns:xlink=/g, " xmlnsXlink=")
    .replace(/ xlink:href=/g, " xlinkHref=")
    .replace(/ stop-color=/g, " stopColor=")
    .replace(/ stop-opacity=/g, " stopOpacity=");

  // Convert absolute links to relative
  jsx = jsx.replace(/href=["']https:\/\/drivepneu\.fr(\/[^"']*)["']/g, (match, path) => {
    if (path === "" || path === "/") return 'href="/"';
    return `href="${path}"`;
  });

  // Handle style attributes
  jsx = jsx.replace(/style="([^"]*)"/g, (match, styleStr) => {
    try {
      const styles = styleStr.split(';').filter(s => s.trim());
      const reactStyle = styles.map(style => {
        const firstColon = style.indexOf(':');
        if (firstColon === -1) return null;
        const key = style.substring(0, firstColon).trim();
        const value = style.substring(firstColon + 1).trim();
        if (key && value) {
          if (key.startsWith('--')) return `"${key}": "${value}"`;
          const camelKey = key.replace(/-([a-z])/g, g => g[1].toUpperCase()).replace(/^-/, '');
          return `${camelKey}: "${value}"`;
        }
        return null;
      }).filter(Boolean).join(', ');
      return `style={{ ${reactStyle} }}`;
    } catch (e) { return match; }
  });

  // Self-closing tags
  const selfClosing = ['img', 'br', 'hr', 'input', 'link', 'meta', 'source', 'embed', 'area', 'base', 'col', 'track', 'wbr'];
  selfClosing.forEach(tag => {
    const regex = new RegExp(`<${tag}([^>]*)>`, 'g');
    jsx = jsx.replace(regex, `<${tag}$1 />`);
  });

  return jsx;
}