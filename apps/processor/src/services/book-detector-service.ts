import {
  BookDetectionDto,
  BookDetectionDtoSchema,
} from "../dtos/book-detection.dto";
import { GoogleBooks } from "../lib/google-books";
import { GoogleGemini } from "../lib/google-gemini";
import { GoogleVision } from "../lib/google-vision";
import { Scraper } from "../lib/scraper";
import { bookTitlePrompt } from "../prompts";

export class BookDetectorService {
  private vision: GoogleVision;
  private gemini: GoogleGemini;
  private googleBooks: GoogleBooks;

  constructor() {
    this.vision = new GoogleVision();
    this.gemini = new GoogleGemini();
    this.googleBooks = new GoogleBooks();
  }

  async checkIfObjectIsBook(imageBuffer: Buffer) {
    const objects = await this.vision.detectObject(imageBuffer);
    let isBook = false;
    let bookBoundingBox = null;

    for (const object of objects) {
      if (object?.name?.toLowerCase() === "book") {
        console.log(
          `Book detected (Confidence: ${((object.score || 0) * 100).toFixed(2)}%)`
        );
        isBook = true;
        bookBoundingBox = object.boundingPoly; // Save bounding box for potential refinement
        break;
      }
    }

    if (!isBook) {
      console.error(
        "No book detected in the image.",
        JSON.stringify({ objects: objects.map((o) => o.name) })
      );
      throw new Error("No book detected in the image.");
    }

    return isBook;
  }

  async extractTextFromImage(imageBuffer: Buffer) {
    const textResult = await this.vision.detectText("object", imageBuffer);
    if (!textResult) {
      throw new Error("It's a book, but no text found in image");
    }

    // The first textAnnotation contains the full text detected in the image
    const fullText = textResult?.description;

    // Simple heuristic: Assume the first prominent text block is the title
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

      // Check categories and subject to determine if it's fiction
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
    type NewType = BookDetectionDto;

    const data: NewType = {};
    try {
      const svc = new BookDetectorService();

      await svc.checkIfObjectIsBook(imageBuffer);

      data.isBook = true;
      data.title = await svc.extractTextFromImage(imageBuffer);

      const { isFiction, previewLink } = await svc.getBookInfo(data.title);
      data.type = isFiction ? "fiction" : "non-fiction";

      if (previewLink) {
        const content = await new Scraper().scrapeBookContent(
          previewLink,
          isFiction ? "2" : "1"
        );
        data.text = content || "";
      }
      // TODO: add snippet as description
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
