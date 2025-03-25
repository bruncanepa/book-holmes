import { GoogleGenerativeAI } from "@google/generative-ai";
import config from "../config";
import { writeFileSync, readFileSync } from "./file";
import { detectBookContentPrompt, detectBookTitlePrompt } from "../prompts";

export class GoogleGemini {
  private model: GoogleGenerativeAI;

  constructor() {
    this.model = new GoogleGenerativeAI(config.googleGemini.apiKey);
  }

  async chatCompletion(id: string, prompt: string): Promise<string> {
    try {
      const fileName = `mocks/gemini-response-${id}.txt`;
      if (config.mock.googleGemini) {
        let data: string | undefined;
        try {
          data = readFileSync(fileName);
        } catch (error) {}
        if (data) return data;
      }

      const model = this.model.getGenerativeModel({
        model: "gemini-2.0-flash",
      });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const resText = response.text();
      writeFileSync(fileName, resText);
      return resText;
    } catch (error) {
      console.error("Error in Gemini chat completion:", error);
      throw new Error("Failed to get response from Gemini");
    }
  }

  async imageCompletion(
    id: string,
    prompt: string,
    imageBuffer: Buffer
  ): Promise<string> {
    try {
      const fileName = `mocks/gemini-image-response-${id}.txt`;
      if (config.mock.googleGemini) {
        let data: string | undefined;
        try {
          data = readFileSync(fileName);
        } catch (error) {}
        if (data) return data;
      }

      const model = this.model.getGenerativeModel({
        model: "gemini-2.0-flash",
      });

      // Convert buffer to base64 and create a part for the Gemini API
      const base64Image = imageBuffer.toString("base64");
      const imagePart = {
        inlineData: {
          data: base64Image,
          mimeType: "image/jpeg", // Assuming JPEG, adjust if needed
        },
      };

      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const resText = response.text();
      writeFileSync(fileName, resText);
      return resText;
    } catch (error) {
      console.error("Error in Gemini image completion:", error);
      throw new Error("Failed to get response from Gemini for image");
    }
  }

  async detectBookTitle(
    imageBuffer: Buffer
  ): Promise<{ isBook: boolean; title: string; author: string }> {
    try {
      const result = await this.imageCompletion(
        "book-title",
        detectBookTitlePrompt,
        imageBuffer
      );
      console.log("result", result);

      // Try to parse JSON response
      // First, try to extract JSON if it's wrapped in markdown code blocks or other text
      const jsonMatch =
        result.match(/```(?:json)?\s*({[\s\S]*?})\s*```/) ||
        result.match(/{[\s\S]*"isBook"[\s\S]*"title"[\s\S]*"author"[\s\S]*}/);

      if (jsonMatch && jsonMatch[1]) {
        const jsonData = JSON.parse(jsonMatch[1]);
        return {
          isBook: Boolean(jsonData.isBook),
          title: jsonData.title || "",
          author: jsonData.author || "",
        };
      }

      // If we can't find or parse JSON, try to extract information from text
      const titleMatch = result.match(/title[:\s]+["']?([^"'\n,]+)["']?/i);
      const authorMatch = result.match(/author[:\s]+["']?([^"'\n,]+)["']?/i);
      const isBookMatch =
        result.toLowerCase().includes("book") &&
        !result.toLowerCase().includes("not a book") &&
        !result.toLowerCase().includes("no book");

      if (
        titleMatch &&
        titleMatch[1] &&
        authorMatch &&
        authorMatch[1] &&
        isBookMatch
      ) {
        return {
          isBook: true,
          title: titleMatch[1].trim(),
          author: authorMatch[1].trim(),
        };
      }

      // Default fallback
      return {
        isBook: false,
        title: "",
        author: "",
      };
    } catch (error) {
      console.error("Error parsing book detection result:", error);
      return {
        isBook: false,
        title: "",
        author: "",
      };
    }
  }

  async detectBookContent(imageBuffer: Buffer): Promise<string> {
    try {
      const result = await this.imageCompletion(
        "book-content",
        detectBookContentPrompt,
        imageBuffer
      );

      // Clean up the response if needed (removing any potential markdown or extra formatting)
      const cleanedResult = result
        .replace(/```([\s\S]*?)```/g, "$1") // Remove code blocks if present
        .trim();

      return cleanedResult;
    } catch (error) {
      console.error("Error extracting book content from image:", error);
      return "";
    }
  }
}
