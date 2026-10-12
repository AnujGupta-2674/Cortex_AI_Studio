# 🎯 Specialist Agents Deep-Dive

## 1. Overview
Cortex AI features six specialist agents, each mapped to a dedicated system prompt, specialized model configuration, credit tier, and expected output structure.

---

## 2. Agent Inventory & Specifications

| Agent Identifier | Specialist Role | Backing LLM Model | Credit Cost | Output Artifact Type |
| :--- | :--- | :--- | :--- | :--- |
| **`chat`** | General Conversation & Explanations | Groq (`openai/gpt-oss-120b`) | 1 Credit | Markdown Text |
| **`coding`** | Software Engineering & Live Widgets | Google Gemini (`gemini-2.5-flash`) | 2 Credits | Executable HTML/JS/CSS |
| **`search`** | Real-Time Web Search & Citations | Gemini + Google Search Grounding | 2 Credits | Grounded Report with Sources |
| **`vision`** | Multimodal Image Analysis | Google Gemini (`gemini-2.5-flash`) | 3 Credits | Visual Insights & SVG |
| **`pdf`** | Executive A4 Printable Documents | Google Gemini (`gemini-2.5-flash`) | 3 Credits | Print-Ready A4 Document |
| **`ppt`** | Interactive Widescreen Presentations | Google Gemini (`gemini-2.5-flash`) | 5 Credits | 16:9 Interactive Deck |

---

## 3. Specialist Agent Profiles

### A. Coding Agent (`backend/services/agent/agents/coding.agent.js`)
* **Purpose**: Generates complete, functional, self-contained code implementations, refactors existing logic, and debugs errors.
* **Key Prompt Instruction**: Instructed to provide **complete, zero-placeholder code** inside fenced markdown blocks (e.g. ```` ```html ```` or ```` ```javascript ````). For frontend widgets, it must package HTML, Tailwind/CSS styles, and interactive JavaScript together so the client Artifact Sandbox can render it immediately without external dependencies.
* **Sample Prompt**: *"Build an interactive dark-mode Pomodoro timer with start, pause, reset, and audio chime."*

### B. Presentation (PPT) Agent (`backend/services/agent/agents/ppt.agent.js`)
* **Purpose**: Generates interactive 5- to 10-slide widescreen presentation decks.
* **Output Architecture**:
  1. Outputs a high-level markdown slide outline in the chat bubble.
  2. Generates a complete ```` ```html ```` block containing:
     - Widescreen 16:9 container with responsive scaling.
     - Dark glassmorphic slide themes with Tailwind or custom CSS.
     - Embedded JavaScript slide engine with active index tracking (`showSlide(n)`).
     - Full keyboard navigation listener (`ArrowRight`, `ArrowLeft`, `Space`).
     - Next/Previous button controls and progress indicator pills.
* **Sample Prompt**: *"Create a 5-slide pitch deck for an autonomous multi-agent platform."*

### C. PDF Document Agent (`backend/services/agent/agents/pdf.agent.js`)
* **Purpose**: Produces executive research reports, corporate whitepapers, invoices, and audit summaries formatted for printing or PDF export.
* **Output Architecture**:
  - Enforces exact A4 dimensions:
    ```css
    @page { size: A4; margin: 15mm; }
    @media print { body { background: white; color: black; } }
    ```
  - Corporate layout with header branding, executive summary, KPI metric cards, and comparative data tables.
  - Floating "Print to PDF" button executing `window.print()`.

### D. Search Agent (`backend/services/agent/agents/search.agent.js`)
* **Purpose**: Answers queries requiring real-time internet data, breaking news, or library documentation released beyond model training cutoffs.
* **Implementation**: Integrates Google Search Grounding via `@langchain/google-genai`. Responses contain verified facts accompanied by source URLs and markdown links.

### E. Conversational Chat Agent (`backend/services/agent/agents/chat.agent.js`)
* **Purpose**: Handles general inquiry, creative brainstorming, and conceptual questions.
* **Implementation**: Executes on Groq LPUs (`openai/gpt-oss-120b`), streaming tokens at ultra-high velocity (`>150 tokens/sec`) with natural phrasing and markdown formatting.

### F. Vision Agent (`backend/services/agent/agents/vision.agent.js`)
* **Purpose**: Multimodal reasoning, analyzing visual architecture diagrams, and generating vector SVG graphics.
