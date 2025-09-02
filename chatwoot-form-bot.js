/*
 * This is a serverless function that acts as a simple bot for Chatwoot.
 * It listens to webhook events from Chatwoot and responds with interactive messages.
 *
 * How it works:
 * 1. A user starts a new chat on your Wix site.
 * 2. Chatwoot sends a 'conversation_created' event to this function's URL.
 * 3. This function catches the event and sends a "card" message with two buttons: "Make a Bid" and "Check Sales".
 * 4. The user clicks one of the buttons. This sends a message back to Chatwoot.
 * 5. Chatwoot sends a 'message_created' event to this function.
 * 6. This function checks the message content and sends the appropriate form back to the user in the chat window.
 * 7. The user fills out the form, and the data is submitted directly into the Chatwoot conversation for your agents to see.
 */

// We are using the 'http' module to create a simple server.
// For a real deployment on platforms like Vercel or Netlify, this structure works perfectly.
import { createServer } from "http";

// --- CONFIGURATION ---
// IMPORTANT: Replace these with your actual Chatwoot details.
// It's highly recommended to use environment variables for security.
const API_ACCESS_TOKEN =
  process.env.CHATWOOT_API_ACCESS_TOKEN || "rQSWbvgH2uQnWtWRa4YRi1eU";
const ACCOUNT_ID = process.env.CHATWOOT_ACCOUNT_ID || "133681";
const BASE_URL = process.env.CHATWOOT_BASE_URL || "https://app.chatwoot.com"; // Use https://www.chatwoot.com if you are on a self-hosted instance

/**
 * A helper function to send messages to the Chatwoot API.
 * @param {number} conversationId - The ID of the conversation to send the message to.
 * @param {object} messagePayload - The JSON payload for the message.
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
 * Sends the initial choice card with "Make a Bid" and "Check Sales" buttons.
 * @param {number} conversationId - The ID of the conversation.
 */
function sendInitialChoices(conversationId) {
  const payload = {
    content: "Welcome! How can we help you today?",
    private: true, // This makes the message visible only to the agent until a choice is made
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
 * Sends the form for making a bid.
 * @param {number} conversationId - The ID of the conversation.
 */
function sendBidForm(conversationId) {
  const payload = {
    private: true,
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
 * Sends the form for checking sales.
 * @param {number} conversationId - The ID of the conversation.
 */
function sendSalesForm(conversationId) {
  const payload = {
    private: true,
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
 * The main handler for incoming webhook requests.
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
      const conversationId = eventData.conversation?.id;

      if (!conversationId) {
        res.writeHead(200);
        res.end("OK - No conversation ID");
        return;
      }

      // Event: A new chat is started by a user
      if (eventData.event === "conversation_created") {
        console.log(`New conversation created: ${conversationId}`);
        sendInitialChoices(conversationId);
      }

      // Event: A new message is sent by the user
      if (
        eventData.event === "message_created" &&
        eventData.message_type === "incoming" &&
        eventData.content_type === "text"
      ) {
        // Check if the message content is the payload from our buttons
        if (
          eventData.content === "Make a Bid" &&
          eventData.content_attributes?.submitted_values?.[0]?.value ===
            "ACTION_BID"
        ) {
          console.log(`Sending bid form to conversation: ${conversationId}`);
          sendBidForm(conversationId);
        } else if (
          eventData.content === "Check Sales" &&
          eventData.content_attributes?.submitted_values?.[0]?.value ===
            "ACTION_SALES"
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

// Start the server. On a serverless platform, the platform manages this part.
const server = createServer(requestListener);
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

// Export the server instance for serverless environments like Vercel
export default server;
