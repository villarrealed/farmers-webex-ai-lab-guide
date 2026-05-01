import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { z } from "zod";

// ============================================================
// STATIC DATA — Hardcoded policyholders for demo purposes
// ============================================================

const POLICYHOLDERS = [
  {
    policy_number: "FRM-101",
    first_name: "Sarah",
    last_name: "Smith",
    date_of_birth: "05/05/1990",
    phone_number: "555-0101",
    email: "sarah.smith@email.com",
    address: "123 Main Street, Phoenix, AZ 85001",
    vehicles: [
      { year: 2022, make: "Toyota", model: "RAV4", primary_use: "commute" }
    ]
  },
  {
    policy_number: "FRM-284719",
    first_name: "Sarah",
    last_name: "Martinez",
    date_of_birth: "03/15/1988",
    phone_number: "555-0147",
    email: "sarah.martinez@email.com",
    address: "742 Oak Street, Austin, TX 78701",
    vehicles: [
      { year: 2021, make: "Toyota", model: "Camry", primary_use: "commute" }
    ]
  },
  {
    policy_number: "FRM-551203",
    first_name: "James",
    last_name: "Thompson",
    date_of_birth: "07/22/1975",
    phone_number: "555-0298",
    email: "j.thompson@email.com",
    address: "1205 Maple Drive, Denver, CO 80202",
    vehicles: [
      { year: 2022, make: "Ford", model: "F-150", primary_use: "business" },
      { year: 2020, make: "Honda", model: "Civic", primary_use: "commute" }
    ]
  },
  {
    policy_number: "FRM-887341",
    first_name: "Linda",
    last_name: "Chen",
    date_of_birth: "11/03/1992",
    phone_number: "555-0463",
    email: "linda.chen@email.com",
    address: "88 Pine Avenue, Seattle, WA 98101",
    vehicles: [
      { year: 2023, make: "Tesla", model: "Model 3", primary_use: "commute" }
    ]
  }
];

// ============================================================
// MCP SERVER SETUP
// ============================================================

const server = new McpServer({
  name: "Farmers Insurance Tools",
  version: "1.0.0"
});

// ============================================================
// TOOL 1: verify_policyholder_identity
// ============================================================

server.tool(
  "verify_policyholder_identity",
  "Verifies a policyholder's identity by matching their last name and date of birth against policy records. Optionally uses policy number or phone number for additional verification. Returns policyholder details and current vehicles on policy if verified.",
  {
    last_name: z.string().describe("Policyholder's last name (required)"),
    date_of_birth: z.string().describe("Policyholder's date of birth in MM/DD/YYYY format (required)"),
    policy_number: z.string().optional().describe("Policy number (optional, e.g., FRM-284719)"),
    phone_number: z.string().optional().describe("Phone number on file (optional, e.g., 555-0147)")
  },
  async ({ last_name, date_of_birth, policy_number, phone_number }) => {
    // Find matching policyholder
    const match = POLICYHOLDERS.find(p => {
      const nameMatch = p.last_name.toLowerCase() === last_name.toLowerCase();
      const dobMatch = p.date_of_birth === date_of_birth;

      if (!nameMatch || !dobMatch) return false;

      // Additional verification if provided
      if (policy_number && p.policy_number !== policy_number) return false;
      if (phone_number && p.phone_number !== phone_number) return false;

      return true;
    });

    if (match) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            verified: true,
            policy_number: match.policy_number,
            first_name: match.first_name,
            last_name: match.last_name,
            vehicles_on_policy: match.vehicles.map(v => ({
              year: v.year,
              make: v.make,
              model: v.model,
              primary_use: v.primary_use
            }))
          }, null, 2)
        }]
      };
    } else {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            verified: false,
            message: "Unable to verify identity. Please check the information provided and try again. If you continue to have issues, please contact your local Farmers agent during business hours."
          }, null, 2)
        }]
      };
    }
  }
);

// ============================================================
// TOOL 2: add_vehicle_to_policy
// ============================================================

server.tool(
  "add_vehicle_to_policy",
  "Adds a new vehicle to an existing Farmers Insurance policy. Requires the policy number, vehicle year, make, model, and primary use. Returns a confirmation number and estimated monthly premium adjustment.",
  {
    policy_number: z.string().describe("The policy number to add the vehicle to (required, e.g., FRM-284719)"),
    vehicle_year: z.number().int().describe("Model year of the vehicle (required, e.g., 2024)"),
    vehicle_make: z.string().describe("Vehicle manufacturer (required, e.g., Honda)"),
    vehicle_model: z.string().describe("Vehicle model name (required, e.g., CR-V)"),
    primary_use: z.enum(["commute", "pleasure", "business"]).describe("Primary use of the vehicle (required: commute, pleasure, or business)")
  },
  async ({ policy_number, vehicle_year, vehicle_make, vehicle_model, primary_use }) => {
    // Verify policy exists
    const policyholder = POLICYHOLDERS.find(p => p.policy_number === policy_number);

    if (!policyholder) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            message: `Policy number ${policy_number} not found. Please verify the policy number and try again.`
          }, null, 2)
        }]
      };
    }

    // Generate confirmation number
    const confirmationNumber = "VH-" + Math.floor(100000 + Math.random() * 900000);

    // Calculate a realistic-looking premium based on use type
    const premiumMap = { commute: 47.50, pleasure: 38.25, business: 62.00 };
    const premium = premiumMap[primary_use] || 47.50;

    // Today's date for effective date
    const today = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: true,
          confirmation_number: confirmationNumber,
          vehicle: {
            year: vehicle_year,
            make: vehicle_make,
            model: vehicle_model,
            primary_use: primary_use
          },
          estimated_monthly_premium: `$${premium.toFixed(2)}`,
          effective_date: today,
          message: `${vehicle_year} ${vehicle_make} ${vehicle_model} has been successfully added to policy ${policy_number}. Coverage is effective immediately.`
        }, null, 2)
        }]
    };
  }
);

// ============================================================
// TOOL 3: deliver_proof_of_insurance
// ============================================================

server.tool(
  "deliver_proof_of_insurance",
  "Delivers proof of insurance (insurance ID card) to the policyholder via their preferred method: SMS text message, email, or through the Farmers mobile app. Returns delivery confirmation details.",
  {
    policy_number: z.string().describe("The policy number for the proof of insurance (required, e.g., FRM-284719)"),
    delivery_method: z.enum(["sms", "email", "app"]).describe("How to deliver the proof of insurance (required: sms, email, or app)"),
    phone_number: z.string().optional().describe("Phone number to send SMS to (optional, used when delivery_method is sms, e.g., +16025551234)")
  },
  async ({ policy_number, delivery_method, phone_number }) => {
    // Find policyholder for personalized response
    const policyholder = POLICYHOLDERS.find(p => p.policy_number === policy_number);

    if (!policyholder) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            message: `Policy number ${policy_number} not found. Please verify the policy number and try again.`
          }, null, 2)
        }]
      };
    }

    // Build delivery confirmation based on method
    let deliveryConfirmation;
    let deliveryDetails;

    switch (delivery_method) {
      case "sms":
        // Determine the phone number to use and normalize to +1XXXXXXXXXX format
        let smsPhone = phone_number || policyholder.phone_number;
        // Strip all non-digit characters
        const digits = smsPhone.replace(/\D/g, "");
        // Ensure +1 prefix with 10 digits
        if (digits.length === 10) {
          smsPhone = "+1" + digits;
        } else if (digits.length === 11 && digits.startsWith("1")) {
          smsPhone = "+" + digits;
        } else {
          smsPhone = "+" + digits;
        }
        const lastFour = smsPhone.slice(-4);

        // Call Webex Connect webhook to send real SMS
        try {
          const webhookResponse = await fetch("https://hooks.us.webexconnect.io/events/67H8O1CZV1", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              phone_number: smsPhone,
              policy_number: policy_number,
              customer_name: `${policyholder.first_name} ${policyholder.last_name}`
            })
          });
          const webhookResult = await webhookResponse.json();
          deliveryConfirmation = `SMS sent to phone number ending in ***${lastFour.slice(-2)}`;
          deliveryDetails = "A text message with your proof of insurance has been sent. Please check your phone.";
        } catch (error) {
          deliveryConfirmation = `SMS queued for phone number ending in ***${lastFour.slice(-2)}`;
          deliveryDetails = "Your proof of insurance text message is being processed. You should receive it shortly.";
        }
        break;
      case "email":
        const maskedEmail = policyholder.email.charAt(0) + "***@" + policyholder.email.split("@")[1];
        deliveryConfirmation = `Sent to ${maskedEmail}`;
        deliveryDetails = "You will receive an email with your insurance ID card attached as a PDF.";
        break;
      case "app":
        deliveryConfirmation = "Available in Farmers mobile app under 'My Documents'";
        deliveryDetails = "Open the Farmers app and navigate to My Documents > Insurance Cards to view your updated proof of insurance.";
        break;
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          success: true,
          delivery_method: delivery_method,
          delivery_confirmation: deliveryConfirmation,
          delivery_details: deliveryDetails,
          message: `Proof of insurance for policy ${policy_number} has been sent via ${delivery_method}. ${deliveryDetails}`
        }, null, 2)
      }]
    };
  }
);

// ============================================================
// EXPRESS APP + STREAMABLE HTTP TRANSPORT
// ============================================================

const app = express();
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", server: "Farmers Insurance MCP Server", tools: 3 });
});

// Root endpoint for basic info
app.get("/", (req, res) => {
  res.json({
    name: "Farmers Insurance MCP Server",
    description: "MCP server providing insurance tools for the Webex AI Agent Lab",
    version: "1.0.0",
    tools: [
      "verify_policyholder_identity",
      "add_vehicle_to_policy",
      "deliver_proof_of_insurance"
    ],
    health: "/health",
    mcp_endpoint: "/mcp"
  });
});

// MCP Streamable HTTP endpoint
app.post("/mcp", async (req, res) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined // Stateless mode for simplicity
  });

  res.on("close", () => {
    transport.close();
  });

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

// Handle GET and DELETE for MCP protocol (session management)
app.get("/mcp", async (req, res) => {
  res.status(405).json({ error: "Method not allowed. Use POST for MCP requests." });
});

app.delete("/mcp", async (req, res) => {
  res.status(405).json({ error: "Session management not supported in stateless mode." });
});

// ============================================================
// START SERVER
// ============================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚜 Farmers Insurance MCP Server running on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log(`   Tools available: 3`);
});
