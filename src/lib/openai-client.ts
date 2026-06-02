import { z } from "zod";

const responseContentSchema = z.object({
  type: z.string().optional(),
  text: z.string().optional()
});

const responseOutputSchema = z.object({
  content: z.array(responseContentSchema).optional()
});

const openAiResponseSchema = z.object({
  output_text: z.string().optional(),
  output: z.array(responseOutputSchema).optional()
});

interface GenerateStructuredJsonOptions<T> {
  name: string;
  system: string;
  user: string;
  schema: z.ZodType<T>;
}

export async function generateStructuredJson<T>({
  name,
  system,
  user,
  schema
}: GenerateStructuredJsonOptions<T>): Promise<T | null> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        input: [
          {
            role: "system",
            content: system
          },
          {
            role: "user",
            content: user
          }
        ],
        text: {
          format: {
            type: "json_object"
          }
        },
        metadata: {
          feature: name
        }
      }),
      signal: AbortSignal.timeout(12000)
    });

    if (!response.ok) {
      return null;
    }

    const parsedResponse = openAiResponseSchema.safeParse(await response.json());

    if (!parsedResponse.success) {
      return null;
    }

    const text = extractResponseText(parsedResponse.data);

    if (!text) {
      return null;
    }

    const parsedJson = safeJsonParse(text);

    if (!parsedJson) {
      return null;
    }

    const validated = schema.safeParse(parsedJson);

    return validated.success ? validated.data : null;
  } catch {
    return null;
  }
}

function extractResponseText(response: z.infer<typeof openAiResponseSchema>): string | null {
  if (response.output_text) {
    return response.output_text;
  }

  const textParts =
    response.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text)
      .filter((text): text is string => Boolean(text)) ?? [];

  return textParts.length > 0 ? textParts.join("\n") : null;
}

function safeJsonParse(value: string): unknown | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
