
import { GoogleGenAI, GenerateContentResponse, Modality, Type } from "@google/genai";
import { GroundingSource } from "../types";

// Always use the process.env.API_KEY directly as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
  Task: Create a COMPLETE, high-performance, professional, FULL-STACK single-file web application prototype.
  
  "Full-Stack" Prototype Definition:
  - The output must be a self-contained HTML5 file.
  - FRONTEND: Responsive UI using Tailwind CSS, high-fidelity animations, and accessible components.
  - "BACKEND" SIMULATION: Implement a robust client-side "Logic Layer" using JavaScript (LocalStorage, Promises, State).
  - ACCESSIBILITY: Strict WCAG AA compliance (Semantic HTML, WAI-ARIA, Keyboard nav).
  - FAVICON: You MUST include a <link rel="icon"> with a high-quality, relevant data:image/svg+xml SVG favicon based on the application's theme.

  PERFORMANCE & AESTHETICS REQUIREMENTS (MANDATORY):
  1. SOPHISTICATED LOADING: For any dynamic content, simulated data loading, or media assets, implement skeleton screens and shimmering placeholders. Perceived performance must be exceptional with smooth transitions from skeleton to content.
  2. DEEP PARALLAX: Implement pronounced parallax scrolling effects. Background decorative elements and hero images MUST move at a significantly slower pace than foreground content (text/cards), creating a clear and immersive sense of 3D depth. The background movement should be easily visible but smooth.
  3. ANIMATED HERO: The Hero section background MUST include a subtle, high-end animated effect. This could be a gentle CSS wave animation, a slow-drifting multi-point mesh gradient, or floating ethereal particles.
  4. WORLD-CLASS HOVER INTERACTIONS: Apply polished hover effects to ALL interactive elements.
     - Buttons: Subtle scaling (e.g., scale-105), brightness shifts, and glowing box-shadows.
     - Cards: Lifting effects (translate-y), depth increases (larger shadows), and border-color transitions.
     - Links: Animated underlines or text-color fades.
     - Form Inputs: Focus/Hover states with soft ring glows or background-opacity shifts.
  5. MOTION DESIGN: Use staggered entrance animations (e.g., slide-up-fade) for sections and cards. Ensure all interactions feel fluid and responsive.

  OUTPUT:
  - Return ONLY raw HTML code. Do NOT wrap in markdown backticks.
`;

const handleApiError = (error: any): string => {
  const message = error?.message || String(error);
  if (message.includes("429")) return "Rate limit reached. Please wait a moment.";
  if (message.includes("403")) return "API Key error. Check configuration.";
  if (message.includes("SAFETY")) return "Prompt blocked by safety filters.";
  return "Synthesis error. Please refine your prompt.";
};

/**
 * Estimates the generation time based on prompt complexity
 */
export const estimateGenerationTime = async (prompt: string): Promise<{ seconds: number; complexity: 'Low' | 'Medium' | 'High' }> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-flash-lite-latest",
      contents: `Analyze the following website request and estimate how long (in seconds) it will take a high-end AI to generate the complete code. 
      Also provide a complexity level.
      Request: ${prompt}
      Return JSON: { "seconds": number, "complexity": "Low" | "Medium" | "High" }`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            seconds: { type: Type.NUMBER },
            complexity: { type: Type.STRING }
          },
          required: ["seconds", "complexity"]
        }
      }
    });
    const data = JSON.parse(response.text || '{"seconds": 30, "complexity": "Medium"}');
    // Ensure logical bounds
    return {
      seconds: Math.max(15, Math.min(data.seconds, 120)),
      complexity: data.complexity
    };
  } catch (e) {
    return { seconds: 45, complexity: 'Medium' };
  }
};

/**
 * Generate website code using Gemini 3 Pro with Thinking Mode
 */
export const generateWebsiteCodeStream = async (
  prompt: string, 
  onChunk: (chunk: string) => void,
  useSearch: boolean = false,
  mediaData?: { data: string; mimeType: string }[],
  onSources?: (sources: GroundingSource[]) => void
): Promise<string> => {
  let context = "";
  let sources: GroundingSource[] = [];

  if (useSearch) {
    try {
      const searchResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Research features and standards for: "${prompt}".`,
        config: { tools: [{ googleSearch: {} }] },
      });
      context = `Research Data: ${searchResponse.text}\n\n`;
      const chunks = searchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks && onSources) {
        onSources(chunks.map((c: any) => ({ title: c.web?.title || "Source", uri: c.web?.uri || "" })).filter(s => s.uri));
      }
    } catch (e) { console.warn("Search failed", e); }
  }

  const parts: any[] = [{ text: `${context}${SYSTEM_INSTRUCTION}\n\nBuild: ${prompt}` }];
  if (mediaData) {
    mediaData.forEach(m => parts.push({ inlineData: m }));
  }

  try {
    const stream = await ai.models.generateContentStream({
      model: "gemini-3-pro-preview",
      contents: { parts },
      config: {
        thinkingConfig: { thinkingBudget: 32768 },
        temperature: 0.7,
      },
    });

    let fullText = "";
    for await (const chunk of stream) {
      fullText += chunk.text || "";
      onChunk(fullText.replace(/^```html\n?/, '').replace(/\n?```$/, '').trim());
    }
    return fullText.replace(/^```html\n?/, '').replace(/\n?```$/, '').trim();
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Get coding suggestions using Gemini Flash Lite
 */
export const getCodingSuggestions = async (code: string): Promise<string[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-flash-lite-latest",
      contents: `Analyze this web application code and provide 3-5 concise, actionable suggestions for improvements in UX, UI, Accessibility, or Performance. 
      Code: ${code}
      Return a JSON array of strings.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Suggestions Error:", error);
    return ["Optimize asset delivery", "Enhance ARIA labels", "Refine color contrast"];
  }
};

/**
 * Auto-fix code using Gemini 3 Flash
 */
export const autoFixCode = async (code: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Review the following web application code. Identify any bugs, logical errors, broken styles, or missing accessibility attributes. 
      Apply critical fixes and return the FULL updated HTML code. 
      Code: ${code}
      Return ONLY raw HTML.`,
      config: { temperature: 0.2 }
    });
    return (response.text || code).replace(/^```html\n?/, '').replace(/\n?```$/, '').trim();
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Chat with Gemini 3 Pro (High intelligence)
 */
export const chatWithAI = async (message: string, history: any[] = []): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: [...history, { role: 'user', parts: [{ text: message }] }],
      config: { temperature: 0.9 }
    });
    return response.text || "No response received.";
  } catch (error) {
    return "Chat error: " + handleApiError(error);
  }
};

/**
 * Quick analysis or small edits using Flash Lite
 */
export const fastEditResponse = async (currentCode: string, instructions: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-flash-lite-latest",
      contents: `Current Code: ${currentCode}\n\nUpdate: ${instructions}\n\nReturn ONLY raw HTML.`,
    });
    return (response.text || "").replace(/^```html\n?/, '').replace(/\n?```$/, '').trim();
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};

/**
 * Multi-modal analysis (Image/Video) using Gemini 3 Pro
 */
export const analyzeMedia = async (prompt: string, media: { data: string; mimeType: string }): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: {
        parts: [
          { inlineData: media },
          { text: `Analyze this ${media.mimeType.startsWith('video') ? 'video' : 'image'} for: ${prompt}` }
        ]
      }
    });
    return response.text || "Analysis complete but empty.";
  } catch (error) {
    throw new Error(handleApiError(error));
  }
};
