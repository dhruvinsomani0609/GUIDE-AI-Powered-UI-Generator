// GUIDE Plugin with Smart LLM-Driven UI Rendering + Live Preview

const UI_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body {
      font-family: Inter, sans-serif;
      margin: 20px;
      background: #f8f9fa;
    }
    .container {
      max-width: 360px;
    }
    h3 {
      margin-top: 0;
      color: #1a1a1a;
    }
    textarea {
      width: 100%;
      height: 100px;
      margin-bottom: 15px;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-family: Inter, sans-serif;
      font-size: 14px;
      resize: vertical;
    }
    button {
      width: 100%;
      padding: 12px 20px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: background 0.2s;
    }
    button:hover {
      background: #0056b3;
    }
    button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    #status {
      margin-top: 15px;
      font-size: 13px;
      color: #666;
      padding: 8px;
      border-radius: 4px;
      min-height: 20px;
    }
    .status-loading {
      background: #e3f2fd;
      color: #1976d2;
    }
    .status-success {
      background: #e8f5e8;
      color: #2e7d32;
    }
    .status-error {
      background: #ffebee;
      color: #d32f2f;
    }
    .debug {
      margin-top: 10px;
      padding: 8px;
      background: #f5f5f5;
      border-radius: 4px;
      font-size: 12px;
      font-family: monospace;
      max-height: 100px;
      overflow-y: auto;
    }
    iframe {
      width: 100%;
      height: 300px;
      margin-top: 15px;
      border: 1px solid #ccc;
      border-radius: 4px;
      background: white;
    }
  </style>
</head>
<body>
  <div class="container">
    <h3>UI Generator</h3>
    <textarea id="prompt" placeholder="Describe the UI you want to create..."></textarea>
    <button id="genBtn">Generate UI Components</button>
    <div id="status"></div>
    <div id="debug" class="debug" style="display: none;"></div>
    <h3>Live Preview</h3>
    <iframe id="previewFrame"></iframe>
  </div>

  <script>
    const button = document.getElementById("genBtn");
    const input = document.getElementById("prompt");
    const status = document.getElementById("status");
    const debug = document.getElementById("debug");
    const preview = document.getElementById("previewFrame");

    function setStatus(message, type = '') {
      status.textContent = message;
      status.className = type ? \`status-\${type}\` : '';
    }

    function showDebug(data) {
      debug.style.display = 'block';
      debug.textContent = JSON.stringify(data, null, 2);
    }

    button.onclick = async () => {
      const text = input.value.trim();
      if (!text) {
        alert("Please enter a UI description");
        return;
      }

      button.disabled = true;
      setStatus("⏳ Generating UI components...", 'loading');
      debug.style.display = 'none';
      preview.src = ''; // Reset

      parent.postMessage({ pluginMessage: { type: 'generate', text } }, '*');
    };

    window.onmessage = (event) => {
      const msg = event.data.pluginMessage;

      if (msg.type === "status") {
        setStatus(msg.message, msg.statusType || '');
        if (msg.debug) showDebug(msg.debug);
        button.disabled = false;
      } 
      else if (msg.type === "success") {
        setStatus(\`✅ Generated \${msg.count} components successfully!\`, 'success');
        button.disabled = false;

        if (msg.html) {
          const blob = new Blob([msg.html], { type: "text/html" });
          const url = URL.createObjectURL(blob);
          preview.src = url;
        }
      } 
      else if (msg.type === "error") {
        setStatus(\`❌ Error: \${msg.message}\`, 'error');
        if (msg.debug) showDebug(msg.debug);
        button.disabled = false;
      }
    };

    input.focus();
  </script>
</body>
</html>
`;

figma.showUI(UI_HTML, { width: 420, height: 720 });

figma.ui.onmessage = async (msg) => {
  if (!msg || msg.type !== 'generate' || !msg.text) {
    figma.ui.postMessage({ type: 'error', message: 'No prompt received' });
    return;
  }

  try {
    figma.ui.postMessage({
      type: 'status',
      message: 'Connecting to AI service...',
      statusType: 'loading'
    });

    const response = await fetch("http://localhost:8000/preview", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: msg.text })
    });

    // const data = await response.json();
    // const htmlString = data.html || data.generated_html || data.content;
    // if (!htmlString) throw new Error("No HTML content returned.");
    const htmlString = await response.text();
    if (!htmlString || !htmlString.trim()) {
      throw new Error("No HTML content returned.");
    }


    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    await generateFromHTML(htmlString);

    figma.ui.postMessage({
      type: 'success',
      html: htmlString,
      count: 1
    });

    figma.notify('✅ Created UI from HTML');

  } catch (error) {
    figma.ui.postMessage({
      type: 'error',
      message: error.message,
      debug: error.stack
    });

    figma.notify('❌ Failed to generate UI from HTML');
  }
};

async function generateFromHTML(htmlString) {
  const nodes = [];
  let yOffset = 0;

  // Use regex to extract basic tags manually
  const elements = [...htmlString.matchAll(/<(h1|h2|h3|label|input|button)[^>]*>(.*?)<\/\1>|<(input)[^>]*\/?>/gi)];

  for (const match of elements) {
    const tag = match[1] || match[3]; // e.g., 'h1', 'input', etc.
    const content = match[2] || "";   // inner text for text tags

    let node;

    if (["h1", "h2", "h3", "label"].includes(tag.toLowerCase())) {
      node = figma.createText();
      node.characters = content.trim() || "Label";
      node.fontSize = 16;
      await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    } else if (tag.toLowerCase() === "input") {
      node = figma.createRectangle();
      node.resize(200, 40);
      node.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
      node.strokes = [{ type: "SOLID", color: { r: 0.7, g: 0.7, b: 0.7 } }];
    } else if (tag.toLowerCase() === "button") {
      const colorMatch = match[0].match(/background-color:\s*(#[0-9a-fA-F]{3,6}|red)/i);
      const isRed = /class=["'].*red.*["']/.test(match[0]) || (colorMatch && /red|#f00|#ff0000/i.test(colorMatch[1]));

      const frame = figma.createFrame();
      frame.resize(200, 40);
      frame.fills = [{
        type: "SOLID",
        color: isRed ? { r: 1, g: 0, b: 0 } : { r: 0, g: 0.48, b: 1 }
      }];

      const text = figma.createText();
      text.characters = content.trim() || "Button";
      text.fontSize = 14;
      text.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
      await figma.loadFontAsync({ family: "Inter", style: "Regular" });

      frame.appendChild(text);
      text.x = 10;
      text.y = 10;

      node = frame;
    }

    if (node) {
      node.x = 100;
      node.y = yOffset;
      yOffset += 60;
      figma.currentPage.appendChild(node);
      nodes.push(node);
    }
  }

  figma.currentPage.selection = nodes;
  figma.viewport.scrollAndZoomIntoView(nodes);
}
