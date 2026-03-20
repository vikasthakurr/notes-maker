// ==================== Configuration ====================
const API_ENDPOINTS = {
  notes: "/api/generate",
  slides: "/api/generate-slides"
};

// ==================== State ====================
let appMode = "notes"; 
let currentMarkdown = "";
let currentSlides = null; 
let currentTopic = "";
let selectedStyle = "detailed";
let currentSlideIndex = 0;
let presentationData = null;

// ==================== DOM Elements ====================
const generateForm = document.getElementById("generateForm");
const modeNotesBtn = document.getElementById("modeNotesBtn");
const modeSlidesBtn = document.getElementById("modeSlidesBtn");
const styleSelectorContainer = document.getElementById("styleSelectorContainer");
const generateBtnText = document.getElementById("generateBtnText");
const topicInput = document.getElementById("topicInput");
const apiKeyInput = document.getElementById("apiKeyInput");
const toggleApiKeyBtn = document.getElementById("toggleApiKey");
const eyeIcon = document.getElementById("eyeIcon");
const themeToggle = document.getElementById("themeToggle");
const sunIcon = document.getElementById("sunIcon");
const moonIcon = document.getElementById("moonIcon");
const generateBtn = document.getElementById("generateBtn");
const loadingState = document.getElementById("loadingState");
const loadingText = document.getElementById("loadingText");
const loadingTopic = document.getElementById("loadingTopic");
const errorState = document.getElementById("errorState");
const errorMessage = document.getElementById("errorMessage");
const resultSection = document.getElementById("resultSection");
const resultTitle = document.getElementById("resultTitle");
const notesContainer = document.getElementById("notesContainer");
const notesContent = document.getElementById("notesContent");
const slidesContainer = document.getElementById("slidesContainer");
const slidesContent = document.getElementById("slidesContent");
const exportMdBtn = document.getElementById("exportMdBtn");
const exportPdfBtn = document.getElementById("exportPdfBtn");
const exportDocxBtn = document.getElementById("exportDocxBtn");
const exportPptxBtn = document.getElementById("exportPptxBtn");
const styleBtns = document.querySelectorAll(".style-btn");

// ==================== Theme Handling ====================
function initTheme() {
  const savedTheme = localStorage.getItem("theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);
  updateThemeUI(savedTheme);
}

function updateThemeUI(theme) {
  if (theme === "dark") {
    sunIcon.classList.add("hidden");
    moonIcon.classList.remove("hidden");
  } else {
    sunIcon.classList.remove("hidden");
    moonIcon.classList.add("hidden");
  }
}

themeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
  updateThemeUI(next);
});

// ==================== Configuration ====================
if (window.marked) {
    marked.setOptions({
        breaks: true,
        gfm: true,
        headerIds: true
    });
}

// ==================== API Key Handling ====================
const SAVED_KEY = localStorage.getItem("gemini_api_key");
if (SAVED_KEY) {
  apiKeyInput.value = SAVED_KEY;
}

toggleApiKeyBtn.addEventListener("click", () => {
  const isPassword = apiKeyInput.type === "password";
  apiKeyInput.type = isPassword ? "text" : "password";
});

// ==================== App Mode Toggle ====================
function setAppMode(mode) {
  appMode = mode;
  if (mode === "notes") {
    modeNotesBtn.classList.add("bg-primary-500", "text-white", "shadow-lg");
    modeNotesBtn.classList.remove("opacity-50");
    modeSlidesBtn.classList.add("opacity-50");
    modeSlidesBtn.classList.remove("bg-primary-500", "text-white", "shadow-lg");
    
    styleSelectorContainer.classList.remove("hidden");
    generateBtnText.textContent = "Initialize Generation";
    loadingText.textContent = "Forging your technical notes...";
  } else {
    modeSlidesBtn.classList.add("bg-primary-500", "text-white", "shadow-lg");
    modeSlidesBtn.classList.remove("opacity-50");
    modeNotesBtn.classList.add("opacity-50");
    modeNotesBtn.classList.remove("bg-primary-500", "text-white", "shadow-lg");
    
    styleSelectorContainer.classList.add("hidden");
    generateBtnText.textContent = "Build Presentation";
    loadingText.textContent = "Designing your presentation slides...";
  }
}

modeNotesBtn.addEventListener("click", () => setAppMode("notes"));
modeSlidesBtn.addEventListener("click", () => setAppMode("slides"));

// ==================== Style Selector ====================
styleBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    styleBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    selectedStyle = btn.dataset.style;
  });
});

// ==================== UI Helpers ====================
function showLoading(topic) {
  loadingTopic.textContent = `Current Objective: ${topic}`;
  loadingState.classList.remove("hidden");
  generateBtn.disabled = true;
  generateBtn.style.opacity = "0.5";
  errorState.classList.add("hidden");
  resultSection.classList.add("hidden");
}

function hideLoading() {
  loadingState.classList.add("hidden");
  generateBtn.disabled = false;
  generateBtn.style.opacity = "1";
}

function showError(msg) {
  errorMessage.textContent = msg;
  errorState.classList.remove("hidden");
  hideLoading();
}

function hideError() {
  errorState.classList.add("hidden");
}

function resetUI() {
  resultSection.classList.add("hidden");
  topicInput.value = "";
  topicInput.focus();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ==================== API Calls ====================
generateForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const topic = topicInput.value.trim();
  const apiKey = apiKeyInput.value.trim();

  if (!topic) return;
  if (!apiKey) {
    showError("A valid Gemini Cloud API Key is required to proceed.");
    return;
  }

  localStorage.setItem("gemini_api_key", apiKey);
  currentTopic = topic;
  showLoading(topic);

  try {
    const endpoint = API_ENDPOINTS[appMode];
    const payload = appMode === "notes" ? { topic, style: selectedStyle } : { topic };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "X-API-Key": apiKey
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Generation Cycle Interrupted");
    }

    if (appMode === "notes") {
      currentMarkdown = data.notes;
      renderNotes(data.notes, topic);
    } else {
      currentSlides = data;
      renderSlides(data, topic);
    }
  } catch (err) {
    showError(err.message);
  }
});

// ==================== Render Notes (Markdown) ====================
function renderNotes(markdown, topic) {
  if (window.marked) {
      notesContent.innerHTML = marked.parse(markdown);
  } else {
      notesContent.innerHTML = markdown.replace(/\n/g, '<br>');
  }
  
  // Add copy buttons to code blocks
  notesContent.querySelectorAll("pre").forEach(pre => {
    pre.style.position = "relative";
    const btn = document.createElement("button");
    btn.className = "copy-btn";
    btn.textContent = "Copy";
    btn.onclick = () => {
        const code = pre.querySelector("code");
        navigator.clipboard.writeText(code ? code.innerText : pre.innerText);
        btn.textContent = "Copied!";
        setTimeout(() => btn.textContent = "Copy", 2000);
    };
    pre.appendChild(btn);
  });

  resultTitle.textContent = topic;
  notesContainer.classList.remove("hidden");
  slidesContainer.classList.add("hidden");
  exportMdBtn.classList.remove("hidden");
  exportPdfBtn.classList.remove("hidden");
  exportDocxBtn.classList.remove("hidden");
  exportPptxBtn.classList.add("hidden");
  
  hideLoading();
  resultSection.classList.remove("hidden");
  resultSection.scrollIntoView({ behavior: "smooth" });
}

// ==================== Render Slides ====================
function renderSlides(data, topic) {
    presentationData = data;
    const slides = data.slides || [];
    currentSlideIndex = 0;

    slidesContent.innerHTML = `
        <div class="slide-viewer">
            <div class="slide-sidebar">
                <div class="sidebar-header">
                    <span class="text-[10px] font-black uppercase opacity-40">Slides</span>
                </div>
                <div id="thumbList" class="thumbnail-list"></div>
            </div>
            <div class="slide-main">
                <div id="slideCanvas" class="slide-canvas"></div>
                <div class="slide-nav">
                    <button id="prevBtn" class="slide-nav-btn">&larr;</button>
                    <span id="slideIndicator" class="text-xs font-bold opacity-50"></span>
                    <button id="nextBtn" class="slide-nav-btn">&rarr;</button>
                </div>
            </div>
        </div>
    `;

    const thumbList = document.getElementById("thumbList");
    slides.forEach((slide, i) => {
        const thumb = document.createElement("div");
        thumb.className = `slide-thumb ${i === 0 ? 'active' : ''}`;
        thumb.innerHTML = `<div class="thumb-title">${slide.title}</div>`;
        thumb.onclick = () => goToSlide(i);
        thumbList.appendChild(thumb);
    });

    document.getElementById("prevBtn").onclick = () => goToSlide(currentSlideIndex - 1);
    document.getElementById("nextBtn").onclick = () => goToSlide(currentSlideIndex + 1);

    goToSlide(0);

    resultTitle.textContent = topic;
    notesContainer.classList.add("hidden");
    slidesContainer.classList.remove("hidden");
    exportPdfBtn.classList.add("hidden");
    exportDocxBtn.classList.add("hidden");
    exportPptxBtn.classList.remove("hidden");

    hideLoading();
    resultSection.classList.remove("hidden");
    resultSection.scrollIntoView({ behavior: "smooth" });
}

function goToSlide(index) {
    const slides = presentationData.slides || [];
    if (index < 0 || index >= slides.length) return;
    currentSlideIndex = index;
    const slide = slides[index];

    const canvas = document.getElementById("slideCanvas");
    canvas.innerHTML = `
        <div class="w-full max-w-3xl animate-fade-in">
            <h2 class="text-5xl font-black mb-10" style="color: ${slide.accent || 'var(--primary-color)'}">${slide.title}</h2>
            <ul class="space-y-6">
                ${(slide.bullets || []).map(b => `
                    <li class="flex items-start gap-4 text-xl opacity-80">
                        <span class="mt-2 w-2 h-2 rounded-full bg-primary-500 shrink-0"></span>
                        ${b}
                    </li>
                `).join('')}
            </ul>
            ${slide.code ? `
                <div class="mt-12 bg-black/50 rounded-2xl p-6 border border-white/5">
                    <pre class="text-sm font-mono leading-relaxed"><code>${slide.code}</code></pre>
                </div>
            ` : ''}
        </div>
    `;

    document.getElementById("slideIndicator").textContent = `${index + 1} / ${slides.length}`;
    document.querySelectorAll(".slide-thumb").forEach((t, i) => {
        t.classList.toggle("active", i === index);
        if (i === index) t.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
}

// ==================== Export Handlers ====================
exportMdBtn.onclick = () => {
    if (!currentMarkdown) return;
    const blob = new Blob([currentMarkdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentTopic.replace(/\s+/g, '_')}_Notes.md`;
    a.click();
    URL.revokeObjectURL(url);
};

exportPdfBtn.onclick = async () => {
    if (!window.html2pdf) {
        showError("PDF Export library not loaded. Please refresh.");
        return;
    }
    
    const originalText = exportPdfBtn.innerHTML;
    exportPdfBtn.innerHTML = `<span>Exporting...</span>`;
    exportPdfBtn.disabled = true;

    try {
        const opt = {
            margin: [20, 20],
            filename: `${currentTopic.replace(/\s+/g, '_')}_Notes.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
                scale: 2, 
                useCORS: true, 
                letterRendering: true,
                backgroundColor: '#ffffff',
                logging: false
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };
        
        // Setup a dedicated, high-fidelity container for PDF rendering
        const pdfContainer = document.createElement("div");
        pdfContainer.className = "prose-custom";
        pdfContainer.style.background = "#ffffff";
        pdfContainer.style.color = "#1a1a1a";
        pdfContainer.style.width = "750px"; // Optimized width for A4
        pdfContainer.style.padding = "40px";
        pdfContainer.style.fontSize = "14px";
        pdfContainer.style.lineHeight = "1.6";
        
        // Deep copy the content
        pdfContainer.innerHTML = notesContent.innerHTML;
        
        // Force high-contrast styles for PDF-specific elements
        pdfContainer.querySelectorAll("h1").forEach(h => { h.style.color = "#4f46e5"; h.style.fontSize = "28pt"; h.style.marginBottom = "20pt"; });
        pdfContainer.querySelectorAll("h2").forEach(h => { h.style.color = "#4f46e5"; h.style.fontSize = "20pt"; h.style.borderBottom = "1px solid #e5e7eb"; h.style.paddingBottom = "5pt"; h.style.marginTop = "25pt"; });
        pdfContainer.querySelectorAll("h3").forEach(h => { h.style.color = "#6366f1"; h.style.fontSize = "16pt"; h.style.marginTop = "15pt"; });

        // Fix "black box" code block issue
        pdfContainer.querySelectorAll("pre").forEach(pre => {
            pre.style.background = "#f8fafc"; // Very light solid gray
            pre.style.color = "#1e293b";
            pre.style.padding = "15pt";
            pre.style.borderRadius = "8pt";
            pre.style.border = "1px solid #e2e8f0";
            pre.style.margin = "15pt 0";
            pre.style.overflow = "visible";
            pre.style.whiteSpace = "pre-wrap";
            pre.style.wordBreak = "break-all";
            
            const code = pre.querySelector("code");
            if (code) {
                code.style.background = "transparent";
                code.style.color = "inherit";
                code.style.fontFamily = "'JetBrains Mono', monospace";
            }
            // Remove interactive elements
            const copyBtn = pre.querySelector(".copy-btn");
            if (copyBtn) copyBtn.remove();
        });

        // Style inline code
        pdfContainer.querySelectorAll("code").forEach(c => {
            if (c.parentElement.tagName !== "PRE") {
                c.style.background = "#f1f5f9";
                c.style.color = "#4f46e5";
                c.style.padding = "2pt 4pt";
                c.style.borderRadius = "3pt";
            }
        });

        // Ensure images are sized correctly for the PDF
        pdfContainer.querySelectorAll("img").forEach(img => {
            img.style.maxWidth = "100%";
            img.style.height = "auto";
            img.style.borderRadius = "10pt";
            img.style.margin = "20pt 0";
            img.style.boxShadow = "none"; // Shadows often glitch in html2canvas
        });

        // Wait for all images to settle
        const images = pdfContainer.querySelectorAll("img");
        if (images.length > 0) {
            await Promise.all([...images].map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise(resolve => {
                    img.onload = resolve;
                    img.onerror = resolve;
                });
            }));
        }

        // Add a small delay for layouts to stabilize
        await new Promise(r => setTimeout(r, 500));

        await html2pdf().set(opt).from(pdfContainer).save();
    } catch (err) {
        console.error("PDF Export Critical Error:", err);
        showError("PDF Export failed to complete.");
    } finally {
        exportPdfBtn.innerHTML = originalText;
        exportPdfBtn.disabled = false;
    }
};

exportDocxBtn.onclick = async () => {
    try {
        const res = await fetch("/api/export/docx", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ html: notesContent.innerHTML, title: currentTopic }),
        });
        if (!res.ok) throw new Error("DOCX Export Failed");
        
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${currentTopic.replace(/\s+/g, '_')}_Notes.docx`;
        a.click();
    } catch (err) {
        showError("DOCX Export Service unavailable.");
    }
};

exportPptxBtn.onclick = () => {
    if (!window.PptxGenJS) {
        showError("Presentation library not loaded.");
        return;
    }
    if (!presentationData || !presentationData.slides) return;

    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_16x9';

    // Title Slide
    const titleSlide = pptx.addSlide();
    titleSlide.background = { color: '070715' };
    titleSlide.addText(presentationData.title || currentTopic, {
        x: '10%', y: '40%', w: '80%',
        fontSize: 44, bold: true, color: '7c3aed', align: 'center'
    });
    if (presentationData.subtitle) {
        titleSlide.addText(presentationData.subtitle, {
            x: '10%', y: '55%', w: '80%',
            fontSize: 24, color: '94a3b8', align: 'center'
        });
    }

    // Content Slides
    presentationData.slides.forEach(slide => {
        const s = pptx.addSlide();
        s.background = { color: '070715' };
        
        // Header
        s.addText(slide.title, {
            x: '5%', y: '5%', w: '90%',
            fontSize: 32, bold: true, color: (slide.accent || '7c3aed').replace('#', ''),
            border: { type: 'none' }
        });

        // Bullets
        if (slide.bullets && slide.bullets.length > 0) {
            s.addText(slide.bullets.map(b => `• ${b}`), {
                x: '5%', y: '25%', w: '50%', h: '60%',
                fontSize: 18, color: 'f1f5f9', bullet: true, lineSpacing: 28
            });
        }

        // Code or Image placeholder
        if (slide.code) {
            s.addText(slide.code, {
                x: '60%', y: '25%', w: '35%', h: '60%',
                fontSize: 12, color: 'cdd6f4', fontFace: 'Courier New',
                fill: { color: '0d0d1a' },
                valign: 'top', margin: 10
            });
        }
    });

    pptx.writeFile({ fileName: `${currentTopic.replace(/\s+/g, '_')}_Presentation.pptx` });
};

initTheme();
