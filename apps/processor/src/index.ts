import "./config";

import express from "express";
import cors from "cors";
import multer from "multer";
import { writeFileSync } from "./lib/file";
import { BookDetectorService } from "./services/book-detector-service";

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3002;

app.post(
  "/api/analyze",
  upload.single("file"),
  async (req: express.Request, res: express.Response) => {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    try {
      const result = await new BookDetectorService().detectBook(
        req.file.buffer
      );
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
