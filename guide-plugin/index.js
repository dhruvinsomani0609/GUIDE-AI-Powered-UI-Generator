const promptInput = document.getElementById('prompt');
        const generateBtn = document.getElementById('generateBtn');
        const preview = document.getElementById('preview');
        const statusIcon = document.getElementById('statusIcon');
        const statusText = document.getElementById('statusText');

        function setExample(text) {
            promptInput.value = text;
            promptInput.focus();
        }

        function updateStatus(message, type = 'idle') {
            statusText.textContent = message;
            statusIcon.className = `status-icon status-${type}`;
            
            if (type === 'loading') {
                preview.classList.add('loading');
            } else {
                preview.classList.remove('loading');
            }
        }

        function updateButtonState(loading = false) {
            generateBtn.disabled = loading;
            const btnText = generateBtn.querySelector('.btn-text');
            
            if (loading) {
                btnText.innerHTML = `
                    <div class="loading-spinner"></div>
                    Generating...
                `;
            } else {
                btnText.innerHTML = `
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
                    headers: {
                        "Content-Type": "application/json"
                    },
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

                // Create blob URL for iframe
                const blob = new Blob([html], { type: "text/html" });
                const url = URL.createObjectURL(blob);
                preview.src = url;

                updateStatus("✅ UI components generated successfully!", 'success');
                
                // Reset status after 3 seconds
                setTimeout(() => {
                    updateStatus("Ready to generate UI components", 'idle');
                }, 3000);

            } catch (error) {
                console.error('Generation error:', error);
                updateStatus(`❌ Error: ${error.message}`, 'error');
                
                // Reset status after 5 seconds
                setTimeout(() => {
                    updateStatus("Ready to generate UI components", 'idle');
                }, 5000);
            } finally {
                updateButtonState(false);
            }
        }

        // Event listeners
        generateBtn.addEventListener('click', generateUI);
        
        promptInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                generateUI();
            }
        });

        // Focus on prompt input when page loads
        promptInput.focus();