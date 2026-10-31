import { grantSubscription } from "@/lib/billing";

// Stripe webhook receiver.
export async function POST(req: Request) {
  const event = await req.json();

  if (event.type === "checkout.session.completed") {
    await grantSubscription(event.data.object.customer);
  }

  return Response.json({ received: true });
}
