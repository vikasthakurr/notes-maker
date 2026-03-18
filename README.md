# NoteForge – AI Technical Notes Generator

NoteForge is a premium, AI-powered web application that transforms any technical topic into professionally formatted, human-style technical notes. Leveraging the power of **Google Gemini AI**, it generate comprehensive content including technical diagrams (Mermaid.js) and conceptual images (Unsplash) to provide a rich learning experience.

---

## 🚀 Features

- **AI-Powered Generation**: Get high-quality technical notes in seconds for any programming topic.
- **Human-Style Writing**: Professional yet engaging content that avoids robotic phrasing and conversational fluff.
- **Three distinct styles**: 
  - **Detailed**: In-depth explanations with architecture diagrams and images.
  - **Quick Summary**: Concise overviews with high-level flowcharts.
  - **Tutorial**: Step-by-step guides with process diagrams.
- **Visual Learning**: Instant rendering of **Mermaid.js** diagrams and relevant **Unsplash** technical images.
- **Code Excellence**: Syntax-highlighted code blocks with built-in copy-to-clipboard functionality.
- **Export Options**: Download your notes as **PDF** or **DOCX** for offline study or documentation.
- **Premium UI**: Dark-themed, glassmorphism design for a modern and immersive experience.
- **Proudly Branded**: Designed and developed by **Vikas Thakur**.

---

## 🛠️ Tech Stack

- **Backend**: Node.js & Express
- **AI**: Google Gemini AI (`@google/generative-ai`)
- **Frontend**: HTML5, Tailwind CSS (CDN), Vanilla JavaScript
- **Diagrams**: Mermaid.js
- **Markdown**: Marked.js
- **Export**: html2pdf.js (PDF), html-docx-js (DOCX)
- **Syntax Highlighting**: Highlight.js

---

## 📋 Prerequisites

Before you begin, ensure you have:
1. **Node.js**: Installed on your machine.
2. **Gemini API Key**: Obtain a free API key from [Google AI Studio](https://aistudio.google.com/).

---

## ⚙️ Installation & Setup

1. **Clone or Download** the project:
   ```bash
   cd notes-maker
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_actual_api_key_here
   PORT=3000
   ```

4. **Start the Server**:
   ```bash
   npm start
   ```

5. **Access the App**:
   Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 📖 Usage

1. **Enter a Topic**: Type any technical subject (e.g., "Docker Basics", "React Hooks", "OAuth 2.0").
2. **Select a Style**: Choose between Detailed, Quick Summary, or Tutorial.
3. **Generate**: Click "Generate Notes" and wait for the AI to work its magic (~30-60s).
4. **Preview & Export**: Read the notes with rendered diagrams and images, then export to PDF or DOCX using the buttons in the results panel.

---

## 📄 License

This project is for educational and personal use.

**Made by [Vikas Thakur](https://github.com/your-username)**
