import { describe, expect, it } from "vitest";
import { createTar, readTar } from "@/lib/tar";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

describe("tar helpers", () => {
  it("round-trips file entries", () => {
    const archive = createTar([
      { path: "demo/project.json", data: encoder.encode('{"name":"Demo"}') },
      { path: "demo/attachments/receipt.txt", data: encoder.encode("paid") }
    ]);

    const entries = readTar(archive);

    expect(entries.map((entry) => entry.path)).toEqual(["demo/project.json", "demo/attachments/receipt.txt"]);
    expect(decoder.decode(entries[0].data)).toBe('{"name":"Demo"}');
    expect(decoder.decode(entries[1].data)).toBe("paid");
  });

  it("rejects unsafe paths", () => {
    expect(() => createTar([{ path: "../bad", data: encoder.encode("nope") }])).toThrow();
  });
});
