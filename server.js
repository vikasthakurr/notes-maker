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
Your job is to architect a professional, highly readable technical guide for the topic: "${topic}".
The user requested a "${style}" style.

Output a JSON array of sections. Each section must be an object with the following keys:
- "heading": The title of this section.
- "instructions": Direct instructional constraints for the content. Emphasize:
    1. Use a mix of well-structured paragraphs for explanations and crisp bullet points for features/steps.
    2. Use simple, accessible language (ELI5) for non-technical users.
    3. Mandatory inclusion of a relatable real-world analogy.
    4. Provide a clear, practical example for any logic or code.
- "needsImage": boolean.
- "imageQuery": If needsImage is true, provide a Google search query for a technical diagram.

STRICT TONE RULE: Avoid all conversational fluff. Focus on structured, punchy, and clear delivery.
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

  const prompt = `You are a world-class technical educator who excels at simplifying complex topics. 
Your goal is to write a complete set of technical notes for "${topic}" based on this blueprint:

${JSON.stringify(plan, null, 2)}

Overall Style: ${style}

STRICT OUTPUT RULES (CRITICAL):
1. **BALANCE**: Use well-structured paragraphs for high-level concepts and analogies. Use bullet points ( - or * ) for technical features, steps, and lists.
2. **SIMPLICITY**: Write as if explaining to a beginner. Use plain English. Explain jargon immediately with an analogy.
3. **ANALOGIES**: For every major concept, provide a "Real-World Analogy" section.
4. **PRACTICAL EXAMPLES**: Include at least one concrete "Use Case" or "Code Example" for every heading.
5. **IMAGES**: If a section in the plan has "needsImage": true, you MUST insert the placeholder [[IMAGE_QUERY: "QueryFromPlan"]] exactly where the illustration should appear (replace QueryFromPlan with the actual imageQuery from the plan).
6. **NO FLUFF**: No intros, "Welcome", or conclusions.
7. **FORMAT**: Clean Markdown.`;

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
        // Use standard markdown image syntax for compatibility with marked.js
        return `\n\n![Illustration](${url})\n\n`;
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
 * Slide Planner Agent: Decides the structure of the slides.
 */
async function runSlidesPlannerAgent(topic, genAI) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `You are a professional Presentation Architect.
Your job is to design a high-impact technical presentation outline for: "${topic}".

Output a JSON object with:
- "title": Presentation main title.
- "subtitle": Short engaging subtitle.
- "slides": Array of objects, each with:
    - "title": Slide header.
    - "type": "title" | "agenda" | "section" | "content" | "code" | "quote" | "conclusion".
    - "imageQuery": A search query for Unsplash to find a relevant technical image.
    - "accent": A hex color (e.g., #6c63ff, #ec4899, #00d2ff) that matches the slide's vibe.
    - "speakerNotes": Concise bullet points (simple English, analogies) for the presenter.

Ensure the presentation uses ELI5 language and is highly visual. Output ONLY the JSON.`;

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
    console.error("Slides Planner JSON parse error:", text);
    throw new Error("Failed to parse Slides Planner Agent output");
  }
}

/**
 * Slide Content Agent: Populates slides with detailed points.
 */
async function generateSlidesContentBatch(topic, plan, genAI) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `You are a world-class technical speaker. Complete the content for this presentation blueprint for "${topic}":

${JSON.stringify(plan, null, 2)}

STRICT RULES:
1. For each slide, populate "bullets": Array of 3-5 CRISP, PRECISE, bullet points.
2. SIMPLICITY: Use language a non-technical person can understand.
3. ANALOGY: Include a "Real-world analogy: [Content]" bullet point for technical slides.
4. For "code" slides, populate "code": A high-quality, SIMPLE code snippet with helpful comments.
5. Maintain a professional yet accessible executive tone. No fluff.

Output the COMPLETE updated JSON object only.`;

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
    console.error("Slides Content JSON parse error:", text);
    throw new Error("Failed to parse Slides Content Agent output");
  }
}

app.post("/api/generate-slides", async (req, res) => {
  const { topic } = req.body;
  const userApiKey = req.headers["x-api-key"];

  if (!topic || !topic.trim()) {
    return res.status(400).json({ error: "Topic is required" });
  }

  if (!userApiKey) {
    return res.status(401).json({ error: "Gemini API Key is required." });
  }

  try {
    const genAI = new GoogleGenerativeAI(userApiKey);

    // 1. Run Slide Planner
    const plan = await runSlidesPlannerAgent(topic.trim(), genAI);

    // 2. Generate Slide Content
    const fullSlides = await generateSlidesContentBatch(topic.trim(), plan, genAI);

    res.json(fullSlides);
  } catch (error) {
    console.error("Slides Generation Error:", error.message);
    res.status(500).json({ error: "Failed to generate presentation slides." });
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
