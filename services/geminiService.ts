import { GoogleGenAI, Type } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";
import { Issue, TenantCase, AIAnalysisResponse } from "../types";

// Types for schema definition
// We need to define the schema manually as the SDK types can be verbose to construct inline
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    issue: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        category: { type: Type.STRING },
        room: { type: Type.STRING },
        severity: { type: Type.STRING, enum: ["low", "medium", "high", "emergency"] },
        status: { type: Type.STRING, enum: ["ongoing", "resolved", "partial"] },
        first_noticed_at: { type: Type.STRING },
        description: { type: Type.STRING },
        habitability_categories: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
    },
    evidence_items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          ai_caption: { type: Type.STRING },
        }
      }
    },
    timeline_summary: { type: Type.STRING },
    pattern_summary: { type: Type.STRING },
    disclaimer: { type: Type.STRING },
  }
};

const reportSchema = {
  type: Type.OBJECT,
  properties: {
    report_snippet: { type: Type.STRING },
    timeline_summary: { type: Type.STRING },
    pattern_summary: { type: Type.STRING },
    disclaimer: { type: Type.STRING },
  }
};

class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = process.env.API_KEY || '';
    this.ai = new GoogleGenAI({ apiKey });
  }

  async analyzeIssueWithEvidence(description: string, imageBase64?: string, mimeType: string = 'image/jpeg'): Promise<AIAnalysisResponse> {
    try {
      const parts: any[] = [{ text: `Analyze this housing issue description and/or image. Extract issue details and suggest a caption if image is present. Description: ${description}` }];
      
      if (imageBase64) {
        // Remove data URL prefix if present for the API call
        const cleanBase64 = imageBase64.split(',')[1] || imageBase64;
        parts.push({
          inlineData: {
            mimeType: mimeType,
            data: cleanBase64
          }
        });
      }

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts },
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: responseSchema
        }
      });

      const text = response.text;
      if (!text) throw new Error("No response from AI");
      return JSON.parse(text) as AIAnalysisResponse;

    } catch (error) {
      console.error("Gemini Analysis Error:", error);
      throw error;
    }
  }

  async generateReport(caseData: TenantCase): Promise<AIAnalysisResponse> {
    try {
      const prompt = `
        Generate a formal habitability report for the following case data.
        Return a 'report_snippet' in Markdown format that serves as the body of a formal letter or record.
        Include a 'timeline_summary' and 'pattern_summary'.
        
        CASE DATA:
        ${JSON.stringify(caseData, null, 2)}
      `;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: reportSchema
        }
      });

      const text = response.text;
      if (!text) throw new Error("No response from AI");
      return JSON.parse(text) as AIAnalysisResponse;
    } catch (error) {
      console.error("Gemini Report Error:", error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();