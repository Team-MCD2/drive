import fs from "fs-extra";
import path from "path";

export async function generateReactPage(filename, jsx, outputDir, components = []) {
  
  // Ensure valid component name (CamelCase)
  const componentName = filename
    .replace(/^_+|_+$/g, '')
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

  let imports = "";
  let processedJsx = jsx;

  for (const comp of components) {
    imports += `import ${comp.name} from "../components/${comp.name}";\n`;
    const regex = new RegExp(`<${comp.tag}[^>]*>[\\s\\S]*?<\\/${comp.tag}>`, 'g');
    processedJsx = processedJsx.replace(regex, `<${comp.name} />`);
  }

  const content = `import React from 'react';
${imports}

export default function ${componentName}() {
  return (
    <div className="${componentName.toLowerCase()}-page">
      ${processedJsx}
    </div>
  );
}
`;

  const filepath = path.join(outputDir, `${filename}.jsx`);
  await fs.ensureDir(outputDir);
  await fs.writeFile(filepath, content);

  console.log("Generated:", filepath);
}