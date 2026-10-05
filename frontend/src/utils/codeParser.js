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
    const previewableLangs = [
      'html', 'htm', 'xml', 'svg', 'javascript', 'js', 'jsx', 'tsx', 'css',
      'pdf', 'ppt', 'presentation', 'slides', 'document'
    ];
    const hasHtmlTags = /<[a-z][\s\S]*>/i.test(code);
    const isPreviewable = previewableLangs.includes(lang) || hasHtmlTags;

    let inferredTitle = 'Generated Code';
    if (lang === 'pdf' || (hasHtmlTags && (/page-break|@media\s+print|pdf-document|invoice|a4/i.test(code)))) {
      inferredTitle = 'Printable PDF Document';
    } else if (lang === 'ppt' || lang === 'slides' || lang === 'presentation' || (hasHtmlTags && (/slide|deck|presentation|currentSlide/i.test(code)))) {
      inferredTitle = 'Interactive Presentation Deck';
    } else if (lang === 'html' || lang === 'htm') {
      inferredTitle = 'Interactive Component';
    } else if (lang === 'jsx' || lang === 'tsx') {
      inferredTitle = 'React Component';
    } else if (lang === 'svg') {
      inferredTitle = 'Vector Graphic';
    } else if (lang === 'javascript' || lang === 'js') {
      inferredTitle = 'JavaScript Script';
    } else if (lang === 'python' || lang === 'py') {
      inferredTitle = 'Python Algorithm';
    } else if (lang === 'css') {
      inferredTitle = 'Stylesheet';
    }

    // Try to extract title from comments
    const titleComment = code.match(/^\/\/\s*(?:Title|Name):\s*(.+)$/m) || code.match(/^<!--\s*(?:Title|Name):\s*(.+)\s*-->/m);
    if (titleComment && titleComment[1]) {
      inferredTitle = titleComment[1].trim();
    }

    blocks.push({
      language: lang === 'pdf' || lang === 'ppt' ? 'html' : (lang || 'html'),
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
    // Inject click interceptor for presentations previewed inside an iframe
    const iframeInterceptor = `
<script>
  (function() {
    if (window.self !== window.top) {
      document.addEventListener('click', function(e) {
        const target = e.target.closest('button, a, [role="button"]');
        if (!target) return;
        const text = (target.textContent || '').trim().toLowerCase();
        const id = (target.id || '').toLowerCase();
        const cls = (target.className || '').toString().toLowerCase();
        if (text.includes('present') || id.includes('present') || cls.includes('present') ||
            text.includes('fullscreen') || id.includes('fullscreen')) {
          e.preventDefault();
          e.stopPropagation();
          try {
            window.parent.postMessage({ type: 'CORTEX_PRESENT_NEW_TAB' }, '*');
          } catch(err) {}
        }
      }, true);
    }
  })();
</script>
`;
    if (code.includes('</body>')) {
      return code.replace('</body>', `${iframeInterceptor}</body>`);
    }
    return code + iframeInterceptor;
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
 * Builds standalone presentation HTML for opening in a new tab.
 * Injects a floating "Return to Cortex AI Chat" button so the user can easily
 * close the tab and return to their conversation without losing chat context.
 */
export const buildPresentationNewTabHtml = (code, language = 'html', title = 'Interactive Presentation Deck') => {
  let baseHtml = buildPreviewHtml(code, language);

  const returnBanner = `
<div id="cortex-return-banner" style="position:fixed;top:14px;left:16px;z-index:9999999;display:flex;align-items:center;gap:10px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;pointer-events:auto;">
  <button id="cortex-close-btn" title="Close presentation and return to Cortex AI Chat" style="display:flex;align-items:center;gap:8px;padding:8px 16px;border-radius:9999px;background:rgba(15,23,42,0.92);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.22);color:#f1f5f9;font-size:12px;font-weight:600;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,0.5);transition:all 0.2s;">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
    <span id="cortex-close-text">← Return to Cortex AI Chat</span>
  </button>
  <span style="font-size:11px;color:rgba(255,255,255,0.6);background:rgba(0,0,0,0.45);padding:4px 10px;border-radius:9999px;backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.08);">
    New Tab &bull; Press ESC to exit fullscreen
  </span>
</div>
<script>
  (function() {
    const btn = document.getElementById('cortex-close-btn');
    const txt = document.getElementById('cortex-close-text');
    if (btn) {
      btn.addEventListener('click', function() {
        try {
          window.close();
        } catch(e) {}
        setTimeout(function() {
          if (txt) txt.textContent = 'Switch browser tab to return to Cortex AI';
        }, 300);
      });
    }
  })();
</script>
`;

  // Ensure title is set for browser tab header
  if (!baseHtml.includes('<title>')) {
    if (baseHtml.includes('<head>')) {
      baseHtml = baseHtml.replace('<head>', `<head><title>${title} - Cortex AI</title>`);
    } else {
      baseHtml = `<title>${title} - Cortex AI</title>` + baseHtml;
    }
  }

  // Inject return banner before </body> or at the end
  if (baseHtml.includes('</body>')) {
    return baseHtml.replace('</body>', `${returnBanner}</body>`);
  }
  return baseHtml + returnBanner;
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
