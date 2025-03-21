import { GoogleGenerativeAI } from "@google/generative-ai";
import config from "../config";
import { writeFileSync, readFileSync } from "./file";

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
}
