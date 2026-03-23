export interface AiFixRequest {
  docContent: string;
  symbolName: string;
  oldSignature: string;
  newSignature: string;
  context: string;
}

export interface AiFixResponse {
  fixedContent: string;
}

export interface AiProvider {
  name: string;
  generateFix(request: AiFixRequest): Promise<AiFixResponse>;
}
