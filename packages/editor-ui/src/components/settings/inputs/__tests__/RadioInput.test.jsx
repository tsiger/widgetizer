// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import RadioInput from "../RadioInput.jsx";

// The compact page-editor sidebar stacks radio options vertically via a
// `.page-editor-settings .radio-input-group { flex-col }` rule in preset.css.
// That rule needs the `radio-input-group` class hook on the group wrapper; this
// pins the hook so the CSS can never silently lose its target.
describe("RadioInput", () => {
  it("tags the options wrapper with the radio-input-group class hook", () => {
    const { container } = render(
      <RadioInput id="size" value="s" onChange={() => {}} options={["s", "m", "l"]} />,
    );
    expect(container.querySelector(".radio-input-group")).not.toBeNull();
  });
});
