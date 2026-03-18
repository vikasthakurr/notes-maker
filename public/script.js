// ==================== State ====================
let currentMarkdown = "";
let currentTopic = "";
let selectedStyle = "detailed";

// ==================== DOM Elements ====================
const generateForm = document.getElementById("generateForm");
const topicInput = document.getElementById("topicInput");
const apiKeyInput = document.getElementById("apiKeyInput");
const toggleApiKeyBtn = document.getElementById("toggleApiKey");
const eyeIcon = document.getElementById("eyeIcon");
const themeToggle = document.getElementById("themeToggle");
const sunIcon = document.getElementById("sunIcon");
const moonIcon = document.getElementById("moonIcon");
const generateBtn = document.getElementById("generateBtn");
const loadingState = document.getElementById("loadingState");
const loadingTopic = document.getElementById("loadingTopic");
const errorState = document.getElementById("errorState");
const errorMessage = document.getElementById("errorMessage");
const resultSection = document.getElementById("resultSection");
const resultTitle = document.getElementById("resultTitle");
const notesContent = document.getElementById("notesContent");
const exportPdfBtn = document.getElementById("exportPdfBtn");
const exportDocxBtn = document.getElementById("exportDocxBtn");
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
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "X-API-Key": apiKey
      },
      body: JSON.stringify({ topic, style: selectedStyle }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to generate notes");
    }

    currentMarkdown = data.notes;
    renderNotes(data.notes, topic);
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
    const code = block.textContent;
    const id = `mermaid-diagram-${i}`;

    const diagramDiv = document.createElement("div");
    diagramDiv.id = id;
    diagramDiv.className = "mermaid-container my-8 flex justify-center";
    diagramDiv.innerHTML = code;

    pre.parentElement.replaceChild(diagramDiv, pre);
    try {
      await mermaid.run({ nodes: [diagramDiv] });
    } catch (err) {
      console.error("Mermaid error:", err);
      diagramDiv.innerHTML = `<p class="text-red-400 text-xs">Diagram rendering failed</p>`;
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
  hideLoading();
  resultSection.classList.remove("hidden");

  // Smooth scroll to result
  resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
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
  currentTopic = "";
  window.scrollTo({ top: 0, behavior: "smooth" });
}
