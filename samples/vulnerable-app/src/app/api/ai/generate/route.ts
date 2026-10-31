import { openai } from "@/lib/openai";

// Generate content with OpenAI.
export async function POST(req: Request) {
  const { prompt } = await req.json();
  const out = await openai.responses.create({ model: "gpt-4o", input: prompt });
  return Response.json(out);
}
