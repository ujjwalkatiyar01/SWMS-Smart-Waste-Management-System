import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "@/lib/csv";

describe("csvCell", () => {
  it("leaves plain text, numbers and booleans alone, and empties null", () => {
    expect(csvCell("Market Lane")).toBe("Market Lane");
    expect(csvCell(42)).toBe("42");
    expect(csvCell(-3)).toBe("-3");
    expect(csvCell(true)).toBe("true");
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
  });

  it("quotes commas, quotes and line breaks", () => {
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
  });

  it("defuses text a spreadsheet would run as a formula", () => {
    for (const bad of ["=1+1", "+SUM(A1)", "-2+3", "@cmd", "\tx", "\rx"]) {
      expect(csvCell(bad).replace(/^"/, "").startsWith("'")).toBe(true);
    }
    expect(csvCell('=HYPERLINK("http://x","y")')).toBe(`"'=HYPERLINK(""http://x"",""y"")"`);
  });
});

describe("toCsv", () => {
  it("writes a header, CRLF rows and a byte-order mark", () => {
    const out = toCsv(["id", "note"], [["1", "ok"], ["2", "=x"]]);
    expect(out).toBe("﻿id,note\r\n1,ok\r\n2,'=x\r\n");
  });
});
