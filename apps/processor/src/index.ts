import config from "./config";

import express from "express";
import rateLimit from "express-rate-limit";
import multer from "multer";
import { writeFileSync } from "./lib/file";
import { BookDetectorService } from "./services/book-detector.service";
import { BookDetectionEvent } from "./dtos/book-detection.dto";

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.set("trust proxy", 1); // Trust the first proxy hop
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

// Store active SSE clients
const clients = new Map<string, { send: (data: string) => void }>();

// SSE endpoint - no auth required
app.get("/api/events/:id", (req: express.Request, res: express.Response) => {
  const { id: clientId } = req.params;
  if (!clientId) return res.status(400).send({ error: "Invalid client ID" });

  // Set headers for SSE
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);

  const client = { send: (data: string) => res.write(`data: ${data}\n\n`) };

  clients.set(clientId, client);
  console.log(`Client ${clientId} connected`);

  const timeout = 5 * 60 * 1000; // 5 minutes in milliseconds
  req.setTimeout(timeout, () => {
    res.write("data: Connection timed out\n\n");
    res.end(); // Close the connection
    clients.delete(clientId);
  });

  // Remove client on connection close
  req.on("close", () => {
    clients.delete(clientId);
    console.log(`Client ${clientId} disconnected`);
  });
});

// app.use(
//   "/api/*",
//   rateLimit({
//     windowMs: 60 * 1000, // 1 minutes
//     max: 100, // limit each IP to 100 requests per windowMs
//   })
// );

// Helper function to send updates to all clients
const sendUpdate = (clientId: string) => (event: BookDetectionEvent) => {
  const data = JSON.stringify(event);
  const client = clients.get(clientId);
  if (client) {
    console.log(`Sending event to client ${clientId}:`, event);
    client.send(data);
    console.log(`Event sent to client ${clientId}`);
  } else {
    console.error(`Client ${clientId} not found`);
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
      eventHandler({
        type: result.text ? "completed" : "error",
        data: result,
      });
      writeFileSync("result.json", JSON.stringify(result, null, 2));
      res.status(200).json({ success: true });
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
