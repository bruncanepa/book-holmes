import {
  BookDetectionDto,
  BookDetectionDtoSchema,
  BookDetectionEvent,
} from "../dtos/book-detection.dto";
import { GoogleBooks } from "../lib/google-books";
import { GoogleGemini } from "../lib/google-gemini";
import { GoogleVision } from "../lib/google-vision";
import { ScraperCloudflare } from "../lib/scraper-cloudflare";
import { Scraper } from "../lib/scraper-local";
import { bookTitlePrompt } from "../prompts";

export class BookDetectorService {
  private vision: GoogleVision;
  private gemini: GoogleGemini;
  private googleBooks: GoogleBooks;
  private sendUpdate?: (event: BookDetectionEvent) => void;

  constructor(sendUpdate?: (event: BookDetectionEvent) => void) {
    this.vision = new GoogleVision();
    this.gemini = new GoogleGemini();
    this.googleBooks = new GoogleBooks();
    this.sendUpdate = sendUpdate;
  }

  private emitEvent(event: BookDetectionEvent) {
    if (this.sendUpdate) {
      this.sendUpdate(event);
    } else {
      console.log(
        `EVENT: ${event.type} ${event.data ? JSON.stringify(event.data) : ""}`
      );
    }
  }

  async checkIfObjectIsBook(imageBuffer: Buffer) {
    const objects = await this.vision.detectObject(imageBuffer);
    let isBook = false;

    const categories = ["book", "box"];

    for (const object of objects) {
      if (!object?.name) continue;
      if (categories.some((cat) => object.name!.toLowerCase().includes(cat))) {
        console.log(
          `Book detected (Confidence: ${((object.score || 0) * 100).toFixed(2)}%)`
        );
        isBook = true;
        break;
      }
    }

    if (!isBook) {
      const error = "No book detected in the image.";
      console.error(
        error,
        JSON.stringify({ objects: objects.map((o) => o.name) })
      );
      throw new Error(error);
    }

    return isBook;
  }

  async extractTextFromImage(imageBuffer: Buffer) {
    const textResult = await this.vision.detectText("object", imageBuffer);
    if (!textResult) {
      throw new Error("It's a book, but no text found in image");
    }

    const fullText = textResult?.description;
    const possibleTitle = fullText
      ?.replaceAll(/[^a-zA-Z0-9]/g, " ")
      .replaceAll("\n", " ")
      .trim();
    if (!possibleTitle) {
      throw new Error("It's a book, but no title found in image");
    }

    const titleAi = await this.gemini
      .chatCompletion("book-title", `${bookTitlePrompt}\n\nText: ${fullText}`)
      .catch(console.error);

    return titleAi || possibleTitle;
  }

  async getBookInfo(title: string) {
    try {
      const book = await this.googleBooks.getBookByTitle(title);
      if (!book) throw new Error("Book not found");

      const categories: string[] = this.googleBooks.getBookCategories(book);
      const isFiction = categories.some((cat: string) =>
        /fiction|novel|stories|fantasy|sci-fi|romance/i.test(cat)
      );

      const { previewLink } = this.googleBooks.getBookPreviewLink(book);

      return { isFiction, book, previewLink };
    } catch (error) {
      console.error("GetBookInfo error:", error);
      throw new Error("Failed to get book information");
    }
  }

  async detectBook(imageBuffer: Buffer): Promise<BookDetectionDto> {
    const data: BookDetectionDto = {};
    try {
      console.log("Checking if object is book...");
      await this.checkIfObjectIsBook(imageBuffer);
      console.log("Object is book");
      data.isBook = true;
      this.emitEvent({ type: "book-detected", data: { isBook: true } });

      console.log("Extracting text from image...");
      data.title = await this.extractTextFromImage(imageBuffer);
      this.emitEvent({ type: "book-title", data: { title: data.title } });

      console.log("Getting book info...");
      const { isFiction, previewLink, book } = await this.getBookInfo(
        data.title
      );
      data.type = isFiction ? "fiction" : "non-fiction";
      this.emitEvent({ type: "book-type", data: { type: data.type } });

      if (book.volumeInfo.description) {
        data.description = book.volumeInfo.description;
        this.emitEvent({
          type: "book-description",
          data: { description: data.description },
        });
      }
      console.log("Getting book content...");
      if (previewLink) {
        const { content } = await new ScraperCloudflare().scrapeBookContent(
          previewLink,
          isFiction ? "2" : "1"
        );
        data.text = content;
      }
      console.log("Getting book content...", data.text);
      if (!data.text) throw new Error("No book content found");
    } catch (error) {
      console.error("Error processing image:", error);
      data.error =
        error instanceof Error ? error.message : "Failed to process image";
    } finally {
      return BookDetectionDtoSchema.parse(data);
    }
  }
}
