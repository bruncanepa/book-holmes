import "./config";

import express from "express";
import cors from "cors";
import multer from "multer";
import { z } from "zod";
import axios from "axios";
import fs from "fs";
import { GoogleVision } from "./lib/googleVision";

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const vision = new GoogleVision();

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

async function getBookInfo(title: string): Promise<{ isFiction: boolean }> {
  try {
    // Use Google Books API to get book information
    const response = await axios.get(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(title)}`
    );
    const book = response.data.items?.[0];

    if (!book) {
      throw new Error("Book not found");
    }

    // Check categories and subject to determine if it's fiction
    const categories: string[] = book.volumeInfo?.categories || [];
    const isFiction = categories.some((cat: string) =>
      /fiction|novel|stories|fantasy|sci-fi|romance/i.test(cat)
    );

    return { isFiction };
  } catch (error) {
    throw new Error("Failed to get book information");
  }
}

async function getBookContent(
  title: string,
  isFiction: boolean
): Promise<string> {
  try {
    // Use Open Library API to search for the book
    const searchResponse = await axios.get(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(title)}`
    );
    const bookId = searchResponse.data.docs?.[0]?.key;

    if (!bookId) {
      throw new Error("Book content not found");
    }

    // Get book content from Internet Archive (this is a simplified example)
    // In reality, you'd need to handle authentication and proper content access
    const contentResponse = await axios.get(
      `https://archive.org/details/${bookId}/page/${isFiction ? 1 : 2}`
    );

    // This is a placeholder - in reality, you'd need to parse the HTML content
    // and extract the actual page text
    return contentResponse.data;
  } catch (error) {
    throw new Error("Failed to get book content");
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
    const textResult = await vision.detectText(imageBuffer);
    if (!textResult) {
      throw new Error("It's a book, but no text found in image");
    }

    // The first textAnnotation contains the full text detected in the image
    const fullText = textResult?.description;
    console.log("Full text detected:\n", fullText);

    // Simple heuristic: Assume the first prominent text block is the title
    const title = fullText?.replaceAll("\n", " ").trim();
    if (!title) throw new Error("It's a book, but no title found in image");
    data.title = title;

    // Get book information and content
    const { isFiction } = await getBookInfo(title);
    data.type = isFiction ? "fiction" : "non-fiction";

    const pageContent = await getBookContent(title, isFiction);
    data.text = pageContent;
  } catch (error) {
    data.error =
      error instanceof Error ? error.message : "Failed to process image";
  } finally {
    return BookDetectionSchema.parse(data);
  }
}

let counter = 0;
app.post(
  "/api/analyze",
  upload.single("file"),
  async (req: express.Request, res: express.Response) => {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    try {
      // counter++;
      // if (counter % 3 === 0) {
      //   res.status(400).json({
      //     error: "Not implemented",
      //     isBook: true,
      //     text: "",
      //     title: "La balada de los elefantes",
      //     type: "fiction",
      //   } as BookDetection);
      // } else if (counter % 3 === 1) {
      //   res.status(200).json({
      //     isBook: true,
      //     text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed sit amet nulla auctor, vestibulum magna sed, convallis ex. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Integer posuere erat a ante venenatis dapibus posuere velit aliquet. Aenean lacinia bibendum nulla sed consectetur. Nulla vitae elit libero, a pharetra augue. Sed posuere consectetur est at lobortis. Nullam id dolor id nibh ultricies vehicula ut id elit. Morbi leo risus, porta ac consectetur ac, vestibulum at eros. Praesent commodo cursus magna, vel scelerisque nisl consectetur et. Vivamus sagittis lacus vel augue laoreet rutrum faucibus dolor auctor. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Integer posuere erat a ante venenatis dapibus posuere velit aliquet. Aenean eu leo quam. Pellentesque ornare sem lacinia quam venenatis vestibulum. Maecenas sed diam eget risus varius blandit sit amet non magna. Nullam quis risus eget urna mollis ornare vel eu leo. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec id elit non mi porta gravida at eget metus. Morbi leo risus, porta ac consectetur ac, vestibulum at eros. Donec ullamcorper nulla non metus auctor fringilla. Praesent commodo cursus magna, vel scelerisque nisl consectetur et. Vivamus sagittis lacus vel augue laoreet rutrum faucibus dolor auctor.",
      //     title: "La balada de los elefantes",
      //     type: "fiction",
      //   } as BookDetection);
      // } else {
      //   res.status(400).json({
      //     error: "Not implemented",
      //   } as BookDetection);
      // }

      const result = await detectBook(req.file.buffer);
      fs.writeFileSync("result.json", JSON.stringify(result, null, 2));
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
