import config from "./config";

import express from "express";
import rateLimit from "express-rate-limit";
import multer from "multer";
import { writeFileSync } from "./lib/file";
import { BookDetectorService } from "./services/book-detector.service";
import { BookDetectionEvent } from "./dtos/book-detection.dto";
import axios from "axios";

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.set("trust proxy", 1);
app.use((_, res, next) => {
  res.header(
    "Access-Control-Allow-Origin",
    process.env.NODE_ENV === "production" ? config.web.url : "*"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header("Access-Control-Allow-Credentials", "true");
  next();
});
app.use(express.json());

const PORT = process.env.PORT || 3002;

// app.use(
//   "/api/*",
//   rateLimit({
//     windowMs: 60 * 1000, // 1 minutes
//     max: 100, // limit each IP to 100 requests per windowMs
//   })
// );

// Helper function to send updates to all clients
const sendUpdate = (clientId: string) => async (event: BookDetectionEvent) => {
  try {
    console.log("Sending message to", clientId);
    const data = JSON.stringify(event);
    await axios.post(`${config.websockets.url}/events/${clientId}/send`, {
      data,
    });
    console.log("Message sent to", clientId);
  } catch (err) {
    console.error(`Failed to send update to client ${clientId}:`, err);
  }
};

const authMiddleware = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const authKey = req.header("Authorization");
  if (!authKey || !config.auth.apiKeys.includes(authKey)) {
    return res.status(401).send({ error: "Unauthorized", reason: "no auth" });
  }
  next();
};

app.post(
  "/api/analyze",
  authMiddleware,
  upload.single("file"),
  async (req: express.Request, res: express.Response) => {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }
    const { clientId } = req.query;
    if (!clientId) {
      return res.status(400).json({ error: "Missing client ID" });
    }
    req.setTimeout(1 * 60 * 1000, () => {
      res.status(408).json({ error: "Request timed out" });
    });

    try {
      const file = req.file;
      const eventHandler = sendUpdate(clientId as string);
      const detector = new BookDetectorService(eventHandler);
      console.log("Starting image processing...");
      const result = await detector.detectBook(file.buffer);
      console.log("finished image processing...");
      const event = {
        type: result.text ? "completed" : "error",
        data: result,
      };
      await eventHandler({
        type: result.text ? "completed" : "error",
        data: result,
      });
      writeFileSync("result.json", JSON.stringify(event));
      res.status(200).json(event);
    } catch (error) {
      res.status(500).json({
        error:
          error instanceof Error ? error.message : "Failed to process image",
      });
    }
  }
);

app.listen(PORT, () => {
  console.log(
    `Processor service running on port ${PORT} ${JSON.stringify(config)}`
  );
});
