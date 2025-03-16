import "./config";

import express, { text } from "express";
import cors from "cors";
import multer from "multer";
import { z } from "zod";
import { GoogleVision } from "./lib/googleVision";
import { GoogleGemini } from "./lib/googleGemini";
import { bookTitlePrompt } from "./prompts";
import { GoogleBooks } from "./lib/googleBooks";
import { Scraper } from "./lib/scraper";
import { writeFileSync } from "./lib/file";

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const vision = new GoogleVision();
const gemini = new GoogleGemini();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3002;

// Schema for validating book detection results
const BookDetectionSchema = z.object({
  isBook: z.boolean().optional(),
  title: z.string().optional(),
  type: z.string().optional(),
  text: z.string().optional(),
  error: z.string().optional(),
});

type BookDetection = Partial<z.infer<typeof BookDetectionSchema>>;

async function getBookInfo(title: string) {
  try {
    const googleBooks = new GoogleBooks();

    const book = await googleBooks.getBookByTitle(title);
    if (!book) throw new Error("Book not found");

    // Check categories and subject to determine if it's fiction
    const categories: string[] = googleBooks.getBookCategories(book);
    const isFiction = categories.some((cat: string) =>
      /fiction|novel|stories|fantasy|sci-fi|romance/i.test(cat)
    );

    return { isFiction, book };
  } catch (error) {
    console.error("GetBookInfo error:", error);
    throw new Error("Failed to get book information");
  }
}

async function detectBook(imageBuffer: Buffer): Promise<BookDetection> {
  const data: BookDetection = {};
  try {
    const objects = await vision.detectObject(imageBuffer);

    let bookBoundingBox = null;
    for (const object of objects) {
      if (object?.name?.toLowerCase() === "book") {
        console.log(
          `Book detected (Confidence: ${((object.score || 0) * 100).toFixed(2)}%)`
        );
        data.isBook = true;
        bookBoundingBox = object.boundingPoly; // Save bounding box for potential refinement
        break;
      }
    }
    if (!data.isBook) throw new Error("No book detected in the image.");

    // Step 2: Extract text from the image
    const textResult = await vision.detectText("object", imageBuffer);
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
    if (!possibleTitle)
      throw new Error("It's a book, but no title found in image");

    const titleAi = await gemini
      .chatCompletion("book-title", `${bookTitlePrompt}\n\nText: ${text}`)
      .catch(console.error);

    data.title = titleAi || possibleTitle;

    const { isFiction, book } = await getBookInfo(data.title);
    data.type = isFiction ? "fiction" : "non-fiction";

    const { previewLink } = new GoogleBooks().getBookPreviewLink(book);
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
    return BookDetectionSchema.parse(data);
  }
}

app.post(
  "/api/analyze",
  upload.single("file"),
  async (req: express.Request, res: express.Response) => {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    try {
      const result = await detectBook(req.file.buffer);
      writeFileSync("result.json", JSON.stringify(result, null, 2));
      res.status(result.error ? 400 : 200).json(result);
    } catch (error) {
      res.status(500).json({
        error:
          error instanceof Error ? error.message : "Failed to process image",
      });
    }
  }
);

app.listen(PORT, () => {
  console.log(`Processor service running on port ${PORT}`);
});
