const promptInput = document.getElementById('prompt');
const generateBtn = document.getElementById('generateBtn');
const preview = document.getElementById('previewFrame'); // ensure ID matches iframe
const statusIcon = document.getElementById('statusIcon');
const statusText = document.getElementById('statusText');

function setExample(text) {
    if (promptInput) {
        promptInput.value = text;
        promptInput.focus();
    }
}

function updateStatus(message, type = 'idle') {
    if (statusText) statusText.textContent = message;
    if (statusIcon) statusIcon.className = `status-icon status-${type}`;

    if (type === 'loading') {
        preview.classList.add('loading');
    } else {
        preview.classList.remove('loading');
    }
}

function updateButtonState(loading = false) {
    generateBtn.disabled = loading;
    const btnText = generateBtn.querySelector('.btn-text');

    if (btnText) {
        btnText.innerHTML = loading
            ? `<div class="loading-spinner"></div>Generating...`
            : `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z"/>
            </svg>
            Generate UI Components
        `;
    }
}

async function generateUI() {
    const prompt = promptInput.value.trim();
    if (!prompt) {
        alert("Please enter a UI description");
        return;
    }

    updateButtonState(true);
    updateStatus("🔄 Connecting to AI service...", 'loading');

    try {
        const response = await fetch("http://localhost:8000/preview", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: prompt })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        updateStatus("🎨 Generating UI components...", 'loading');

        const html = await response.text();

        if (!html || !html.trim()) {
            throw new Error("No HTML content received from server");
        }

        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        preview.src = url;

        preview.onload = () => {
            try {
                const doc = preview.contentDocument || preview.contentWindow.document;
                const height = doc.body.scrollHeight + 60;
                preview.style.height = height + 'px';
            } catch (err) {
                console.warn("⚠️ Unable to resize iframe:", err);
            }
        };

        updateStatus("✅ UI components generated successfully!", 'success');
        setTimeout(() => updateStatus("Ready to generate UI components", 'idle'), 3000);

    } catch (error) {
        console.error("Generation error:", error);
        updateStatus(`❌ Error: ${error.message}`, 'error');
        setTimeout(() => updateStatus("Ready to generate UI components", 'idle'), 5000);
    } finally {
        updateButtonState(false);
    }
}

generateBtn.addEventListener('click', generateUI);
promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        generateUI();
    }
});

promptInput.focus();

// 🌗 Theme Toggle
const themeToggle = document.getElementById('themeToggle');
const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
const currentTheme = localStorage.getItem('theme') || (prefersDarkScheme.matches ? 'dark' : 'light');

function setThemeIcon(isDark) {
    if (!themeToggle) return;
    themeToggle.innerHTML = isDark
        ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12,18C11.11,18 10.26,17.8 9.5,17.45C11.56,16.5 13,14.42 13,12C13,9.58 11.56,7.5 9.5,6.55C10.26,6.2 11.11,6 12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18Z"/></svg>`
        : `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12,3A9,9 0 0,0 3,12A9,9 0 0,0 12,21A9,9 0 0,0 21,12A9,9 0 0,0 12,3Z"/></svg>`;
}

if (currentTheme === 'dark') {
    document.body.classList.add('dark-mode');
    setThemeIcon(true);
} else {
    setThemeIcon(false);
}

themeToggle.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    setThemeIcon(isDark);
});

function resizeIframe(iframe) {
            try {
                const doc = iframe.contentDocument || iframe.contentWindow.document;
                const newHeight = doc.body.scrollHeight + 30;
                iframe.style.height = newHeight + "px";
            } catch (err) {
                console.warn("⚠️ Could not resize iframe:", err);
            }
        }