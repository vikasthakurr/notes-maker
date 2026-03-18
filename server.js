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

function buildPrompt(topic, style) {
  const styleInstructions = {
    detailed: `Write comprehensive, detailed technical notes. 
Include in-depth explanations, multiple code examples, and architecture diagrams. 
Use a Mermaid diagram (graph TD or graph LR) and a relevant technical image.`,

    summary: `Write a concise quick-reference summary. 
Cover key concepts and syntax with 2-3 short code examples. 
Include a high-level flowchart (Mermaid) and a representative image.`,

    tutorial: `Write a step-by-step tutorial. 
Build complexity gradually with "Try it yourself" challenges. 
Include a process diagram (sequenceDiagram) and a visual illustration.`,
  };

  return `You are a world-class technical writer and architect. Your goal is to produce high-quality, human-style technical notes that are engaging, clear, and visually rich.

**Topic: ${topic}**

OUTPUT STRUCTURE (STRICTLY FOLLOW):
1. Start IMMEDIATELY with a # heading containing the Topic Name. NO greetings or intros.
2. Followed by a 2-3 sentence human-style, engaging overview.
3. Include a relevant technical image from Unsplash: ![Conceptual Image](https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80&${topic.replace(/\s+/g, ",")})
   (If that specific image isn't available, use a generic high-quality tech one: https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=800&q=80)
4. Include at least one Mermaid diagram (graph TD, graph LR, or sequenceDiagram) to visualize the architecture, data flow, or process.
5. Then proceed to ## and ### sub-sections with technical content, human-centric explanations, and practical code examples.

TONE & STYLE:
- "Human-style": Professional documentation written with natural clarity and expert insight.
- Engaging, not robotic.
- ZERO TOLERANCE for greetings/preamble (No "Hey there", "Alright team", etc.).
- "Story infusion": add a generic real life example so student can connect with topic effortlessly.

DIAGRAMS & IMAGES (MANDATORY):
- Use \`\`\`mermaid blocks for diagrams.
- CRITICAL: In Mermaid nodes, NEVER use commas, semicolons, or brackets inside [ ] or ( ) unless the entire label is in double quotes. Example: A["Node with, comma"] or B[Simple Node].
- Use the provided Unsplash URLs for a professional tech-focused visual. NO cat images.
- Add this CSS style to the image tag: style="border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); margin: 20px 0; max-width: 100%;"
- Both MUST be present regardless of the style (Detailed/Summary/Tutorial).`;
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
    // Initialize Gemini with the user's provided API key
    const genAI = new GoogleGenerativeAI(userApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = buildPrompt(topic.trim(), style || "detailed");
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const notes = response.text();

    res.json({ notes });
  } catch (error) {
    console.error("AI Generation Error:", error.message);
    
    let errorMessage = "Failed to generate notes. Please check your API key.";
    if (error.message.includes("API_KEY_INVALID")) {
      errorMessage = "Invalid Gemini API Key. Please provide a valid key from Google AI Studio.";
    } else if (error.message.includes("quota")) {
      errorMessage = "API Quota exceeded or key limited. Please try again later.";
    }

    res.status(500).json({ error: errorMessage });
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
