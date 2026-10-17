import { describe, it, expect } from "vitest";
import { promptHtml, actionFromUrl, serverCallFor } from "./assistantPromptWindow.js";

const approval = { kind: "approval", id: "a1", plan: ["delete the page <About>"], summary: "Tidy up" };

describe("assistant prompt window", () => {
  it("shows the plan as text, never as markup", () => {
    const html = promptHtml(approval);
    expect(html).toContain("delete the page &lt;About&gt;");
    expect(html).not.toContain("<About>");
    expect(html).not.toMatch(/<script/i);
  });

  it("only understands its own buttons", () => {
    expect(actionFromUrl("widgetizer-prompt:allow")).toBe("allow");
    expect(actionFromUrl("widgetizer-prompt:delete")).toBeNull();
    expect(actionFromUrl("https://example.com")).toBeNull();
  });

  it("answers the question it shows, and Stop works for either", () => {
    expect(serverCallFor("allow", approval)).toEqual(["answerApproval", { id: "a1", allow: true }]);
    expect(serverCallFor("keep", approval)).toBeNull();
    expect(serverCallFor("undo", { kind: "decision" })).toEqual(["decideJob", { keep: false }]);
    expect(serverCallFor("stop", approval)).toEqual(["stopJob", {}]);
  });
});
