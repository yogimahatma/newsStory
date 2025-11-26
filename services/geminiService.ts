import { GoogleGenAI } from "@google/genai";
import { StoryData } from "../types";
import { SYSTEM_PROMPT } from "../constants";

/**
 * Extracts JSON from a text that might contain markdown code blocks
 */
const extractJson = (text: string): any => {
  try {
    // Try parsing directly first
    return JSON.parse(text);
  } catch (e) {
    // Try finding json block
    const match = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1]);
      } catch (e2) {
        console.error("Failed to parse extracted JSON block", e2);
      }
    }
    // Try finding just braces if no code block
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
       try {
        return JSON.parse(text.substring(firstBrace, lastBrace + 1));
      } catch (e3) {
        console.error("Failed to parse brute extracted JSON", e3);
      }
    }
    throw new Error("Could not parse JSON response from model");
  }
};

export const generateStoryFromUrl = async (url: string): Promise<StoryData> => {
  // Initialize AI client lazily inside the function
  // This prevents the app from crashing at startup if process.env is undefined in the browser
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // 1. Analyze URL and Extract Content
  const analysisResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `URL Artikel: ${url}`,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      tools: [{ googleSearch: {} }],
      // Note: We cannot use responseMimeType: 'application/json' with googleSearch tool
      // So we rely on the prompt to enforce JSON output
    },
  });

  const text = analysisResponse.text;
  if (!text) throw new Error("No response from Gemini");

  let data: StoryData;
  try {
    data = extractJson(text);
  } catch (error) {
    throw new Error("Failed to parse article data. Please try again.");
  }

  // 2. Fallback Image Generation if needed
  if (!data.image_url && data.generated_image_prompt) {
    try {
      const imageResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: data.generated_image_prompt }],
        },
        config: {
            imageConfig: {
                aspectRatio: "4:3", // Horizontal as requested
            }
        }
      });

      // Extract image
      for (const part of imageResponse.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          data.image_url = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }
    } catch (imgError) {
      console.error("Failed to generate fallback image", imgError);
      // Fallback to a placeholder if generation fails
      data.image_url = "https://picsum.photos/800/600";
    }
  }

  // Final validation
  if (!data.paragraphs || !Array.isArray(data.paragraphs)) {
      data.paragraphs = ["Konten tidak dapat dimuat.", "Silakan cek URL asli.", ""];
  }

  // Ensure strict 3 paragraphs
  while (data.paragraphs.length < 3) {
      data.paragraphs.push("");
  }
  
  // Truncate if more than 3
  if (data.paragraphs.length > 3) {
      data.paragraphs = data.paragraphs.slice(0, 3);
  }
  
  return data;
};