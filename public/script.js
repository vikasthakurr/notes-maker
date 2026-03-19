// ==================== State ====================
let appMode = "notes"; // "notes" | "slides"
let currentMarkdown = "";
let currentSlides = null; // Stores JSON array of slides
let currentTopic = "";
let selectedStyle = "detailed";

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
    if (window.mermaid) mermaid.initialize({ theme: "dark" });
  } else {
    sunIcon.classList.remove("hidden");
    moonIcon.classList.add("hidden");
    if (window.mermaid) mermaid.initialize({ theme: "default" });
  }
}

themeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
  updateThemeUI(next);
});

// ==================== API Key Handling ====================
const SAVED_KEY = localStorage.getItem("gemini_api_key");
if (SAVED_KEY) {
  apiKeyInput.value = SAVED_KEY;
}

toggleApiKeyBtn.addEventListener("click", () => {
  const isPassword = apiKeyInput.type === "password";
  apiKeyInput.type = isPassword ? "text" : "password";
  
  if (isPassword) {
    eyeIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />`;
  } else {
    eyeIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>`;
  }
});

// ==================== App Mode Toggle ====================
function setAppMode(mode) {
  appMode = mode;
  if (mode === "notes") {
    modeNotesBtn.classList.replace("opacity-60", "bg-primary-500");
    modeNotesBtn.classList.replace("hover:opacity-100", "text-white");
    modeSlidesBtn.classList.replace("bg-primary-500", "opacity-60");
    modeSlidesBtn.classList.replace("text-white", "hover:opacity-100");
    
    styleSelectorContainer.classList.remove("hidden");
    generateBtnText.textContent = "Generate Notes";
    loadingText.textContent = "Forging your technical notes...";
  } else {
    modeSlidesBtn.classList.replace("opacity-60", "bg-primary-500");
    modeSlidesBtn.classList.replace("hover:opacity-100", "text-white");
    modeNotesBtn.classList.replace("bg-primary-500", "opacity-60");
    modeNotesBtn.classList.replace("text-white", "hover:opacity-100");
    
    styleSelectorContainer.classList.add("hidden");
    generateBtnText.textContent = "Generate Presentation";
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

// ==================== Configure Marked + Highlight.js ====================
marked.setOptions({
  highlight: function (code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  },
  breaks: true,
  gfm: true,
});

// ==================== UI Helpers ====================
function showLoading(topic) {
  loadingTopic.textContent = `Topic: ${topic}`;
  loadingState.classList.remove("hidden");
  generateBtn.disabled = true;
  generateBtn.classList.add("opacity-50", "cursor-not-allowed");
  errorState.classList.add("hidden");
  resultSection.classList.add("hidden");
}

function hideLoading() {
  loadingState.classList.add("hidden");
  generateBtn.disabled = false;
  generateBtn.classList.remove("opacity-50", "cursor-not-allowed");
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
    showError("Please enter your Gemini API Key to continue.");
    apiKeyInput.focus();
    return;
  }

  // Save key
  localStorage.setItem("gemini_api_key", apiKey);

  currentTopic = topic;
  showLoading(topic);

  try {
    const endpoint = appMode === "notes" ? "/api/generate" : "/api/generate-slides";
    const bodyPayload = appMode === "notes" ? { topic, style: selectedStyle } : { topic };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "X-API-Key": apiKey
      },
      body: JSON.stringify(bodyPayload),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to generate content");
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

// ==================== Configure Mermaid ====================
initTheme();
mermaid.initialize({
  startOnLoad: false,
  theme: localStorage.getItem("theme") === "light" ? "default" : "dark",
  securityLevel: "loose",
  fontFamily: "Inter, sans-serif",
  logLevel: 'error'
});

// ==================== Render Markdown ====================
async function renderNotes(markdown, topic) {
  const html = marked.parse(markdown);
  notesContent.innerHTML = html;

  // Process Mermaid diagrams
  const mermaidBlocks = notesContent.querySelectorAll("pre code.language-mermaid");
  for (let i = 0; i < mermaidBlocks.length; i++) {
    const block = mermaidBlocks[i];
    const pre = block.parentElement;
    const code = sanitizeMermaid(block.textContent);
    const id = `mermaid-diagram-${i}`;

    const diagramDiv = document.createElement("div");
    diagramDiv.id = id;
    diagramDiv.className = "mermaid-container my-8 flex justify-center";
    diagramDiv.innerHTML = code;

    pre.parentElement.replaceChild(diagramDiv, pre);
    try {
      // Attempt to render
      await mermaid.run({ 
        nodes: [diagramDiv],
        suppressErrors: true 
      });
    } catch (err) {
      console.error("Mermaid execution error:", err);
      // Fallback: If it crashes, show the code block again so the user isn't left with nothing
      diagramDiv.innerHTML = `
        <div class="bg-red-900/20 border border-red-500/50 p-4 rounded-lg">
          <p class="text-red-400 text-sm font-bold mb-2">Diagram Rendering Error</p>
          <pre class="text-xs bg-black/50 p-2 overflow-x-auto"><code>${code.trim()}</code></pre>
          <p class="text-gray-400 text-xs mt-2 italic">This usually happens if the AI generated invalid Mermaid syntax. Try regenerating.</p>
        </div>
      `;
    }
  }

  // Add copy buttons to code blocks (excluding mermaid)
  notesContent.querySelectorAll("pre").forEach((pre) => {
    if (pre.querySelector("code.language-mermaid")) return;
    
    pre.style.position = "relative";
    const copyBtn = document.createElement("button");
    copyBtn.className = "copy-btn";
    copyBtn.textContent = "Copy";
    copyBtn.addEventListener("click", () => {
      const code = pre.querySelector("code");
      navigator.clipboard.writeText(code.textContent).then(() => {
        copyBtn.textContent = "Copied!";
        copyBtn.style.color = "#6c63ff";
        setTimeout(() => {
          copyBtn.textContent = "Copy";
          copyBtn.style.color = "";
        }, 2000);
      });
    });
    pre.appendChild(copyBtn);
  });

  resultTitle.textContent = topic;
  notesContainer.classList.remove("hidden");
  slidesContainer.classList.add("hidden");
  exportPdfBtn.classList.remove("hidden");
  exportDocxBtn.classList.remove("hidden");
  exportPptxBtn.classList.add("hidden");
  
  hideLoading();
  resultSection.classList.remove("hidden");

  // Smooth scroll to result
  resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ==================== Render Slides ====================
// ==================== Slideshow State ====================
let currentSlideIndex = 0;
let presentationData = null;

function renderSlides(slidesJson, topic) {
  presentationData = slidesJson;
  const slides = slidesJson.slides || slidesJson;
  currentSlideIndex = 0;

  // Build the full Gamma-like viewer
  slidesContent.innerHTML = `
    <div id="slideViewer" class="slide-viewer">
      <!-- Sidebar thumbnails -->
      <div id="slideSidebar" class="slide-sidebar">
        <div class="sidebar-header">
          <span class="text-[10px] uppercase tracking-widest font-bold opacity-40">Slides</span>
          <span id="slideCounter" class="text-[10px] font-bold opacity-40">1 / ${slides.length}</span>
        </div>
        <div id="thumbnailList" class="thumbnail-list"></div>
      </div>

      <!-- Main slide canvas -->
      <div class="slide-main">
        <div id="slideCanvas" class="slide-canvas"></div>

        <!-- Navigation -->
        <div class="slide-nav">
          <button id="prevSlide" class="slide-nav-btn" title="Previous (←)">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <span id="slideNavLabel" class="text-xs font-semibold opacity-50"></span>
          <button id="nextSlide" class="slide-nav-btn" title="Next (→)">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
          </button>
          <button id="fullscreenBtn" class="slide-nav-btn ml-2" title="Fullscreen (F)">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/></svg>
          </button>
        </div>

        <!-- Speaker notes panel -->
        <div id="speakerNotesPanel" class="speaker-notes-panel hidden">
          <span class="text-[10px] uppercase tracking-widest font-bold opacity-40 mb-1 block">Speaker Notes</span>
          <p id="speakerNotesText" class="text-sm opacity-70 italic leading-relaxed"></p>
        </div>
        <button id="toggleNotes" class="toggle-notes-btn">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M7 8h10M7 12h6m-6 4h10M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"/></svg>
          Notes
        </button>
      </div>
    </div>
  `;

  // Build thumbnails
  const thumbnailList = document.getElementById("thumbnailList");
  slides.forEach((slide, i) => {
    const thumb = document.createElement("div");
    thumb.className = `slide-thumb ${i === 0 ? "active" : ""}`;
    thumb.dataset.index = i;
    thumb.innerHTML = `
      <div class="thumb-number">${i + 1}</div>
      <div class="thumb-title">${slide.title || ""}</div>
      <div class="thumb-type">${slide.type || "content"}</div>
    `;
    thumb.addEventListener("click", () => goToSlide(i));
    thumbnailList.appendChild(thumb);
  });

  // Wire up navigation
  document.getElementById("prevSlide").addEventListener("click", () => goToSlide(currentSlideIndex - 1));
  document.getElementById("nextSlide").addEventListener("click", () => goToSlide(currentSlideIndex + 1));
  document.getElementById("fullscreenBtn").addEventListener("click", toggleFullscreen);
  document.getElementById("toggleNotes").addEventListener("click", () => {
    document.getElementById("speakerNotesPanel").classList.toggle("hidden");
  });

  // Keyboard navigation
  document.addEventListener("keydown", handleSlideKeydown);

  goToSlide(0);

  resultTitle.textContent = `${topic}`;
  notesContainer.classList.add("hidden");
  slidesContainer.classList.remove("hidden");
  exportPdfBtn.classList.add("hidden");
  exportDocxBtn.classList.add("hidden");
  exportPptxBtn.classList.remove("hidden");

  hideLoading();
  resultSection.classList.remove("hidden");
  resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function handleSlideKeydown(e) {
  if (!presentationData) return;
  if (e.key === "ArrowRight" || e.key === "ArrowDown") goToSlide(currentSlideIndex + 1);
  if (e.key === "ArrowLeft" || e.key === "ArrowUp") goToSlide(currentSlideIndex - 1);
  if (e.key === "f" || e.key === "F") toggleFullscreen();
}

function goToSlide(index) {
  const slides = presentationData.slides || presentationData;
  if (index < 0 || index >= slides.length) return;
  currentSlideIndex = index;
  const slide = slides[index];

  // Update canvas
  const canvas = document.getElementById("slideCanvas");
  canvas.innerHTML = buildSlideHTML(slide, index, slides.length);

  // Update thumbnails
  document.querySelectorAll(".slide-thumb").forEach((t, i) => {
    t.classList.toggle("active", i === index);
    if (i === index) t.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });

  // Update counter & nav label
  document.getElementById("slideCounter").textContent = `${index + 1} / ${slides.length}`;
  document.getElementById("slideNavLabel").textContent = `${index + 1} of ${slides.length}`;
  document.getElementById("prevSlide").disabled = index === 0;
  document.getElementById("nextSlide").disabled = index === slides.length - 1;

  // Speaker notes
  const notesText = document.getElementById("speakerNotesText");
  if (notesText) notesText.textContent = slide.speakerNotes || "No speaker notes for this slide.";
}

function buildSlideHTML(slide, index, total) {
  const accent = slide.accent || "#6c63ff";
  const type = slide.type || "content";
  const imgUrl = slide.imageQuery
    ? `https://source.unsplash.com/800x600/?${encodeURIComponent(slide.imageQuery)}`
    : null;

  const progress = Math.round(((index + 1) / total) * 100);
  const progressBar = `<div class="slide-progress"><div class="slide-progress-fill" style="width:${progress}%;background:${accent}"></div></div>`;

  // Reusable code panel builder — detects language from first-line comment
  function codePanel(code) {
    const firstLine = (code || "").split("\n")[0];
    const langMatch = firstLine.match(/(?:\/\/|#|<!--)\s*(\w+)/);
    const lang = langMatch ? langMatch[1] : "code";
    // Strip the language comment line from display
    const displayCode = code.replace(/^.*\n/, "");
    return `
      <div class="slide-code-panel">
        <div class="code-panel-header" style="border-color:${accent}33">
          <span class="code-dot" style="background:#ff5f57"></span>
          <span class="code-dot" style="background:#febc2e"></span>
          <span class="code-dot" style="background:#28c840"></span>
          <span class="code-lang-tag" style="color:${accent}">${lang}</span>
        </div>
        <pre><code class="language-${lang}">${escapeHtml(displayCode.trim())}</code></pre>
      </div>`;
  }

  if (type === "title") {
    return `
      <div class="slide-inner slide-title-type" style="--accent:${accent}">
        ${progressBar}
        <div class="slide-title-bg-orb orb1" style="background:${accent}"></div>
        <div class="slide-title-bg-orb orb2" style="background:${accent}"></div>
        <div class="slide-title-content">
          <div class="slide-title-badge" style="color:${accent};border-color:${accent}22;background:${accent}11">
            <span class="badge-dot" style="background:${accent}"></span>Presentation
          </div>
          <h1 class="slide-title-heading">${slide.title}</h1>
          ${slide.subtitle ? `<p class="slide-subtitle">${slide.subtitle}</p>` : ""}
          ${slide.tagline ? `<p class="slide-tagline" style="color:${accent}">"${slide.tagline}"</p>` : ""}
          <div class="slide-title-bar" style="background:linear-gradient(90deg,${accent},transparent)"></div>
        </div>
        ${imgUrl ? `
        <div class="slide-title-image">
          <div class="slide-img-frame" style="border-color:${accent}33">
            <img src="${imgUrl}" alt="${slide.title}" loading="lazy" />
            <div class="slide-img-overlay" style="background:linear-gradient(to right,#0a0a18 0%,transparent 40%)"></div>
          </div>
        </div>` : ""}
      </div>`;
  }

  if (type === "section") {
    return `
      <div class="slide-inner slide-section-type" style="--accent:${accent}">
        ${progressBar}
        <div class="section-accent-bar" style="background:linear-gradient(180deg,${accent},${accent}44)"></div>
        ${imgUrl ? `
        <div class="section-bg-image">
          <img src="${imgUrl}" alt="${slide.title}" loading="lazy" />
          <div class="section-bg-overlay" style="background:linear-gradient(to right,#080814 45%,rgba(8,8,20,0.7) 100%)"></div>
        </div>` : ""}
        <div class="section-content">
          <div class="slide-section-number" style="color:${accent}">${String(index + 1).padStart(2, "0")}</div>
          <h2 class="slide-section-heading">${slide.title}</h2>
          ${slide.subtitle ? `<p class="slide-section-sub">${slide.subtitle}</p>` : ""}
          <div class="section-line" style="background:${accent}"></div>
        </div>
      </div>`;
  }

  if (type === "quote") {
    return `
      <div class="slide-inner slide-quote-type" style="--accent:${accent}">
        ${progressBar}
        ${imgUrl ? `
        <div class="quote-bg-image">
          <img src="${imgUrl}" alt="quote visual" loading="lazy" />
          <div class="quote-bg-overlay"></div>
        </div>` : ""}
        <div class="quote-content">
          <div class="slide-quote-mark" style="color:${accent}">"</div>
          <blockquote class="slide-quote-text">${slide.quote || slide.title}</blockquote>
          ${slide.author ? `<cite class="slide-quote-author" style="color:${accent}">— ${slide.author}</cite>` : ""}
        </div>
      </div>`;
  }

  if (type === "conclusion") {
    const bullets = slide.bullets || [];
    return `
      <div class="slide-inner slide-conclusion-type" style="--accent:${accent}">
        ${progressBar}
        <div class="conclusion-orb" style="background:${accent}"></div>
        <div class="slide-eyebrow" style="color:${accent}">Key Takeaways</div>
        <h2 class="slide-content-title">${slide.title}</h2>
        <ul class="slide-bullets conclusion-bullets">
          ${bullets.map((b, i) => `
            <li style="animation-delay:${i * 0.08}s">
              <span class="bullet-num" style="background:${accent}22;color:${accent}">${i + 1}</span>
              ${b}
            </li>`).join("")}
        </ul>
        ${slide.cta ? `<div class="slide-cta" style="background:${accent};box-shadow:0 8px 24px ${accent}44">${slide.cta} →</div>` : ""}
      </div>`;
  }

  // ---- "code" type: full-focus code slide ----
  if (type === "code") {
    const annotations = slide.bullets || [];
    return `
      <div class="slide-inner slide-code-focus-type" style="--accent:${accent}">
        ${progressBar}
        <div class="content-top-bar" style="background:linear-gradient(90deg,${accent},${accent}44,transparent)"></div>
        <div class="code-focus-left">
          <div class="slide-eyebrow" style="color:${accent}">
            <span class="eyebrow-line" style="background:${accent}"></span>Code
          </div>
          <h2 class="slide-content-title">${slide.title}</h2>
          ${annotations.length ? `
          <ul class="slide-bullets code-annotations">
            ${annotations.map((b, i) => `
              <li style="animation-delay:${i * 0.07}s">
                <span class="bullet-icon" style="background:${accent}22;color:${accent}">
                  <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" fill="${accent}"/></svg>
                </span>${b}
              </li>`).join("")}
          </ul>` : ""}
        </div>
        <div class="code-focus-right">
          ${slide.code ? codePanel(slide.code) : ""}
        </div>
      </div>`;
  }

  // ---- agenda / content ----
  const bullets = slide.bullets || [];
  const hasCode = !!slide.code;
  const hasImage = !hasCode && !!imgUrl;

  return `
    <div class="slide-inner slide-content-type" style="--accent:${accent}">
      ${progressBar}
      <div class="content-top-bar" style="background:linear-gradient(90deg,${accent},${accent}44,transparent)"></div>
      <div class="slide-content-left">
        <div class="slide-eyebrow" style="color:${accent}">
          <span class="eyebrow-line" style="background:${accent}"></span>
          ${type === "agenda" ? "Agenda" : `Slide ${index + 1}`}
        </div>
        <h2 class="slide-content-title">${slide.title}</h2>
        <ul class="slide-bullets">
          ${bullets.map((b, i) => `
            <li style="animation-delay:${i * 0.07}s">
              <span class="bullet-icon" style="background:${accent}22;color:${accent}">
                ${type === "agenda"
                  ? `<span class="agenda-num">${i + 1}</span>`
                  : `<svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" fill="${accent}"/></svg>`}
              </span>
              ${b}
            </li>`).join("")}
        </ul>
      </div>
      ${hasCode ? codePanel(slide.code) : ""}
      ${hasImage ? `
      <div class="slide-image-panel">
        <img src="${imgUrl}" alt="${slide.title}" loading="lazy" />
        <div class="slide-image-glow" style="background:${accent}"></div>
      </div>` : ""}
    </div>`;
}

function escapeHtml(str) {
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function toggleFullscreen() {
  const viewer = document.getElementById("slideViewer");
  if (!viewer) return;
  if (!document.fullscreenElement) {
    viewer.requestFullscreen && viewer.requestFullscreen();
  } else {
    document.exitFullscreen && document.exitFullscreen();
  }
}

// ==================== Export: PDF (client-side via html2pdf.js) ====================
exportPdfBtn.addEventListener("click", async () => {
  if (!notesContent.innerHTML) return;

  exportPdfBtn.disabled = true;
  const originalText = exportPdfBtn.innerHTML;
  exportPdfBtn.innerHTML = `<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Exporting...`;

  try {
    // Create a clean container for PDF (light theme, print-friendly)
    const pdfContainer = document.createElement("div");
    pdfContainer.innerHTML = notesContent.innerHTML;
    pdfContainer.style.cssText = `
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.7; color: #1a1a2e; padding: 10px;
    `;

    // Style headings, code, etc. for print
    pdfContainer.querySelectorAll("h1").forEach((el) => {
      el.style.cssText = "color: #6c63ff; border-bottom: 3px solid #6c63ff; padding-bottom: 10px; font-size: 24px;";
    });
    pdfContainer.querySelectorAll("h2").forEach((el) => {
      el.style.cssText = "color: #3b3578; margin-top: 24px; font-size: 20px;";
    });
    pdfContainer.querySelectorAll("h3").forEach((el) => {
      el.style.cssText = "color: #5a52b5; font-size: 16px;";
    });
    pdfContainer.querySelectorAll("pre").forEach((el) => {
      el.style.cssText = "background: #1e1e2e; color: #cdd6f4; padding: 14px 18px; border-radius: 8px; font-size: 12px; line-height: 1.5; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word;";
    });
    pdfContainer.querySelectorAll("code").forEach((el) => {
      if (el.parentElement.tagName !== "PRE") {
        el.style.cssText = "background: #e8e6f0; padding: 2px 5px; border-radius: 4px; font-size: 13px;";
      }
    });
    pdfContainer.querySelectorAll("blockquote").forEach((el) => {
      el.style.cssText = "border-left: 4px solid #6c63ff; margin: 12px 0; padding: 8px 16px; background: #f0eeff; border-radius: 0 6px 6px 0;";
    });
    pdfContainer.querySelectorAll("strong").forEach((el) => {
      el.style.color = "#3b3578";
    });

    // Fix PDF Layout: Prevent elements from being cut in half across pages
    pdfContainer.querySelectorAll("img, p, pre, h1, h2, h3, h4, li, .mermaid-container").forEach((el) => {
      el.style.pageBreakInside = "avoid";
      el.style.breakInside = "avoid"; 
    });

    // Remove copy buttons from the PDF clone
    pdfContainer.querySelectorAll(".copy-btn").forEach((btn) => btn.remove());

    const opt = {
      margin: [10, 12, 10, 12],
      filename: `${sanitizeName(currentTopic)}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };

    await html2pdf().set(opt).from(pdfContainer).save();
  } catch (err) {
    showError("PDF export failed: " + err.message);
  } finally {
    exportPdfBtn.innerHTML = originalText;
    exportPdfBtn.disabled = false;
  }
});

// ==================== Export: DOCX ====================
exportDocxBtn.addEventListener("click", async () => {
  if (!notesContent.innerHTML) return;

  exportDocxBtn.disabled = true;
  const originalText = exportDocxBtn.innerHTML;
  exportDocxBtn.innerHTML = `<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Exporting...`;

  try {
    const res = await fetch("/api/export/docx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html: notesContent.innerHTML, title: currentTopic }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "DOCX export failed");
    }

    const blob = await res.blob();
    downloadBlob(blob, `${sanitizeName(currentTopic)}.docx`);
  } catch (err) {
    showError(err.message);
  } finally {
    exportDocxBtn.innerHTML = originalText;
    exportDocxBtn.disabled = false;
  }
});

// ==================== Export: PPTX (client-side via PptxGenJS) ====================
exportPptxBtn.addEventListener("click", async () => {
  if (!presentationData) return;
  const slides = presentationData.slides || presentationData;

  exportPptxBtn.disabled = true;
  const originalText = exportPptxBtn.innerHTML;
  exportPptxBtn.innerHTML = `<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Generating PPTX...`;

  try {
    const pptx = new PptxGenJS();
    pptx.author = "NoteForge AI";
    pptx.subject = currentTopic;
    pptx.title = currentTopic;
    pptx.layout = "LAYOUT_WIDE";

    slides.forEach((slideData) => {
      const slide = pptx.addSlide();
      const accent = (slideData.accent || "#6c63ff").replace("#", "");
      const type = slideData.type || "content";

      // Dark background for all slides
      slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: "100%", fill: { color: "0f0f1e" } });

      if (type === "title") {
        // Accent bar top
        slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 0.08, fill: { color: accent } });
        slide.addText(slideData.title || "", {
          x: 0.8, y: 1.5, w: "85%", h: 1.5,
          fontSize: 44, bold: true, color: "FFFFFF", align: "center"
        });
        if (slideData.subtitle) {
          slide.addText(slideData.subtitle, {
            x: 0.8, y: 3.2, w: "85%", h: 0.8,
            fontSize: 22, color: "AAAACC", align: "center"
          });
        }
        if (slideData.tagline) {
          slide.addText(`"${slideData.tagline}"`, {
            x: 0.8, y: 4.2, w: "85%", h: 0.6,
            fontSize: 16, color: accent, italic: true, align: "center"
          });
        }
        slide.addText("NoteForge AI", {
          x: 0.3, y: 6.8, w: 2, h: 0.3, fontSize: 10, color: "555577"
        });

      } else if (type === "section") {
        slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.12, h: "100%", fill: { color: accent } });
        slide.addText(`0${slides.indexOf(slideData) + 1}`, {
          x: 0.5, y: 1.0, w: 2, h: 1.2, fontSize: 72, bold: true, color: accent, transparency: 60
        });
        slide.addText(slideData.title || "", {
          x: 0.5, y: 2.4, w: "88%", h: 1.2, fontSize: 40, bold: true, color: "FFFFFF"
        });
        if (slideData.subtitle) {
          slide.addText(slideData.subtitle, {
            x: 0.5, y: 3.8, w: "88%", h: 0.7, fontSize: 20, color: "AAAACC"
          });
        }

      } else if (type === "quote") {
        slide.addText("\u201C", {
          x: 0.5, y: 0.3, w: 2, h: 1.5, fontSize: 120, bold: true, color: accent, transparency: 40
        });
        slide.addText(slideData.quote || slideData.title || "", {
          x: 0.8, y: 1.5, w: "85%", h: 2.5,
          fontSize: 28, italic: true, color: "DDDDEE", align: "center", valign: "middle"
        });
        if (slideData.author) {
          slide.addText(`\u2014 ${slideData.author}`, {
            x: 0.8, y: 4.3, w: "85%", h: 0.5, fontSize: 16, color: accent, align: "center"
          });
        }

      } else {
        // content / agenda / conclusion
        slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 0.06, fill: { color: accent } });
        slide.addText(slideData.title || "", {
          x: 0.5, y: 0.4, w: "90%", h: 0.9, fontSize: 32, bold: true, color: "FFFFFF"
        });

        if (slideData.bullets && slideData.bullets.length > 0) {
          const bulletRows = slideData.bullets.map(b => ({
            text: b, options: { bullet: { type: "bullet" }, color: "CCCCDD", fontSize: 18, breakLine: true }
          }));
          slide.addText(bulletRows, {
            x: 0.5, y: 1.5, w: slideData.code ? "48%" : "90%", h: 4.5, valign: "top"
          });
        }

        if (slideData.code) {
          slide.addShape(pptx.ShapeType.rect, {
            x: 5.3, y: 1.4, w: 4.5, h: 4.6, fill: { color: "1e1e2e" }, line: { color: accent, width: 1 }
          });
          slide.addText(slideData.code, {
            x: 5.5, y: 1.6, w: 4.1, h: 4.2,
            fontSize: 11, fontFace: "Courier New", color: "CDD6F4", valign: "top"
          });
        }

        if (slideData.cta) {
          slide.addText(slideData.cta, {
            x: 0.5, y: 6.0, w: "90%", h: 0.6,
            fontSize: 16, bold: true, color: accent, align: "center"
          });
        }
      }

      if (slideData.speakerNotes) slide.addNotes(slideData.speakerNotes);
    });

    await pptx.writeFile({ fileName: `${sanitizeName(currentTopic)}.pptx` });
  } catch (err) {
    showError("PPTX export failed: " + err.message);
  } finally {
    exportPptxBtn.innerHTML = originalText;
    exportPptxBtn.disabled = false;
  }
});

// ==================== Helpers ====================
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function sanitizeName(name) {
  return name.replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "_").substring(0, 50);
}

// Auto-quote unquoted Mermaid node labels that contain special characters
function sanitizeMermaid(code) {
  // Match node labels like: A[some label] or A(some label) or A{some label}
  // If the label contains special chars and isn't already quoted, wrap it
  return code.replace(
    /(\w+)([\[\(\{])([^"'\]\)\}]+)([\]\)\}])/g,
    (match, id, open, label, close) => {
      const specialChars = /[().,;\-\/\%\#\&\']/;
      if (specialChars.test(label)) {
        // Use the double-quote form Mermaid supports: A["label"]
        const safeLabel = label.replace(/"/g, "'");
        return `${id}${open}"${safeLabel}"${close}`;
      }
      return match;
    }
  );
}

function showLoading(topic) {
  generateForm.closest("section").classList.add("hidden");
  errorState.classList.add("hidden");
  resultSection.classList.add("hidden");
  loadingTopic.textContent = `Topic: "${topic}"`;
  loadingState.classList.remove("hidden");
}

function hideLoading() {
  loadingState.classList.add("hidden");
}

function showError(message) {
  loadingState.classList.add("hidden");
  generateForm.closest("section").classList.add("hidden");
  errorMessage.textContent = message;
  errorState.classList.remove("hidden");
}

function hideError() {
  errorState.classList.add("hidden");
  generateForm.closest("section").classList.remove("hidden");
}

function resetUI() {
  resultSection.classList.add("hidden");
  errorState.classList.add("hidden");
  loadingState.classList.add("hidden");
  generateForm.closest("section").classList.remove("hidden");
  topicInput.value = "";
  topicInput.focus();
  currentMarkdown = "";
  currentSlides = null;
  presentationData = null;
  currentTopic = "";
  document.removeEventListener("keydown", handleSlideKeydown);
  window.scrollTo({ top: 0, behavior: "smooth" });
}
