import config from "./config";
import express from "express";

const app = express();

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

const PORT = process.env.PORT || 3003;

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

app.post(
  "/api/events/:id/send",
  (req: express.Request, res: express.Response) => {
    const { id: clientId } = req.params;
    const { data } = req.body;
    if (!clientId || !data)
      return res.status(400).send({ error: "Invalid client ID or data" });
    const client = clients.get(clientId);
    if (!client) return res.status(404).send({ error: "Client not found" });
    client.send(data);
    res.status(200).send({ success: true });
  }
);

app.listen(PORT, () => {
  console.log(
    `Websockets service running on port ${PORT} ${JSON.stringify(config)}`
  );
});
