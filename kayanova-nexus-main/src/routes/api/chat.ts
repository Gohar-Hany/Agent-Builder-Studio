import { createFileRoute } from "@tanstack/react-router";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { NoObjectGeneratedError, generateText, Output } from "ai";
import { z } from "zod";

type Body = {
  brand?: {
    name?: string;
    role?: string;
    dialect?: string;
    tone?: string;
    welcomeMessage?: string;
    promptRules?: string;
    guardrails?: { strictPrice?: boolean; orderCollector?: boolean; bookingMode?: boolean };
    contactInfo?: { phone?: string; address?: string; hours?: string };
    menuItems?: Array<{ name: string; price: number; category: string }>;
  };
  message?: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
};

const schema = z.object({
  response: z.string().optional(),
  reply: z.string().optional(),
  hasOrder: z.boolean().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  items: z.array(z.string()).optional(),
  numericTotal: z.number().optional(),
  orderType: z.string().optional(),
  deliveryAddress: z.string().optional(),
  intent: z.string().optional(),
});

type Extraction = z.infer<typeof schema>;

function normalize(out: Extraction) {
  return {
    response: out.response ?? out.reply ?? "",
    hasOrder: out.hasOrder ?? false,
    customerName: out.customerName ?? "",
    customerPhone: out.customerPhone ?? "",
    items: (out.items ?? []).map((i) => (typeof i === "string" ? i : JSON.stringify(i))),
    numericTotal: out.numericTotal ?? 0,
    orderType: out.orderType ?? "General",
    deliveryAddress: out.deliveryAddress ?? "",
    intent: out.intent ?? "",
  };
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as Body;
        const brand = body.brand ?? {};
        const message = (body.message ?? "").trim();
        if (!message) return new Response("Message required", { status: 400 });

        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const menu = (brand.menuItems ?? [])
          .map((i) => `- ${i.name} | ${i.category} | ${i.price} EGP`)
          .join("\n");

        const system = [
          `You are "${brand.role ?? "Customer Concierge"}" for the brand "${brand.name ?? "Brand"}".`,
          `Reply in ${brand.dialect ?? "Egyptian Arabic"} with a ${brand.tone ?? "Friendly"} tone. Keep replies short (max 3 sentences).`,
          brand.welcomeMessage ? `Brand greeting style: ${brand.welcomeMessage}` : "",
          menu
            ? `OFFICIAL CATALOG (only source of prices):\n${menu}`
            : "No catalog items configured.",
          brand.guardrails?.strictPrice
            ? "STRICT PRICE GUARDRAIL: never invent prices. If an item is not in the catalog, say it is unavailable."
            : "",
          brand.guardrails?.orderCollector
            ? "Always collect customer name, phone number, delivery address, and items before confirming."
            : "",
          brand.guardrails?.bookingMode
            ? "Collect appointment date, time, and preferred practitioner for bookings."
            : "",
          brand.contactInfo?.phone ? `Support phone: ${brand.contactInfo.phone}` : "",
          brand.contactInfo?.hours ? `Working hours: ${brand.contactInfo.hours}` : "",
          brand.contactInfo?.address ? `Branches: ${brand.contactInfo.address}` : "",
          brand.promptRules ? `Business rules: ${brand.promptRules}` : "",
          'Return JSON with a "response" field containing your customer-facing reply, plus structured order data extracted from the whole conversation. "items" MUST be an array of plain strings like "2x Spanish Latte" (never objects). Use empty strings, an empty array or 0 when unknown. numericTotal must be computed from catalog prices only. orderType is one of Delivery, Pickup, Medical Booking, General. hasOrder is true only when the customer requested at least one catalog item or a booking.',
        ]
          .filter(Boolean)
          .join("\n");

        const gateway = createOpenAICompatible({
          name: "lovable",
          baseURL: "https://ai.gateway.lovable.dev/v1",
          headers: { "Lovable-API-Key": key },
        });

        try {
          const { output } = await generateText({
            model: gateway("google/gemini-3.6-flash"),
            system,
            messages: [
              ...(body.history ?? []).slice(-12),
              { role: "user" as const, content: message },
            ],
            output: Output.object({ schema }),
          });
          return Response.json(normalize(output));
        } catch (err) {
          if (NoObjectGeneratedError.isInstance(err) && err.text) {
            try {
              const raw = err.text.replace(/^```(?:json)?|```$/g, "").trim();
              const parsed = schema.partial().parse(JSON.parse(raw));
              return Response.json(normalize(parsed));
            } catch {
              /* fall through */
            }
          }
          const status =
            typeof err === "object" && err && "statusCode" in err
              ? Number((err as { statusCode?: number }).statusCode)
              : 500;
          if (status === 429)
            return Response.json(
              { error: "Rate limit exceeded, try again shortly." },
              { status: 429 },
            );
          if (status === 402)
            return Response.json(
              { error: "AI credits exhausted. Please top up." },
              { status: 402 },
            );
          console.error(err);
          return Response.json({ error: "AI request failed." }, { status: 500 });
        }
      },
    },
  },
});
