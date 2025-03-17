import config from "./config";

import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import multer from "multer";
import { writeFileSync } from "./lib/file";
import { BookDetectorService } from "./services/book-detector.service";
import { BookDetectionEvent } from "./dtos/book-detection.dto";

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(
  "/api/*",
  rateLimit({
    windowMs: 60 * 1000, // 1 minutes
    max: 100, // limit each IP to 100 requests per windowMs
  })
);
app.use(express.json());
app.use(
  cors({
    origin: process.env.NODE_ENV === "production" ? config.web.url : "*",
    credentials: true,
  })
);

const PORT = process.env.PORT || 3002;

// Store active SSE clients
const clients = new Set<{ id: string; send: (data: string) => void }>();

// SSE endpoint
app.get("/api/events", (req, res) => {
  const clientId = Date.now().toString();

  // Set headers for SSE
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);

  const client = {
    id: clientId,
    send: (data: string) => res.write(`data: ${data}\n\n`),
  };

  clients.add(client);
  console.log(`Client ${clientId} connected`);

  // Remove client on connection close
  req.on("close", () => {
    clients.delete(client);
    console.log(`Client ${clientId} disconnected`);
  });
});

// Helper function to send updates to all clients
const sendUpdate = (event: BookDetectionEvent) => {
  const data = JSON.stringify(event);
  clients.forEach((client) => client.send(data));
};

app.use("/api/analyze", (req, res, next) => {
  const authKey = req.header("Authorization");
  if (!authKey || !config.auth.apiKeys.includes(authKey)) {
    return res.status(401).send({ error: "Unauthorized" });
  }
  next();
});

app.post(
  "/api/analyze",
  upload.single("file"),
  async (req: express.Request, res: express.Response) => {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    try {
      const detector = new BookDetectorService(sendUpdate);
      const result = await detector.detectBook(req.file.buffer);
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
