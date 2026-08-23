import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import type { BrandProfile, ChatMessage, ExtractedLead } from "@/lib/kayanova/types";
import { uid } from "@/lib/kayanova/presets";
import { sendAgentChatApi } from "@/lib/kayanova/api";

const ORDER_TYPES = ["Delivery", "Pickup", "Medical Booking", "General"] as const;

export function useAgentChat(brand: BrandProfile | null, channel = "web") {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState(false);
  const [lead, setLead] = useState<ExtractedLead | null>(null);
  const historyRef = useRef<ChatMessage[]>([]);

  const reset = useCallback(() => {
    const greeting = brand?.welcomeMessage;
    const initial: ChatMessage[] = greeting ? [{ role: "assistant", content: greeting }] : [];
    historyRef.current = initial;
    setMessages(initial);
    setLead(null);
  }, [brand?.welcomeMessage]);

  const send = useCallback(
    async (text: string, onLead?: (lead: ExtractedLead) => void): Promise<void> => {
      if (!text.trim() || !brand) return;
      const userMsg: ChatMessage = { role: "user", content: text.trim() };
      historyRef.current = [...historyRef.current, userMsg];
      setMessages(historyRef.current);
      setPending(true);

      try {
        const data = await sendAgentChatApi({
          message: userMsg.content,
          history: historyRef.current.slice(0, -1),
          config: brand,
          brandId: brand.id,
        });

        const reply = data.reply ?? "";
        historyRef.current = [...historyRef.current, { role: "assistant", content: reply }];
        setMessages(historyRef.current);

        if (data.extracted_order?.has_order) {
          const ord = data.extracted_order;
          const total = Number(ord.numeric_total || 0);
          const rawType = ord.order_type ?? "Delivery";
          const type = ORDER_TYPES.find((t) => t === rawType) ?? "Delivery";

          const extracted: ExtractedLead = {
            id: data.saved_order_id || uid("lead"),
            brandId: brand.id,
            customerName: ord.customer_name || "عميل الوكيل",
            customerPhone: ord.customer_phone || "",
            items: ord.items?.map(String) ?? [text],
            numericTotal: total,
            totalAmount: ord.total_amount || `${total} ج.م`,
            orderType: type,
            deliveryAddress: ord.delivery_address || "",
            status: "New",
            intent: data.extracted_lead?.intent || "Order",
            channel,
            timestamp: new Date().toISOString(),
          };
          setLead(extracted);
          onLead?.(extracted);
        }
      } catch (err) {
        console.error("AI chat error:", err);
        toast.error("Could not reach the AI agent engine backend.");
      } finally {
        setPending(false);
      }
    },
    [brand, channel],
  );

  return { messages, pending, lead, send, reset, setMessages };
}
