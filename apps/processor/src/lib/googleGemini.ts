import fs from "fs";
import { GoogleGenerativeAI } from "@google/generative-ai";
import config from "../config";

export class GoogleGemini {
  private model: GoogleGenerativeAI;

  constructor() {
    this.model = new GoogleGenerativeAI(config.googleGemini.apiKey);
  }

  async generateText(prompt: string) {
    try {
      const model = this.model.getGenerativeModel({ model: "gemini-2.0-flash" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error("Error generating text:", error);
      throw new Error("Failed to generate text with Gemini");
    }
  }

  async chatCompletion(prompt: string, text: string): Promise<string> {
    try {
      if (config.mock.googleGemini) {
        const data = fs.readFileSync("gemini-response.txt", "utf8");
        return data;
      }

      const model = this.model.getGenerativeModel({ model: "gemini-2.0-flash" });
      const result = await model.generateContent(`${prompt}\n\nText: ${text}`);
      const response = await result.response;
      const resText = response.text();
      fs.writeFileSync(`gemini-response.txt`, resText);
      return resText;
    } catch (error) {
      console.error("Error in Gemini chat completion:", error);
      throw new Error("Failed to get response from Gemini");
    }
  }
}
