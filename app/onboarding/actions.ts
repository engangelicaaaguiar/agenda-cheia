"use server";

import { z } from "zod";

const GroqCrmOutputSchema = z.object({
  crm: z.string().min(1),
  name: z.string().min(1),
  uf: z.string().length(2),
});

export type GroqCrmOutput = z.infer<typeof GroqCrmOutputSchema>;

export type ExtractCrmResult =
  | { ok: true; data: GroqCrmOutput }
  | { ok: false; error: string };

function extractJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

export async function extractCrmData(formData: FormData): Promise<ExtractCrmResult> {
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return { ok: false, error: "Arquivo nao enviado." };
  }

  if (!file.type.startsWith("image/")) {
    return { ok: false, error: "Formato invalido. Envie uma imagem do CRM." };
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "GROQ_API_KEY nao configurada." };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  const base64Image = Buffer.from(binary, "binary").toString("base64");

  const model = process.env.GROQ_VISION_MODEL ?? "llama-3.2-90b-vision-preview";

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: 'Extraia o NOME, NÚMERO DO CRM e ESTADO (UF) desta imagem médica. Retorne APENAS um JSON no formato: { crm: string, name: string, uf: string }',
              },
              {
                type: "image_url",
                image_url: { url: `data:${file.type};base64,${base64Image}` },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      return { ok: false, error: "Falha ao processar OCR com IA. Preencha manualmente." };
    }

    const payload: unknown = await response.json();
    const content =
      typeof payload === "object" &&
      payload !== null &&
      "choices" in payload &&
      Array.isArray((payload as { choices?: unknown[] }).choices)
        ? (payload as { choices: Array<{ message?: { content?: string } }> }).choices[0]?.message?.content ?? ""
        : "";

    const jsonText = extractJsonObject(content);
    if (!jsonText) {
      return { ok: false, error: "Nao foi possivel interpretar o retorno da IA. Edite manualmente." };
    }

    const parsed = GroqCrmOutputSchema.safeParse(JSON.parse(jsonText));
    if (!parsed.success) {
      return { ok: false, error: "Dados de OCR invalidos. Edite manualmente." };
    }

    return {
      ok: true,
      data: {
        crm: parsed.data.crm.replace(/\D/g, ""),
        name: parsed.data.name.trim(),
        uf: parsed.data.uf.trim().toUpperCase(),
      },
    };
  } catch {
    return { ok: false, error: "Erro de OCR. Edite os campos manualmente." };
  }
}
