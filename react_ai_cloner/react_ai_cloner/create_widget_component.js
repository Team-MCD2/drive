import fs from 'fs';

const jsxContent = fs.readFileSync('widget_jsx.txt', 'utf8');

const componentCode = `import React, { useEffect } from 'react';

export default function TrustIndexWidget() {
  useEffect(() => {
    const tiScriptId = 'trustindex-widget-wp-script';
    let script = document.getElementById(tiScriptId);
    if (script) {
      script.remove();
    }
    script = document.createElement('script');
    script.id = tiScriptId;
    script.src = "https://cdn.trustindex.io/loader.js?wp-widget";
    script.defer = true;
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return (
    <div className="trustindex-widget-wrapper">
      ${jsxContent}
    </div>
  );
}
`;

fs.writeFileSync('generated/src/components/TrustIndexWidget.jsx', componentCode);
console.log("TrustIndexWidget.jsx created successfully!");
