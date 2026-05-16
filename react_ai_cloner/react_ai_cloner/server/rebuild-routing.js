import fs from "fs-extra";
import path from "path";

export async function buildRoutes(pages, outputDir) {
  // Deduplicate pages by pathName
  const uniquePages = Array.from(new Map(pages.map(p => [p.pathName, p])).values());

  let imports = "";
  let routes = [];

  for (const page of uniquePages) {
    const { pathName, componentName, safeFileName } = page;

    imports += `import ${componentName} from "./pages/${safeFileName}.jsx";\n`;

    // Ensure route path starts with / and handle trailing slashes
    let routePath = pathName;
    if (routePath !== "/" && routePath.endsWith("/")) {
      routePath = routePath.slice(0, -1);
    }
    
    routes.push(`      <Route path="${routePath}" element={<${componentName} />} />`);
    if (routePath !== "/") {
      routes.push(`      <Route path="${routePath}/" element={<${componentName} />} />`);
    }
  }

  const content = `import React from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";

${imports}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
${routes.join('\n')}
      </Routes>
    </BrowserRouter>
  );
}
`;

  await fs.writeFile(
    path.join(outputDir, "App.jsx"),
    content
  );
}