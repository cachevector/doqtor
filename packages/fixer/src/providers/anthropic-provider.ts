import type { AiProvider, AiFixRequest, AiFixResponse } from "../ai-provider.js";

export class AnthropicProvider implements AiProvider {
  name = "anthropic";

  constructor(private apiKey: string) {}

  async generateFix(request: AiFixRequest): Promise<AiFixResponse> {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system:
          "You are a documentation updater. Given a documentation snippet and a code change, update the documentation to reflect the new code. Only return the updated documentation text, nothing else.",
        messages: [
          {
            role: "user",
            content: buildPrompt(request),
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as {
      content: Array<{ text: string }>;
    };

    return {
      fixedContent: data.content[0]?.text ?? request.docContent,
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
