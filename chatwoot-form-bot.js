/*
 * Minimal Chatwoot bot backend for Wix integration
 * Works with ngrok or serverless platforms
 */

import { createServer } from "http";

// --- CONFIGURATION ---
const API_ACCESS_TOKEN =
  process.env.CHATWOOT_API_ACCESS_TOKEN || "NyCuYRvkVJHHoGEhM7pXM7mu";
const ACCOUNT_ID = process.env.CHATWOOT_ACCOUNT_ID || "133681";
const BASE_URL = process.env.CHATWOOT_BASE_URL || "https://app.chatwoot.com";

/**
 * Helper to send messages via Chatwoot API
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
 * Initial choice card
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
 * Bid form
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
 * Sales inquiry form
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
  req.on("data", (chunk) => (body += chunk.toString()));

  req.on("end", () => {
    try {
      const eventData = JSON.parse(body);

      // DEBUG: log full payload
      console.log("Received webhook:", JSON.stringify(eventData, null, 2));

      // Determine conversation ID (works for both conversation_created and message_created)
      const conversationId =
        eventData.conversation?.id ||
        eventData.data?.id ||
        eventData.message?.conversation_id ||
        eventData.data?.conversation_id;

      if (!conversationId) {
        res.writeHead(200);
        res.end("OK - No conversation ID");
        return;
      }

      // New conversation
      if (eventData.event === "conversation_created") {
        console.log(`New conversation created: ${conversationId}`);
        sendInitialChoices(conversationId);
      }

      // New incoming message from user
      if (
        eventData.event === "message_created" &&
        eventData.message?.message_type === "incoming" &&
        eventData.message?.content_type === "text"
      ) {
        const userInput = eventData.message.content;

        if (
          userInput === "ACTION_BID" ||
          userInput.toLowerCase() === "make a bid"
        ) {
          console.log(`Sending bid form to conversation: ${conversationId}`);
          sendBidForm(conversationId);
        } else if (
          userInput === "ACTION_SALES" ||
          userInput.toLowerCase() === "check sales"
        ) {
          console.log(`Sending sales form to conversation: ${conversationId}`);
          sendSalesForm(conversationId);
        } else {
          console.log(`Received user message: "${userInput}"`);
        }
      }

      res.writeHead(200);
      res.end("OK");
    } catch (e) {
      console.error("Error processing webhook:", e);
      res.writeHead(400);
      res.end("Bad Request");
    }
  });
};

// Start server (ngrok / serverless friendly)
const server = createServer(requestListener);
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

export default server;
