import { createServer } from "http";

const server = createServer((req, res) => {
  // Log EVERYTHING
  console.log("🚨 REQUEST RECEIVED!");
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  console.log("Time:", new Date().toISOString());

  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
    console.log("📦 Data chunk received");
  });

  req.on("end", () => {
    console.log("📝 Complete body:", body);
    console.log("🔥 Request processed!");

    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("SUCCESS - Server received the request!");
  });
});

const port = 3000;
server.listen(port, () => {
  console.log("🟢 Server is RUNNING on port", port);
  console.log("🔗 Make sure ngrok points to this port");
  console.log("⏳ Waiting for webhooks...");
});
