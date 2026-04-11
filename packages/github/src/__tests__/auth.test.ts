import { describe, it, expect, vi, beforeEach } from "vitest";
import { convertManifestCode } from "../auth.js";

describe("convertManifestCode", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn() as any;
  });

  it("should exchange code for manifest data", async () => {
    const mockManifest = {
      id: 12345,
      slug: "doqtor-test",
      pem: "---BEGIN RSA PRIVATE KEY---\n...",
      webhook_secret: "secret123",
    };

    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockManifest),
    });

    const result = await convertManifestCode("test-code");

    expect(fetch).toHaveBeenCalledWith(
      "https://api.github.com/app-manifests/test-code/conversions",
      expect.objectContaining({
        method: "POST",
      })
    );
    expect(result).toEqual(mockManifest);
  });

  it("should throw error on failed conversion", async () => {
    (fetch as any).mockResolvedValue({
      ok: false,
      statusText: "Unprocessable Entity",
    });

    await expect(convertManifestCode("invalid-code")).rejects.toThrow(
      "Failed to convert manifest code: Unprocessable Entity"
    );
  });
});
