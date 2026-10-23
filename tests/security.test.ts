import { describe, expect, it } from "vitest";
import { guardLocalRequest } from "@/lib/security";

const req = (headers: Record<string, string>) => ({ headers: new Headers(headers) });
const GET = { mutating: false };
const POST = { mutating: true };

describe("guardLocalRequest (NFR-02)", () => {
  it.each(["localhost:3000", "127.0.0.1:3000", "127.0.0.1", "[::1]:3000", "LOCALHOST:3000"])("mengizinkan Host %s", (host) => {
    expect(guardLocalRequest(req({ host }), GET)).toBeNull();
  });

  it.each(["evil.example", "evil.example:3000", "192.168.1.16:3000", "localhost.evil.example"])("menolak Host %s (DNS rebinding)", (host) => {
    expect(guardLocalRequest(req({ host }), GET)?.status).toBe(403);
  });

  it("menolak request tanpa header Host", () => {
    expect(guardLocalRequest(req({}), GET)?.status).toBe(403);
  });

  it("POST dari origin yang sama diizinkan", () => {
    expect(guardLocalRequest(req({ host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000", "sec-fetch-site": "same-origin" }), POST)).toBeNull();
  });

  it("POST lintas situs ditolak (CSRF), baik lewat Origin maupun Sec-Fetch-Site", () => {
    expect(guardLocalRequest(req({ host: "127.0.0.1:3000", origin: "https://evil.example" }), POST)?.status).toBe(403);
    expect(guardLocalRequest(req({ host: "127.0.0.1:3000", "sec-fetch-site": "cross-site" }), POST)?.status).toBe(403);
    expect(guardLocalRequest(req({ host: "127.0.0.1:3000", origin: "http://localhost:3000" }), POST)?.status).toBe(403);
    expect(guardLocalRequest(req({ host: "127.0.0.1:3000", origin: "bukan-url" }), POST)?.status).toBe(403);
  });

  it("klien non-browser tanpa Origin (mis. curl lokal) diizinkan", () => {
    expect(guardLocalRequest(req({ host: "127.0.0.1:3000" }), POST)).toBeNull();
  });

  it("GET tidak memeriksa Origin", () => {
    expect(guardLocalRequest(req({ host: "127.0.0.1:3000", origin: "https://evil.example" }), GET)).toBeNull();
  });
});
