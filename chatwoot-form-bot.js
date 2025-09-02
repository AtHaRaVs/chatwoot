import { createServer } from "http";

// Configuration
const API_ACCESS_TOKEN = "NyCuYRvkVJHHoGEhM7pXM7mu";
const ACCOUNT_ID = "133681";
const BASE_URL = "https://app.chatwoot.com";

// Simple function to send a message
async function sendMessage(conversationId, message) {
  const url = `${BASE_URL}/api/v1/accounts/${ACCOUNT_ID}/conversations/${conversationId}/messages`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        content: message,
        private: false,
      }),
    });

    console.log("API Response Status:", response.status);
    const result = await response.text();
    console.log("API Response:", result);
  } catch (error) {
    console.error("Error:", error);
  }
}

// Webhook handler
const server = createServer((req, res) => {
  if (req.method !== "POST") {
    res.writeHead(200);
    res.end("OK");
    return;
  }

  let body = "";
  req.on("data", (chunk) => (body += chunk));

  req.on("end", async () => {
    console.log("Received webhook:", body);

    try {
      const data = JSON.parse(body);
      console.log("Event:", data.event);
      console.log("Conversation ID:", data.conversation?.id);

      if (data.event === "conversation_created" && data.conversation?.id) {
        console.log("Sending hello message...");
        await sendMessage(data.conversation.id, "Hello! Welcome to our chat.");
      }
    } catch (error) {
      console.error("Parse error:", error);
    }

    res.writeHead(200);
    res.end("OK");
  });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

export default server;
