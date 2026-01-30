
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { PrayerResponse } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generatePrayer(situation: string, subTopic: string, language: string): Promise<PrayerResponse> {
  const prompt = `Act as a world-class spiritual guide, theologian, and compassionate storyteller. 
  You are generating an entry for a vast digital sanctuary.
  General Category: "${situation}"
  Specific Focus: "${subTopic}"
  Target Language: ${language}
  
  The entire response MUST be in ${language}, except for the "imagePrompt" field which MUST be in English.
  
  Structure the JSON output with these components:
  
  1. Title: A majestic and comforting title.
  
  2. Story: A "Cinematic Story" (4-5 detailed paragraphs). Describe a relatable scenario. Focus on sensory details, emotional struggle, and the pivotal moment of faith.
  
  3. Prayer: A "Foundation Prayer" (20-30 lines). 
     - CRITICAL: You MUST quote 3-4 specific Bible scriptures directly within the prayer text naturally.
  
  4. FocusPoints: An array of 3 specific "Meditative Points" (title, description, scripture).

  5. CrossReferences: An array of 3 "Deep Connections" (theme, reference).

  6. References: A list of the 3-4 primary Bible verses used.

  7. imagePrompt: A detailed English description for an AI image generator (E.g. "An oil painting of a peaceful garden with soft light filtering through trees, ethereal atmosphere, spiritual peace").
  
  Tone: Biblical, tender, empathetic, and authoritative. Ensure the tone is respectful and spiritually uplifting.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            story: { type: Type.STRING },
            prayer: { type: Type.STRING },
            imagePrompt: { type: Type.STRING },
            focusPoints: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  scripture: { type: Type.STRING },
                },
                required: ["title", "description", "scripture"]
              }
            },
            crossReferences: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  theme: { type: Type.STRING },
                  reference: { type: Type.STRING }
                },
                required: ["theme", "reference"]
              }
            },
            references: { 
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ["title", "story", "prayer", "references", "focusPoints", "crossReferences", "imagePrompt"],
        },
      },
    });

    const text = response.text;
    if (!text) {
      if (response.candidates?.[0]?.finishReason === 'SAFETY') {
        throw new Error("The request was filtered for safety. Please try a different scenario.");
      }
      throw new Error("The sanctuary is silent. Please try your request again.");
    }
    
    return JSON.parse(text) as PrayerResponse;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}

export async function generateImage(prompt: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          text: `Digital art masterpiece: ${prompt}. Cinematic lighting, soft ethereal glow, spiritual and peaceful, highly detailed, 4k.`,
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "16:9"
      }
    },
  });

  const candidate = response.candidates?.[0];
  if (!candidate || !candidate.content?.parts) {
    throw new Error("No image generated");
  }

  for (const part of candidate.content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  
  throw new Error("Failed to extract image data");
}

export async function generateAudio(text: string, voiceName: string = 'Kore'): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Read the following with deep compassion and a soothing tone: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voiceName },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("Audio generation failed");
  return base64Audio;
}
