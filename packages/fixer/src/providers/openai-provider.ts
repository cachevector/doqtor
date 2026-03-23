import type { AiProvider, AiFixRequest, AiFixResponse } from "../ai-provider.js";

export class OpenAiProvider implements AiProvider {
  name = "openai";

  constructor(private apiKey: string) {}

  async generateFix(request: AiFixRequest): Promise<AiFixResponse> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a documentation updater. Given a documentation snippet and a code change, update the documentation to reflect the new code. Only return the updated documentation text, nothing else.",
          },
          {
            role: "user",
            content: buildPrompt(request),
          },
        ],
        temperature: 0,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };

    return {
      fixedContent: data.choices[0]?.message.content ?? request.docContent,
    };
  }
}

function buildPrompt(request: AiFixRequest): string {
  return `The function "${request.symbolName}" has changed:

Old signature: ${request.oldSignature}
New signature: ${request.newSignature}

Update this documentation to reflect the change:

${request.docContent}

Context: ${request.context}`;
}
