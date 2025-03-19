import puppeteer, { Page } from "puppeteer";
import { GoogleGemini } from "./google-gemini";
import { GoogleVision } from "./google-vision";
import { bookSectionsPrompt as findBookFirstSectionPrompt } from "../prompts";
import config from "../config";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface PageClipConfig {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class Scraper {
  private vision: GoogleVision;

  constructor() {
    this.vision = new GoogleVision();
  }

  private async extractTextFromScreenshot(screenshot: string): Promise<string> {
    // Convert base64 to buffer
    const buffer = Buffer.from(screenshot, "base64");
    const textResult = await this.vision.detectText("book-screenshot", buffer);
    return textResult?.description || "";
  }

  private getTOCLinks(page: Page) {
    return page.evaluate(() => {
      const div = document.getElementById("toc");
      const anchorTags = div?.querySelectorAll("a");
      if (!anchorTags?.length) {
        return [];
      }

      // Map links to objects with href and text
      const linkData = Array.from(anchorTags).map((a, id) => ({
        id,
        href: a.href || a.getAttribute("href") || "No href",
        text: a.textContent?.trim() || "No text",
      }));

      return linkData;
    });
  }

  private scroll(page: Page, height: number) {
    return page.evaluate((size) => {
      if (size) {
        const scrollDiv = document.querySelector(".overflow-scrolling");
        if (scrollDiv) scrollDiv.scroll(0, size);
      }
    }, height);
  }

  async scrapeBookContent(url: string, pageNumber: "1" | "2") {
    let content = "";
    let screenshot = "";
    const browser = await puppeteer.launch({
      headless: config.puppeteer.headless,
      args: ["--no-sandbox"],
    });
    try {
      const urlParams = new URL(url).searchParams;
      urlParams.delete("printsec");
      const finalUrl = `${new URL(url).origin}${new URL(url).pathname}?${urlParams.toString()}`;

      const page = await browser.newPage();
      await page.setViewport({
        width: 1000,
        height: 1200,
        deviceScaleFactor: 0.73,
      });
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      );
      await page.goto(finalUrl, { waitUntil: "load" });
      await wait(200);

      const links = await this.getTOCLinks(page);
      if (!links.length) throw new Error("No links found");

      const prompt = findBookFirstSectionPrompt(links.map((link) => link.text));

      const res = await new GoogleGemini().chatCompletion("book-link", prompt);
      const index = Number(res.trim().replace(/\D/g, ""));
      if (isNaN(index) || index < 0 || index >= links.length) {
        console.error(JSON.stringify({ res, index, links }));
        throw new Error("No first content section found");
      }

      const firstSectionLink = links[index]!.href;
      await page.goto(firstSectionLink, { waitUntil: "load" });
      await wait(200);

      const clip: PageClipConfig = {
        x: 275,
        y: 120,
        width: 700,
        height: 1000,
      };

      switch (pageNumber) {
        case "1": {
          screenshot = await page.screenshot({
            encoding: "base64",
            clip,
          });
          content = await this.extractTextFromScreenshot(screenshot);
          break;
        }
        case "2": {
          await this.scroll(page, 2200);
          await wait(100);
          screenshot = (await page.screenshot({
            encoding: "base64",
            clip,
          })) as string;
          content = await this.extractTextFromScreenshot(screenshot);
          break;
        }
      }
    } catch (err) {
      console.error(err);
      if (!content && !screenshot) throw new Error("No content found for book");
    } finally {
      await browser.close();
      return { content, screenshot };
    }
  }
}
