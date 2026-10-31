import { describe, it, expect } from "vitest";
import { z } from "zod";
import { parse, notImplemented, fail } from "@/lib/api";

const post = (body: string) => new Request("http://x.test/api", { method: "POST", body });
const schema = z.object({ findingId: z.string().min(1) });

describe("parse()", () => {
  it("returns data for a valid body", async () => {
    const r = await parse(post(JSON.stringify({ findingId: "f1" })), schema);
    expect("data" in r && r.data.findingId).toBe("f1");
  });

  it("rejects a non-JSON body with 400", async () => {
    const r = await parse(post("not json"), schema);
    expect("error" in r).toBe(true);
    if ("error" in r) {
      expect(r.error.status).toBe(400);
      expect((await r.error.json()).code).toBe("invalid_request");
    }
  });

  it("rejects a body that fails validation with 400 and issues", async () => {
    const r = await parse(post(JSON.stringify({ findingId: "" })), schema);
    expect("error" in r).toBe(true);
    if ("error" in r) {
      expect(r.error.status).toBe(400);
      expect((await r.error.json()).issues).toBeDefined();
    }
  });
});

describe("unavailable responses", () => {
  it("notImplemented is a 501 that is never ok", async () => {
    const res = notImplemented("nope");
    expect(res.status).toBe(501);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.code).toBe("not_implemented");
  });

  it("fail defaults to 503", () => {
    expect(fail({ code: "not_connected", message: "m" }).status).toBe(503);
  });
});
