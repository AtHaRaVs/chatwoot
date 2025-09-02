import { createServer } from "http";

// --- CONFIGURATION ---
const API_ACCESS_TOKEN =
  process.env.CHATWOOT_API_ACCESS_TOKEN || "NyCuYRvkVJHHoGEhM7pXM7mu";
const ACCOUNT_ID = process.env.CHATWOOT_ACCOUNT_ID || "133681";
const BASE_URL = process.env.CHATWOOT_BASE_URL || "https://app.chatwoot.com";

/**
 * Send a message to Chatwoot
 */
async function postMessage(conversationId, messagePayload) {
  const apiUrl = `${BASE_URL}/api/v1/accounts/${ACCOUNT_ID}/conversations/${conversationId}/messages`;

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        api_access_token: API_ACCESS_TOKEN,
      },
      body: JSON.stringify(messagePayload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`Error sending message: ${response.statusText}`, errorData);
    } else {
      console.log("Message sent successfully.");
    }
  } catch (error) {
    console.error("Failed to make API request:", error);
  }
}

/**
 * Send the initial choice card
 */
function sendInitialChoices(conversationId) {
  const payload = {
    content: "Welcome! How can we help you today?",
    private: false,
    content_type: "card",
    content_attributes: {
      items: [
        {
          text: "Please select an option below:",
          actions: [
            { type: "post_back", text: "Make a Bid", payload: "ACTION_BID" },
            { type: "post_back", text: "Check Sales", payload: "ACTION_SALES" },
          ],
        },
      ],
    },
  };
  postMessage(conversationId, payload);
}

/**
 * Send bid form
 */
function sendBidForm(conversationId) {
  const payload = {
    private: false,
    content_type: "form",
    content_attributes: {
      items: [
        {
          name: "full_name",
          label: "Full Name",
          type: "text",
          placeholder: "Enter your full name",
          required: true,
        },
        {
          name: "email",
          label: "Email Address",
          type: "text",
          placeholder: "Enter your email",
          required: true,
        },
        {
          name: "item_name",
          label: "Item Name/Number",
          type: "text",
          placeholder: "e.g., 'Vintage Watch #123'",
          required: true,
        },
        {
          name: "bid_amount",
          label: "Bid Amount ($)",
          type: "text",
          placeholder: "Enter your bid amount",
          required: true,
        },
        { name: "submit", type: "submit", text: "Submit Bid" },
      ],
    },
  };
  postMessage(conversationId, payload);
}

/**
 * Send sales inquiry form
 */
function sendSalesForm(conversationId) {
  const payload = {
    private: false,
    content_type: "form",
    content_attributes: {
      items: [
        {
          name: "full_name",
          label: "Full Name",
          type: "text",
          placeholder: "Enter your full name",
          required: true,
        },
        {
          name: "email",
          label: "Email Address",
          type: "text",
          placeholder: "Enter your email",
          required: true,
        },
        {
          name: "inquiry_details",
          label: "Your Question",
          type: "textarea",
          placeholder: "What can we help you find?",
          required: true,
        },
        { name: "submit", type: "submit", text: "Send Inquiry" },
      ],
    },
  };
  postMessage(conversationId, payload);
}

/**
 * Main webhook handler
 */
const requestListener = function (req, res) {
  if (req.method !== "POST") {
    res.writeHead(405);
    res.end("Method Not Allowed");
    return;
  }

  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });

  req.on("end", () => {
    try {
      const eventData = JSON.parse(body);

      // Get conversation ID from message or conversation
      const conversationId =
        eventData.conversation?.id || eventData.message?.conversation?.id;
      if (!conversationId) {
        res.writeHead(200);
        res.end("OK - No conversation ID");
        return;
      }

      // Handle message_created events
      if (
        eventData.event === "message_created" &&
        eventData.message?.message_type === "incoming"
      ) {
        const conversation = eventData.conversation;
        const messages = conversation.messages || [];
        const userMessage = eventData.message.content;

        // If first user message, send initial choices card
        const botMessages = messages.filter(
          (m) =>
            m.sender_type === "User" ||
            m.sender_type === "Bot" ||
            m.sender?.type === "bot"
        );

        if (messages.length === 1 || botMessages.length === 0) {
          console.log(
            `First user message detected, sending initial choices...`
          );
          sendInitialChoices(conversationId);
        }

        // Handle button responses / commands
        if (
          userMessage === "ACTION_BID" ||
          userMessage.toLowerCase() === "make a bid"
        ) {
          console.log(`Sending bid form to conversation: ${conversationId}`);
          sendBidForm(conversationId);
        } else if (
          userMessage === "ACTION_SALES" ||
          userMessage.toLowerCase() === "check sales"
        ) {
          console.log(`Sending sales form to conversation: ${conversationId}`);
          sendSalesForm(conversationId);
        }
      }

      res.writeHead(200);
      res.end("OK");
    } catch (e) {
      console.error("Error parsing JSON or processing event:", e);
      res.writeHead(400);
      res.end("Bad Request");
    }
  });
};

// Start server
const server = createServer(requestListener);
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

export default server;
