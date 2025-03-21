import axios from "axios";
import { findBookFirstSectionPrompt } from "../prompts";
import { GoogleGemini } from "./google-gemini";
import { GoogleVision } from "./google-vision";
import config from "../config";

export class ScraperCloudflare {
  private extractTextFromScreenshot = async (
    screenshot: string
  ): Promise<string> => {
    // Convert base64 to buffer
    const buffer = Buffer.from(screenshot, "base64");
    const vision = new GoogleVision();
    const textResult = await vision.detectText("book-screenshot", buffer);
    return textResult?.description || "";
  };

  async scrapeBookContent(url: string, pageNumber: "1" | "2") {
    const mainUrl = new URL(url);
    mainUrl.searchParams.delete("printsec");
    const encodedMainUrl = encodeURIComponent(mainUrl.toString());

    const { links, message } = (
      await axios.get<{
        links: { id: number; href: string; text: string }[];
        message: string;
      }>(`${config.cloudflare.puppeteerUrl}/?url=${encodedMainUrl}`)
    ).data;

    if (!links.length) {
      console.error("Scrapebookcontent", message);
      throw new Error("No links found");
    }

    console.log("Links:", links);

    const prompt = findBookFirstSectionPrompt(links.map((link) => link.text));

    const res = await new GoogleGemini().chatCompletion("book-link", prompt);
    const index = Number(res.trim().replace(/\D/g, ""));
    if (isNaN(index) || index < 0 || index >= links.length) {
      console.error(JSON.stringify({ res, index, links }));
      throw new Error("No first content section found");
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
