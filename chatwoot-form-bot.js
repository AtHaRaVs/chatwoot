import { createServer } from "http";

// --- CONFIGURATION ---
const API_ACCESS_TOKEN =
  process.env.CHATWOOT_API_ACCESS_TOKEN || "NyCuYRvkVJHHoGEhM7pXM7mu";
const ACCOUNT_ID = process.env.CHATWOOT_ACCOUNT_ID || "133681";
const BASE_URL = process.env.CHATWOOT_BASE_URL || "https://app.chatwoot.com";

// --- HELPER: Send message to Chatwoot ---
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
      console.error(`[Chatwoot API ERROR]`, response.statusText, errorData);
    } else {
      console.log(
        `[Chatwoot API] Message sent successfully to conversation ${conversationId}`
      );
    }
  } catch (error) {
    console.error(`[Chatwoot API] Failed request:`, error);
  }
}

// --- INITIAL CHOICE CARD ---
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

// --- BID FORM ---
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

// --- SALES FORM ---
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

// --- SERVER ---
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

      console.log("[Webhook Received]");
      console.log("Event type:", eventData.event);
      console.log("Conversation ID:", eventData.conversation?.id);
      console.log("Full payload:", JSON.stringify(eventData, null, 2));

      const conversationId = eventData.conversation?.id;
      if (!conversationId) {
        res.writeHead(200);
        res.end("OK - No conversation ID");
        return;
      }

      // --- Determine action ---
      let content =
        eventData.content_attributes?.submitted_values?.[0]?.value ||
        eventData.content;

      content = content?.trim();

      // If first message (or fallback), send initial choices
      if (
        eventData.event === "conversation_created" || // if Chatwoot sends it
        (eventData.event === "message_created" &&
          eventData.message_type === "incoming" &&
          !eventData.content_attributes) // user typed first message
      ) {
        console.log("[ACTION] Sending initial choices card.");
        sendInitialChoices(conversationId);
      } else if (content === "ACTION_BID" || content === "Make a Bid") {
        console.log("[ACTION] Sending bid form.");
        sendBidForm(conversationId);
      } else if (content === "ACTION_SALES" || content === "Check Sales") {
        console.log("[ACTION] Sending sales form.");
        sendSalesForm(conversationId);
      } else {
        console.log(
          "[ACTION] Unrecognized message, sending initial choices again."
        );
        sendInitialChoices(conversationId);
      }

      res.writeHead(200);
      res.end("OK");
    } catch (e) {
      console.error("[Webhook Error] Parsing or processing failed:", e);
      res.writeHead(400);
      res.end("Bad Request");
    }
  });
};

const server = createServer(requestListener);
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

export default server;
