
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { GroundingSource } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const SYSTEM_INSTRUCTION = `
  Task: Create a COMPLETE, high-performance, professional, FULL-STACK single-file web application prototype.
  
  "Full-Stack" Prototype Definition:
  - The output must be a self-contained HTML5 file.
  - FRONTEND: Responsive UI using Tailwind CSS, high-fidelity animations, and accessible components.
  - "BACKEND" SIMULATION: Implement a robust client-side "Logic Layer" using JavaScript.
    * MOCK DATABASE: Use localStorage to persist data across reloads.
    * STATE MANAGEMENT: Implement a clean pattern for managing application state.
    * API SIMULATION: Use async/await and Promises to simulate network latency.
    * FORM HANDLING: Functional forms with real-time validation and error handling.
      - SPECIAL FEATURE: If a contact form is generated, it MUST include a "Copy to Clipboard" button. This button should aggregate form data (name, email, message, etc.) into a formatted string and copy it to the user's clipboard using the navigator.clipboard API, providing immediate visual feedback (e.g., temporary button text change or toast notification).

  Accessibility & WCAG Compliance (MANDATORY):
  - SEMANTIC HTML: Use proper landmark elements (<header>, <nav>, <main>, <section>, <footer>, <article>).
  - WAI-ARIA: Include appropriate aria-labels, aria-live regions for dynamic content updates, aria-expanded for menus, and correct roles for interactive elements.
  - KEYBOARD NAVIGATION: Ensure all interactive elements are focusable, have visible focus indicators (using Tailwind ring/offset utilities), and can be operated via Enter/Space.
  - CONTRAST & READABILITY: Ensure high color contrast (WCAG AA/AAA standards) and readable font sizes.
  - ALT TEXT: Ensure all images have descriptive alt attributes or empty alt for decorative icons.

  Technical Requirements:
  - One single file containing HTML, CSS (in <style> tags), and JavaScript (in <script> tags).
  - Use Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>.
  - DARK MODE CONFIG: Include immediate theme initialization and a functional toggle (☀️/🌙).
    
  Aesthetics & UX:
  - LUXURY UI: Glassmorphism, mesh gradients, and fluid typography.
  - INTERACTIVE: Hover scales, magnetic buttons, and smooth transition states.
  - FEEDBACK: Every user action must provide visual feedback (e.g., "Saved to Database", "Processing request...").

  OUTPUT:
  - Return ONLY raw HTML code. Do NOT wrap in markdown backticks.
`;

export const generateWebsiteCodeStream = async (
  prompt: string, 
  useSearch: boolean = false,
  onChunk: (chunk: string) => void,
  onSources?: (sources: GroundingSource[]) => void
): Promise<string> => {
  let context = "";
  let sources: GroundingSource[] = [];

  if (useSearch) {
    const searchResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Research features, data structures, accessibility patterns, and industry standards for a full-stack version of: "${prompt}".`,
      config: { tools: [{ googleSearch: {} }] },
    });
    context = `Full-Stack Research Grounding: ${searchResponse.text}\n\n`;
    const chunks = searchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      sources = chunks.map((chunk: any) => ({
        title: chunk.web?.title || "Industry Standard",
        uri: chunk.web?.uri || ""
      })).filter(s => s.uri);
      if (onSources) onSources(sources);
    }
  }

  const stream = await ai.models.generateContentStream({
    model: "gemini-3-pro-preview",
    contents: `${context}${SYSTEM_INSTRUCTION}\n\nProject Requirement: "Build an accessible, full-stack functional application with a 'Copy to Clipboard' feature in contact forms for: ${prompt}"`,
    config: {
      thinkingConfig: { thinkingBudget: 32768 },
      temperature: 0.8,
    },
  });

  let fullText = "";
  for await (const chunk of stream) {
    const chunkText = chunk.text || "";
    fullText += chunkText;
    const cleanText = fullText.replace(/^```html\n?/, '').replace(/\n?```$/, '').trim();
    onChunk(cleanText);
  }

  return fullText.replace(/^```html\n?/, '').replace(/\n?```$/, '').trim();
};

export const editWebsiteCode = async (currentCode: string, instructions: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite-latest",
      contents: `
        You are a Senior Full-Stack Engineer and Accessibility Specialist. Update this application code while maintaining WCAG compliance and clipboard features.
        Current Code: ${currentCode}
        Instructions: "${instructions}"
        
        CRITICAL: Ensure semantic HTML, WAI-ARIA attributes, keyboard navigation, and contact form 'Copy to Clipboard' logic are maintained or enhanced. Return ONLY raw HTML.
      `,
    });
    const text = response.text || "";
    return text.replace(/^```html\n?/, '').replace(/\n?```$/, '').trim();
  } catch (error) {
    console.error("Gemini Edit Error:", error);
    throw new Error("Logic modification failed.");
  }
};
