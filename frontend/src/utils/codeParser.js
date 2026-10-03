/**
 * Code and Markdown parser utility for Cortex AI
 */

/**
 * Extracts all fenced code blocks from markdown text.
 * @param {string} text 
 * @returns {Array<{ language: string, code: string, title?: string, isPreviewable: boolean }>}
 */
export const extractCodeBlocks = (text) => {
  if (!text || typeof text !== 'string') return [];

  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  const blocks = [];
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    const lang = (match[1] || 'text').toLowerCase();
    const code = match[2].trim();
    
    // Check if previewable in artifact preview iframe
    const previewableLangs = ['html', 'htm', 'xml', 'svg', 'javascript', 'js', 'jsx', 'tsx', 'css'];
    const hasHtmlTags = /<[a-z][\s\S]*>/i.test(code);
    const isPreviewable = previewableLangs.includes(lang) || hasHtmlTags;

    let inferredTitle = 'Generated Code';
    if (lang === 'html' || lang === 'htm') inferredTitle = 'HTML Component';
    else if (lang === 'jsx' || lang === 'tsx') inferredTitle = 'React Component';
    else if (lang === 'svg') inferredTitle = 'Vector Graphic';
    else if (lang === 'javascript' || lang === 'js') inferredTitle = 'JavaScript Script';
    else if (lang === 'python' || lang === 'py') inferredTitle = 'Python Algorithm';
    else if (lang === 'css') inferredTitle = 'Stylesheet';

    // Try to extract title from comments
    const titleComment = code.match(/^\/\/\s*(?:Title|Name):\s*(.+)$/m) || code.match(/^<!--\s*(?:Title|Name):\s*(.+)\s*-->/m);
    if (titleComment && titleComment[1]) {
      inferredTitle = titleComment[1].trim();
    }

    blocks.push({
      language: lang || 'javascript',
      code,
      title: inferredTitle,
      isPreviewable,
    });
  }

  return blocks;
};

/**
 * Generates an executable HTML string for iframe srcDoc
 * Supports standard HTML/CSS/JS and React JSX components via Babel standalone
 */
export const buildPreviewHtml = (code, language = 'html') => {
  if (!code) return '';

  const cleanLang = (language || 'html').toLowerCase();

  // If already a full HTML document
  if (code.includes('<!DOCTYPE html>') || (code.includes('<html') && code.includes('</html>'))) {
    return code;
  }

  // If SVG
  if (cleanLang === 'svg' || (code.trim().startsWith('<svg') && code.trim().endsWith('</svg>'))) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      margin: 0;
      padding: 32px;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #090d16;
      color: #fff;
      font-family: system-ui, sans-serif;
    }
    svg {
      max-width: 90%;
      max-height: 80vh;
      filter: drop-shadow(0 10px 25px rgba(0,0,0,0.5));
    }
  </style>
</head>
<body>
  ${code}
</body>
</html>`;
  }

  // If React JSX
  if (cleanLang === 'jsx' || cleanLang === 'tsx' || code.includes('import React') || code.includes('export default function')) {
    // Clean imports/exports for client-side standalone execution
    const cleanedCode = code
      .replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?/g, '')
      .replace(/export\s+default\s+/g, 'const App = ')
      .replace(/export\s+/g, '');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body {
      margin: 0;
      padding: 20px;
      min-height: 100vh;
      background: #090d16;
      color: #f1f5f9;
      font-family: system-ui, -apple-system, sans-serif;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    ${cleanedCode}

    // Mount Component
    if (typeof App !== 'undefined') {
      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(<App />);
    } else {
      document.getElementById('root').innerHTML = '<div style="color:#ef4444;padding:20px;">Could not find default exported component "App".</div>';
    }
  </script>
</body>
</html>`;
  }

  // If HTML snippet with potential script/styles
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px;
      min-height: 100vh;
      background: #090d16;
      color: #f8fafc;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
  </style>
</head>
<body>
  ${code}
</body>
</html>`;
};

/**
 * Basic markdown parser to render message content nicely with formatting,
 * inline code, links, and code blocks
 */
export const parseMarkdownSegments = (text) => {
  if (!text) return [];

  const segments = [];
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    // Add text preceding code block
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
      });
    }

    const lang = (match[1] || 'text').toLowerCase();
    const code = match[2];
    segments.push({
      type: 'code',
      language: lang,
      content: code,
    });

    lastIndex = match.index + match[0].length;
  }

  // Add trailing text or handle unclosed code block during streaming
  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex);
    const unclosedMatch = remaining.match(/^([\s\S]*?)```([a-zA-Z0-9_-]*)\n([\s\S]*)$/);
    if (unclosedMatch) {
      if (unclosedMatch[1]) {
        segments.push({
          type: 'text',
          content: unclosedMatch[1],
        });
      }
      segments.push({
        type: 'code',
        language: (unclosedMatch[2] || 'text').toLowerCase(),
        content: unclosedMatch[3],
        isIncomplete: true,
      });
    } else {
      segments.push({
        type: 'text',
        content: remaining,
      });
    }
  }

  return segments;
};
