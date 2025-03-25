import axios from "axios";
import { findBookFirstSectionPrompt } from "../prompts";
import { GoogleGemini } from "./google-gemini";
import config from "../config";
import { GoogleVision } from "./google-vision";
import { writeFileSync } from "fs";

export class ScraperCloudflare {
  private gemini: GoogleGemini;
  private vision: GoogleVision;
  constructor(private useVision: boolean) {
    this.gemini = new GoogleGemini();
    this.vision = new GoogleVision();
  }

  private extractTextFromScreenshot = async (
    screenshot: string
  ): Promise<string> => {
    // Convert base64 to buffer
    const buffer = Buffer.from(screenshot, "base64");
    if (this.useVision) {
      const textResult = await this.vision.detectText(
        "book-screenshot",
        buffer
      );
      return textResult?.description || "";
    }
    return this.gemini.detectBookContent(buffer);
  };

  async scrapeBookContent(url: string, pageNumber: "1" | "2") {
    const mainUrl = new URL(url);
    mainUrl.searchParams.delete("printsec");
    const encodedMainUrl = encodeURIComponent(mainUrl.toString());

    const {
      links,
      message,
      // screenshot: tocScreenshot,
    } = (
      await axios.get<{
        links: { id: number; href: string; text: string }[];
        message: string;
        screenshot: string;
      }>(`${config.cloudflare.puppeteerUrl}/?url=${encodedMainUrl}`)
    ).data;

    if (!links.length) {
      console.error("Scrapebookcontent", message);
      throw new Error("No links found");
    }

    console.log("Links:", links);

    const prompt = findBookFirstSectionPrompt(links.map((link) => link.text));

    const res = await this.gemini.chatCompletion("book-link", prompt);
    // Clean the response and ensure we're getting just the number
    const cleanedResponse = res.trim();
    // Parse the response as a number, handling both formats: with or without quotes
    const index = parseInt(cleanedResponse.replace(/[^0-9\-]/g, ""), 10);

    if (isNaN(index) || index < 0 || index >= links.length) {
      // writeFileSync("toc-screenshot.png", Buffer.from(tocScreenshot, "base64"));

      console.error(
        "No first content section found",
        JSON.stringify({ res, cleanedResponse, index, links })
      );
      throw new Error("No free preview for the book found");
    }

    const firstSectionLink = links[index]!.href;
    const firstSectionUrl = new URL(firstSectionLink);
    firstSectionUrl.searchParams.append("scrapeStep", "2");
    firstSectionUrl.searchParams.append("pageNumber", pageNumber);
    const encodedFirstSectionUrl = encodeURIComponent(
      firstSectionUrl.toString()
    );

    const { screenshot, message: screenshotMessage } = (
      await axios.get<{
        screenshot: string;
        message: string;
      }>(`${config.cloudflare.puppeteerUrl}/?url=${encodedFirstSectionUrl}`)
    ).data;

    if (!screenshot) {
      console.error("Scrapebookcontent", screenshotMessage);
      throw new Error("No screenshot found");
    }

    const content = await this.extractTextFromScreenshot(screenshot);

    return { content, screenshot };
  }
}
