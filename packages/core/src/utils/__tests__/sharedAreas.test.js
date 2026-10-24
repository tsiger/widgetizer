import { describe, it, expect } from "vitest";
import { readAreaDeclarations, areaWidgetProblem, areaFromTemplate, emptyArea, AREA_ID_RE } from "../sharedAreas.js";

describe("readAreaDeclarations", () => {
  it("reads a theme without areas as none", () => {
    expect(readAreaDeclarations({ name: "Arch" })).toEqual({ areas: [], problems: [] });
    expect(readAreaDeclarations(null)).toEqual({ areas: [], problems: [] });
  });

  it("keeps the declared order", () => {
    const { areas, problems } = readAreaDeclarations({
      sharedAreas: [
        { id: "after_header", label: "tTheme:areas.after_header" },
        { id: "before_footer", label: "Before footer" },
      ],
    });
    expect(problems).toEqual([]);
    expect(areas.map((area) => area.id)).toEqual(["after_header", "before_footer"]);
  });

  it("leaves out bad entries and says why, keeping the good ones", () => {
    const { areas, problems } = readAreaDeclarations({
      sharedAreas: [
        { id: "before_footer", label: "Before footer" },
        { id: "before_footer", label: "Again" },
        { id: "Before-Footer", label: "Bad id" },
        { id: "no_label" },
        "before_footer",
      ],
    });
    expect(areas).toEqual([{ id: "before_footer", label: "Before footer" }]);
    expect(problems).toHaveLength(4);
    expect(problems[0]).toMatch(/declared twice/);
    expect(problems[1]).toMatch(/"id" must match/);
    expect(problems[2]).toMatch(/"label"/);
    expect(problems[3]).toMatch(/must be an object/);
  });

  it("refuses a declaration that is not a list", () => {
    expect(readAreaDeclarations({ sharedAreas: { before_footer: {} } }).problems[0]).toMatch(/must be an array/);
  });

  it("allows only plain ids", () => {
    expect(AREA_ID_RE.test("before_footer")).toBe(true);
    for (const id of ["", "1st", "before-footer", "../x", "Before"]) expect(AREA_ID_RE.test(id)).toBe(false);
  });
});

describe("areaWidgetProblem", () => {
  it("accepts an ordinary widget, including a collection listing", () => {
    expect(areaWidgetProblem({ type: "rich-text", settings: { heading: "Hi" } })).toBeNull();
    expect(areaWidgetProblem({ type: "news-grid", settings: { listing_anchor: false, paginate: false } })).toBeNull();
  });

  it("refuses a form", () => {
    expect(areaWidgetProblem({ type: "core-form", settings: {} })).toMatch(/core-form/);
  });

  it("refuses the page-only listing roles", () => {
    expect(areaWidgetProblem({ type: "news-grid", settings: { listing_anchor: true } })).toMatch(/listing_anchor/);
    expect(areaWidgetProblem({ type: "news-grid", settings: { paginate: true } })).toMatch(/paginate/);
  });
});

describe("emptyArea", () => {
  it("is a fresh empty widget list each time", () => {
    const a = emptyArea();
    a.widgetsOrder.push("x");
    expect(emptyArea()).toEqual({ widgets: {}, widgetsOrder: [] });
  });
});

describe("areaFromTemplate", () => {
  it("keeps the widget list in order and nothing else", () => {
    const template = {
      name: "ignored",
      widgets: { b: { type: "rich-text", settings: { heading: "B" } }, a: { type: "rich-text", settings: {} } },
      widgetsOrder: ["a", "b"],
    };
    expect(areaFromTemplate(template)).toEqual({ widgets: template.widgets, widgetsOrder: ["a", "b"] });
  });

  it("leaves out a form and switches off page-only roles", () => {
    const area = areaFromTemplate({
      widgets: {
        f: { type: "core-form", settings: {} },
        n: { type: "news-grid", settings: { listing_anchor: true, paginate: true, limit: 3 } },
      },
      widgetsOrder: ["f", "n"],
    });
    expect(area.widgetsOrder).toEqual(["n"]);
    expect(area.widgets.n.settings).toEqual({ listing_anchor: false, paginate: false, limit: 3 });
  });

  it("drops order entries with no widget", () => {
    expect(areaFromTemplate({ widgets: {}, widgetsOrder: ["ghost"] })).toEqual({ widgets: {}, widgetsOrder: [] });
  });
});
