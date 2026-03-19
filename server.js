require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));

// Note: We no longer initialize a global genAI instance as we use user-provided keys per request.

/**
 * Planner Agent: Decides the structure of the notes.
 */
async function runPlannerAgent(topic, style, genAI) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `You are an expert Educational Planner Agent.
Your job is to architect a professional, book-style technical guide for the topic: "${topic}".
The user requested a "${style}" style.

Output a JSON array of sections. Each section must be an object with the following keys:
- "heading": The title of this section.
- "instructions": Direct instructional constraints for the content. Emphasize:
    1. Objective technical definitions and logic.
    2. A practical analogy (if helpful) to explain mechanics, NOT to frame a story.
    3. Specific code or architectural points to cover.
- "needsImage": boolean (true if highly technical illustrations are needed).
- "imageQuery": If needsImage is true, provide a Google search query for a technical diagram.

STRICT TONE RULE: Avoid conversational fluff like "Welcome" or "Let's explore". Architecture must be purely informational.
Ensure the output is valid JSON. ONLY output the array.`;

  const result = await model.generateContent(prompt);
  let text = result.response.text().trim();
  if (text.startsWith('\`\`\`json')) {
    text = text.substring(7, text.length - 3).trim();
  } else if (text.startsWith('\`\`\`')) {
    text = text.substring(3, text.length - 3).trim();
  }

  try {
    return JSON.parse(text);
  } catch (err) {
    console.error("Planner JSON parse error:", text);
    throw new Error("Failed to parse Planner Agent output");
  }
}

/**
 * Image Agent: Uses googlethis to search for the image based on the query.
 * We return a proxied URL so the frontend can securely render it for PDFs.
 */
async function fetchRelevantImage(query) {
  try {
    const google = require('googlethis');
    const images = await google.image(query, { safe: false });

    if (images && images.length > 0) {
      const url = images[0].url;
      // Return the proxy route pointing to our own server
      return `/api/proxy-image?url=${encodeURIComponent(url)}`;
    }
  } catch (err) {
    console.error("Image Agent Error:", err.message);
  }

  return `/api/proxy-image?url=${encodeURIComponent('https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=800&q=80')}`;
}

/**
 * Content Agent: Responsible for generating robust educational notes
 * for the ENTIRE plan in a single batch call to save quota.
 */
async function generateFullContentBatch(topic, plan, style, genAI) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  
  const prompt = `You are a world-class technical educator. Your goal is to write a complete set of technical notes for "${topic}" based on this blueprint:

${JSON.stringify(plan, null, 2)}

Overall Style: ${style}

STRICT OUTPUT RULES (CRITICAL):
1. **NO CONVERSATIONAL FILLER**: Do not use words like "Welcome", "Hello", "In this section", "Let's dive in", or "Imagine". 
2. **NO INTROS**: Start each section IMMEDIATELY with the facts, definitions, or code.
3. **TONE**: Professional technical book style. Use analogies only to explain complex concepts, not to "frame" the guide as a story.
4. **NO FIRST/SECOND PERSON**: Avoid "I", "We", "You" (unless in a clear 'Tutorial' step).
5. **STRUCTURE**:
    - For each section, use the provided Heading (##).
    - If a section in the plan has "needsImage": true, insert the placeholder: [[IMAGE_QUERY: "QueryFromPlan"]] (Replace QueryFromPlan with the actual "imageQuery" from that section).
    - Mermaid Diagrams: Include using strictly simple 'graph TD' or 'graph LR' syntax with labels in "double quotes".
6. **FORMAT**: Clean Markdown. No intros, no conclusions, no greetings.`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

app.post("/api/generate", async (req, res) => {
  const { topic, style } = req.body;
  const userApiKey = req.headers["x-api-key"];

  if (!topic || !topic.trim()) {
    return res.status(400).json({ error: "Topic is required" });
  }

  if (!userApiKey) {
    return res.status(401).json({ error: "Gemini API Key is required. Please provide it in the input field." });
  }

  try {
    const genAI = new GoogleGenerativeAI(userApiKey);
    
    // 1. Run Planner Agent (Request #1)
    const plan = await runPlannerAgent(topic.trim(), style || "detailed", genAI);
    
    // 2. Generate Full Content in Batch (Request #2)
    let fullMarkdown = await generateFullContentBatch(topic.trim(), plan, style || "detailed", genAI);

    // 3. Process Image Placeholders
    // Scan for [[IMAGE_QUERY: "..."]] and replace with Proxy URLs from Image Agent
    const placeholderRegex = /\[\[IMAGE_QUERY:\s*"([^"]+)"\]\]/g;
    const matches = [...fullMarkdown.matchAll(placeholderRegex)];
    
    if (matches.length > 0) {
       const imageTasks = matches.map(match => fetchRelevantImage(match[1]));
       const imageUrls = await Promise.all(imageTasks);
       
       let index = 0;
       fullMarkdown = fullMarkdown.replace(placeholderRegex, () => {
         const url = imageUrls[index++];
         return `\n\n![Illustration](${url})\n<style>img { border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); margin: 20px 0; max-width: 100%; }</style>\n\n`;
       });
    }

    res.json({ notes: fullMarkdown });
  } catch (error) {
    console.error("AI Generation / Orchestration Error:", error.message);
    
    let errorMessage = "Failed to generate notes. Please check your API key.";
    if (error.message.includes("429") || error.message.includes("quota")) {
      errorMessage = "API Quota exceeded for your key. (Limit is 20 requests/day). Please try again in 1 minute.";
    } else if (error.message.includes("API_KEY_INVALID")) {
      errorMessage = "Invalid Gemini API Key.";
    }

    res.status(500).json({ error: errorMessage });
  }
});

/**
 * Proxy route to fetch images server-side.
 * Resolves frontend CORS tainting so html2pdf can render images natively.
 */
app.get("/api/proxy-image", async (req, res) => {
  const imageUrl = req.query.url;
  if (!imageUrl) return res.status(400).send("No URL provided");

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error("Failed to fetch image");

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader("Content-Type", response.headers.get("content-type") || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(buffer);
  } catch (err) {
    console.error("Proxy error:", err.message);
    res.status(500).send("Proxy error");
  }
});

app.post("/api/export/docx", async (req, res) => {
  try {
    const { html, title } = req.body;
    if (!html) return res.status(400).json({ error: "HTML content is required" });

    const htmlDocx = require("html-docx-js");

    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Calibri', sans-serif; line-height: 1.6; color: #222; padding: 20px; }
    h1 { color: #6c63ff; border-bottom: 2px solid #6c63ff; padding-bottom: 8px; }
    h2 { color: #3b3578; margin-top: 24px; }
    h3 { color: #5a52b5; }
    pre { background: #f4f4f8; padding: 12px; border-left: 4px solid #6c63ff; font-family: 'Consolas', monospace; font-size: 12px; white-space: pre-wrap; word-wrap: break-word; }
    code { background: #efefef; padding: 2px 4px; font-family: 'Consolas', monospace; }
    pre code { background: none; }
    blockquote { border-left: 4px solid #6c63ff; padding: 8px 16px; background: #f9f8ff; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ccc; padding: 8px; }
    th { background: #6c63ff; color: white; }
  </style>
</head>
<body>${html}</body>
</html>`;

    const docxBuf = htmlDocx.asBlob(fullHtml);

    // html-docx-js in Node.js returns a Buffer, send it directly
    const safeName = (title || "notes").replace(/[^a-zA-Z0-9]/g, "_");
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}.docx"`);
    res.send(Buffer.from(docxBuf));
  } catch (err) {
    console.error("DOCX export error:", err.message);
    res.status(500).json({ error: `DOCX export failed: ${err.message}` });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`\n  🚀 Notes Maker server running at http://localhost:${PORT}\n`);
});
