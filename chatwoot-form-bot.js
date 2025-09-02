/*
 * This is a serverless function that acts as a simple bot for Chatwoot.
 * It listens to webhook events from Chatwoot and responds with interactive messages.
 *
 * How it works:
 * 1. A user starts a new chat on your Wix site.
 * 2. Chatwoot sends a 'conversation_created' event to this function's URL. This is the key trigger.
 * 3. This function catches the event and sends a "card" message with two buttons: "Make a Bid" and "Check Sales".
 * 4. The user clicks one of the buttons, which sends a message back.
 * 5. Chatwoot sends a 'message_created' event to this function.
 * 6. This function checks the message content and sends the appropriate form back to the user.
 * 7. The user fills out the form, and the data is submitted directly into the Chatwoot conversation.
 */

// We are using the 'http' module to create a simple server.
import { createServer } from "http";

// --- CONFIGURATION ---
// IMPORTANT: Use environment variables for your credentials for security.
const API_ACCESS_TOKEN =
  process.env.CHATWOOT_API_ACCESS_TOKEN || "NyCuYRvkVJHHoGEhM7pXM7mu";
const ACCOUNT_ID = process.env.CHATWOOT_ACCOUNT_ID || "133681";
const BASE_URL = process.env.CHATWOOT_BASE_URL || "https://app.chatwoot.com";

/**
 * A helper function to send messages to the Chatwoot API.
 * @param {number} conversationId - The ID of the conversation to send the message to.
 * @param {object} messagePayload - The JSON payload for the message.
 */
async function postMessage(conversationId, messagePayload) {
  const apiUrl = `${BASE_URL}/api/v1/accounts/${ACCOUNT_ID}/conversations/${conversationId}/messages`;

  try {
    console.log(
      `Sending message to conversation ${conversationId}:`,
      JSON.stringify(messagePayload, null, 2)
    );

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_ACCESS_TOKEN}`, // Fixed: Use Authorization header
      },
      body: JSON.stringify(messagePayload),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error(
        `API Error (${response.status} ${response.statusText}):`,
        responseData
      );
      return false;
    } else {
      console.log("Message sent successfully:", responseData);
      return true;
    }
  } catch (error) {
    console.error("Failed to make API request:", error);
    return false;
  }
}

/**
 * Sends the initial choice buttons with "Make a Bid" and "Check Sales" options.
 * @param {number} conversationId - The ID of the conversation.
 */
async function sendInitialChoices(conversationId) {
  // Try input_select format first (more reliable)
  const payload = {
    content: "Welcome! How can we help you today?",
    private: false, // This MUST be false to be visible to the user.
    content_type: "input_select",
    content_attributes: {
      items: [
        { title: "Make a Bid", value: "ACTION_BID" },
        { title: "Check Sales", value: "ACTION_SALES" },
      ],
    },
  };

  const success = await postMessage(conversationId, payload);

  // If input_select fails, try card format as fallback
  if (!success) {
    console.log("input_select failed, trying card format...");
    const cardPayload = {
      content: "Welcome! How can we help you today?",
      private: false,
      content_type: "card",
      content_attributes: {
        items: [
          {
            text: "Please select an option below:",
            actions: [
              { type: "post_back", text: "Make a Bid", payload: "ACTION_BID" },
              {
                type: "post_back",
                text: "Check Sales",
                payload: "ACTION_SALES",
              },
            ],
          },
        ],
      },
    };
    await postMessage(conversationId, cardPayload);
  }
}

/**
 * Sends the form for making a bid.
 * @param {number} conversationId - The ID of the conversation.
 */
async function sendBidForm(conversationId) {
  const payload = {
    content: "Please fill out the bid form below:",
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
  await postMessage(conversationId, payload);
}

/**
 * Sends the form for checking sales.
 * @param {number} conversationId - The ID of the conversation.
 */
async function sendSalesForm(conversationId) {
  const payload = {
    content: "Please fill out the sales inquiry form below:",
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
  await postMessage(conversationId, payload);
}

/**
 * The main handler for incoming webhook requests.
 */
const requestListener = function (req, res) {
  console.log(`Received ${req.method} request to ${req.url}`);

  if (req.method !== "POST") {
    console.log("Method not allowed:", req.method);
    res.writeHead(405, { "Content-Type": "text/plain" });
    res.end("Method Not Allowed");
    return;
  }

  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });

  req.on("end", async () => {
    try {
      console.log("Raw webhook body:", body);

      if (!body) {
        console.log("Empty body received");
        res.writeHead(200);
        res.end("OK - Empty body");
        return;
      }

      const eventData = JSON.parse(body);
      console.log("Parsed webhook event:", JSON.stringify(eventData, null, 2));

      const conversationId = eventData.conversation?.id;
      const eventType = eventData.event;
      const messageType = eventData.message_type;

      console.log(
        `Event: ${eventType}, Message Type: ${messageType}, Conversation ID: ${conversationId}`
      );

      if (!conversationId) {
        console.log("No conversation ID found in event");
        res.writeHead(200);
        res.end("OK - No conversation ID");
        return;
      }

      // Event: A new chat is started by a user. This is the most reliable trigger.
      if (eventType === "conversation_created") {
        console.log(
          `Processing conversation_created for conversation: ${conversationId}`
        );
        await sendInitialChoices(conversationId);
      }

      // Event: A new message is sent by the user (i.e., they clicked a button or sent a message).
      if (eventType === "message_created" && messageType === "incoming") {
        console.log("Processing incoming message...");
        console.log("Message content:", eventData.content);
        console.log(
          "Content attributes:",
          JSON.stringify(eventData.content_attributes, null, 2)
        );

        // Check for button payload from input_select
        const submittedValues = eventData.content_attributes?.submitted_values;
        let actionPayload = null;

        if (submittedValues && submittedValues.length > 0) {
          actionPayload = submittedValues[0].value;
          console.log("Found submitted value:", actionPayload);
        }

        // Check for button payload from card actions
        if (!actionPayload && eventData.content_attributes?.payload) {
          actionPayload = eventData.content_attributes.payload;
          console.log("Found payload:", actionPayload);
        }

        // Check direct message content as fallback
        const content = eventData.content;

        console.log(`Action Payload: ${actionPayload}, Content: ${content}`);

        // Handle bid actions
        if (
          actionPayload === "ACTION_BID" ||
          content === "Make a Bid" ||
          content?.toLowerCase().includes("bid")
        ) {
          console.log(`Sending bid form to conversation: ${conversationId}`);
          await sendBidForm(conversationId);
        }
        // Handle sales actions
        else if (
          actionPayload === "ACTION_SALES" ||
          content === "Check Sales" ||
          content?.toLowerCase().includes("sales")
        ) {
          console.log(`Sending sales form to conversation: ${conversationId}`);
          await sendSalesForm(conversationId);
        }
        // Handle form submissions
        else if (eventData.content_type === "form" && submittedValues) {
          console.log("Form submission received:", submittedValues);
          // You can process form submissions here if needed
          const confirmationPayload = {
            content:
              "Thank you! Your form has been submitted successfully. Our team will get back to you soon.",
            private: false,
          };
          await postMessage(conversationId, confirmationPayload);
        }
      }

      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("OK");
    } catch (e) {
      console.error("Error processing webhook:", e);
      console.error("Raw body that caused error:", body);
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end("Bad Request");
    }
  });
};

// Start the server.
const server = createServer(requestListener);
const port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log(`Chatwoot webhook server is listening on port ${port}`);
  console.log(
    `Make sure to configure your Chatwoot webhook URL to point to this server`
  );
  console.log(
    `Configuration: Account ID: ${ACCOUNT_ID}, Base URL: ${BASE_URL}`
  );
});

// Handle server errors
server.on("error", (error) => {
  console.error("Server error:", error);
});

// Export the server instance for serverless environments like Vercel
export default server;
