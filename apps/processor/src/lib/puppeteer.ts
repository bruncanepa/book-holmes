import puppeteer, { Browser, Page } from "@cloudflare/puppeteer";

interface Env {
  MYBROWSER: Fetcher;
  BOOK_HOLMES: KVNamespace;
}

interface PageClipConfig {
  x: number;
  y: number;
  width: number;
  height: number;
}

const getTOCLinks = (
  page: Page
): Promise<{ id: number; href: string; text: string }[]> => {
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
};

const scroll = (page: Page, height: number) => {
  return page.evaluate((size) => {
    if (size) {
      const scrollDiv = document.querySelector(".overflow-scrolling");
      if (scrollDiv) scrollDiv.scroll(0, size);
    }
  }, height);
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    let browser: Browser | null = null;
    let screenshot = "";
    let message = "";
    let links: { id: number; href: string; text: string }[] = [];
    try {
      const urlReceivedObj = new URL(request.url);
      const urlReceived = urlReceivedObj.searchParams?.get("url") as string;
      if (!urlReceived) throw new Error("No url provided");
      const decodedUrlObj = new URL(decodeURIComponent(urlReceived));
      const decodedUrl = decodedUrlObj.toString();
      const pageNumber = decodedUrlObj.searchParams?.get("pageNumber") as
        | "1"
        | "2";
      const scrapeStep = decodedUrlObj.searchParams?.get("scrapeStep") as
        | "1"
        | "2";
      console.log(
        JSON.stringify({ scrapeStep, pageNumber, urlReceived, decodedUrl })
      );
      if (decodedUrl) {
        const urlObj = new URL(decodedUrl);
        urlObj.searchParams.delete("printsec");
        const finalUrl = urlObj.toString();

        browser = await puppeteer.launch(env.MYBROWSER);
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

        if (scrapeStep !== "2") {
          links = await getTOCLinks(page);
          if (!links.length) throw new Error("No links found");
        } else {
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
              break;
            }
            case "2": {
              await scroll(page, 2200);
              await wait(100);
              screenshot = (await page.screenshot({
                encoding: "base64",
                clip,
              })) as string;
              break;
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
      message = "Failed to process book: " + error;
    } finally {
      if (browser) await browser.close().catch(console.error);
      return new Response(JSON.stringify({ screenshot, message, links }), {
        headers: { "content-type": "application/json" },
      });
    }
  },
} satisfies ExportedHandler<Env>;
