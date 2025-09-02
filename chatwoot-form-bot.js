import { createServer } from "http";

const server = createServer((req, res) => {
  console.log("=== INCOMING REQUEST ===");
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  console.log("Headers:", req.headers);

  let body = "";
  req.on("data", (chunk) => (body += chunk));

  req.on("end", () => {
    console.log("Body:", body);
    console.log("=== END REQUEST ===");

    res.writeHead(200);
    res.end("OK");
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log("Waiting for webhooks...");
});

export default server;
