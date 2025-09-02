import { createServer } from "http";

// Configuration - Replace with your actual token
const API_ACCESS_TOKEN = "NyCuYRvkVJHHoGEhM7pXM7mu";
const ACCOUNT_ID = "133681";
const BASE_URL = "https://app.chatwoot.com";

// Helper function to send messages to Chatwoot
async function sendMessage(conversationId, messagePayload) {
  const url = `${BASE_URL}/api/v1/accounts/${ACCOUNT_ID}/conversations/${conversationId}/messages`;

  try {
    console.log(
      `📤 Sending message to conversation ${conversationId}:`,
      JSON.stringify(messagePayload, null, 2)
    );

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        api_access_token: API_ACCESS_TOKEN,
      },
      body: JSON.stringify(messagePayload),
    });

    console.log("✅ API Response Status:", response.status);
    const result = await response.json();
    console.log("✅ API Response:", result);

    return response.ok;
  } catch (error) {
    console.error("❌ Error sending message:", error);
    return false;
  }
}

// Send initial choice buttons
async function sendInitialButtons(conversationId) {
  const payload = {
    content: "Welcome! How can we help you today?",
    private: false,
    content_type: "input_select",
    content_attributes: {
      items: [
        { title: "Make a Bid Request", value: "ACTION_BID" },
        { title: "Sales Enquiry", value: "ACTION_SALES" },
      ],
    },
  };

  const success = await sendMessage(conversationId, payload);

  // Fallback to card format if input_select doesn't work
  if (!success) {
    console.log("📋 Trying card format as fallback...");
    const cardPayload = {
      content: "Welcome! How can we help you today?",
      private: false,
      content_type: "card",
      content_attributes: {
        items: [
          {
            text: "Please select an option:",
            actions: [
              {
                type: "post_back",
                text: "Make a Bid Request",
                payload: "ACTION_BID",
              },
              {
                type: "post_back",
                text: "Sales Enquiry",
                payload: "ACTION_SALES",
              },
            ],
          },
        ],
      },
    };
    await sendMessage(conversationId, cardPayload);
  }
}

// Send bid request form
async function sendBidForm(conversationId) {
  const payload = {
    content: "Please fill out your bid request details:",
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
          placeholder: "Enter your email address",
          required: true,
        },
        {
          name: "phone",
          label: "Phone Number",
          type: "text",
          placeholder: "Enter your phone number",
          required: true,
        },
        {
          name: "item_details",
          label: "Item Details",
          type: "textarea",
          placeholder:
            "Describe the item you want to bid on (name, model, condition, etc.)",
          required: true,
        },
        {
          name: "bid_amount",
          label: "Bid Amount ($)",
          type: "text",
          placeholder: "Enter your bid amount in USD",
          required: true,
        },
        {
          name: "additional_notes",
          label: "Additional Notes",
          type: "textarea",
          placeholder: "Any additional information or special requirements",
          required: false,
        },
        {
          name: "submit",
          type: "submit",
          text: "Submit Bid Request",
        },
      ],
    },
  };
  await sendMessage(conversationId, payload);
}

// Send sales enquiry form
async function sendSalesForm(conversationId) {
  const payload = {
    content: "Please fill out your sales enquiry details:",
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
          placeholder: "Enter your email address",
          required: true,
        },
        {
          name: "phone",
          label: "Phone Number",
          type: "text",
          placeholder: "Enter your phone number",
          required: true,
        },
        {
          name: "inquiry_type",
          label: "Inquiry Type",
          type: "select",
          placeholder: "Select inquiry type",
          options: [
            { label: "Product Information", value: "product_info" },
            { label: "Pricing", value: "pricing" },
            { label: "Availability", value: "availability" },
            { label: "Custom Order", value: "custom_order" },
            { label: "Other", value: "other" },
          ],
          required: true,
        },
        {
          name: "product_interest",
          label: "Product of Interest",
          type: "text",
          placeholder: "What product are you interested in?",
          required: true,
        },
        {
          name: "inquiry_details",
          label: "Detailed Inquiry",
          type: "textarea",
          placeholder: "Please provide details about your inquiry...",
          required: true,
        },
        {
          name: "submit",
          type: "submit",
          text: "Send Sales Enquiry",
        },
      ],
    },
  };
  await sendMessage(conversationId, payload);
}

// Process form submission
async function processFormSubmission(
  conversationId,
  submittedValues,
  formType
) {
  console.log(`📋 Processing ${formType} form submission:`, submittedValues);

  // Create a summary of submitted data
  let summary = `✅ **${
    formType === "bid" ? "Bid Request" : "Sales Enquiry"
  } Received**\n\n`;

  submittedValues.forEach((field) => {
    if (field.name !== "submit") {
      summary += `**${field.label}:** ${field.value}\n`;
    }
  });

  summary += `\n📞 Our team will contact you within 24 hours!`;

  const confirmationPayload = {
    content: summary,
    private: false,
  };

  await sendMessage(conversationId, confirmationPayload);
}

// Main server
const server = createServer((req, res) => {
  console.log("🚨 REQUEST RECEIVED!");
  console.log("Method:", req.method, "Time:", new Date().toISOString());

  if (req.method === "GET") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(
      "<h1>✅ Chatwoot Interactive Bot Active!</h1><p>Ready for bids and sales enquiries.</p>"
    );
    return;
  }

  if (req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));

    req.on("end", async () => {
      try {
        const data = JSON.parse(body);
        console.log("🔥 Event Type:", data.event);

        // Handle conversation creation - show initial buttons
        if (data.event === "conversation_created" && data.id) {
          console.log("🎉 New conversation! Showing option buttons...");
          await sendInitialButtons(data.id);
        }

        // Handle incoming messages - check for button clicks and form submissions
        if (
          data.event === "message_created" &&
          data.message_type === "incoming"
        ) {
          const conversationId = data.conversation?.id;

          if (!conversationId) {
            console.log("❌ No conversation ID found");
            res.writeHead(200);
            res.end("OK");
            return;
          }

          // Check for button selection
          const submittedValues = data.content_attributes?.submitted_values;

          if (submittedValues && submittedValues.length > 0) {
            const firstSubmission = submittedValues[0];
            console.log("📝 User selection/submission:", firstSubmission);

            // Handle button selections
            if (firstSubmission.value === "ACTION_BID") {
              console.log("🏷️ User selected: Make a Bid Request");
              await sendBidForm(conversationId);
            } else if (firstSubmission.value === "ACTION_SALES") {
              console.log("💼 User selected: Sales Enquiry");
              await sendSalesForm(conversationId);
            }
            // Handle form submissions
            else if (
              submittedValues.some((field) => field.name === "bid_amount")
            ) {
              console.log("📋 Processing bid form submission");
              await processFormSubmission(
                conversationId,
                submittedValues,
                "bid"
              );
            } else if (
              submittedValues.some((field) => field.name === "inquiry_details")
            ) {
              console.log("📋 Processing sales enquiry submission");
              await processFormSubmission(
                conversationId,
                submittedValues,
                "sales"
              );
            }
          }

          // Handle direct text messages as fallback
          const content = data.content?.toLowerCase();
          if (content && !submittedValues) {
            if (content.includes("bid") || content.includes("auction")) {
              console.log("🏷️ Text indicates bid interest");
              await sendBidForm(conversationId);
            } else if (
              content.includes("sales") ||
              content.includes("buy") ||
              content.includes("purchase")
            ) {
              console.log("💼 Text indicates sales interest");
              await sendSalesForm(conversationId);
            }
          }
        }
      } catch (e) {
        console.log("❌ Error processing webhook:", e.message);
      }

      res.writeHead(200);
      res.end("OK");
    });
    return;
  }

  res.writeHead(405);
  res.end("Method Not Allowed");
});

server.listen(3000, () => {
  console.log("🟢 Chatwoot Interactive Bot Server Running on port 3000");
  console.log("🎯 Features: Bid Requests & Sales Enquiries with Forms");
  console.log("⏳ Ready for conversations...");
});

export default server;
