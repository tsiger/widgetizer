import { describe, it, expect } from "vitest";
import { isValidBlockId, isValidWidgetId } from "@widgetizer/core/widgetOrder";
import { repairWidgetIds } from "../repairWidgetIds";

const w = (type = "text", extra = {}) => ({ type, settings: {}, ...extra });
const page = (widgets, widgetsOrder = Object.keys(widgets)) => ({ id: "about", widgets, widgetsOrder });
const area = (widgets, widgetsOrder = Object.keys(widgets)) => ({ widgets, widgetsOrder });
// Parsed JSON keeps `__proto__` as an ordinary own key; an object literal would not.
const parsed = (value) => JSON.parse(JSON.stringify(value));

const repair = ({ pageData = page({}), sharedAreas = {}, declaredAreaIds = Object.keys(sharedAreas), globalWidgets = { header: null, footer: null } } = {}) =>
  repairWidgetIds({ page: pageData, sharedAreas, declaredAreaIds, globalWidgets });

describe("repairWidgetIds", () => {
  describe("new ids", () => {
    // Golden values: 64-bit FNV-1a over the UTF-8 of `owner + "\n" + old id`, as 16 hex digits.
    it("derives a widget's new id from its owner and its old id", () => {
      const result = repair({ pageData: page({ header: w(), "bad id": w(), "café": w() }) });
      expect(Object.keys(result.page.widgets)).toEqual([
        "widget_a7d875a41595f511",
        "widget_1c9a41e58d1461e0",
        "widget_455b8909f67e6e3a",
      ]);
    });

    it("derives a block's new id from its owner, its widget's old id and its old id", () => {
      const hero = w("text", { blocks: { "bad id": w("item") }, blocksOrder: ["bad id"] });
      const result = repair({ pageData: page({ hero }) });
      expect(result.page.widgets.hero.blocksOrder).toEqual(["block_eef483dc337eeefa"]);
      expect(Object.keys(result.page.widgets.hero.blocks)).toEqual(["block_eef483dc337eeefa"]);
    });

    it("gives the same ids on every run, whatever the order of the widgets", () => {
      const a = repair({ pageData: page({ header: w(), constructor: w() }) });
      const b = repair({ pageData: page({ constructor: w(), header: w() }, ["constructor", "header"]) });
      expect(Object.keys(a.page.widgets).sort()).toEqual(Object.keys(b.page.widgets).sort());
    });

    it("adds a fixed suffix when the new id is already taken", () => {
      const taken = "widget_a7d875a41595f511";
      const result = repair({ pageData: page({ [taken]: w("hero"), header: w() }) });
      expect(result.page.widgetsOrder).toEqual([taken, `${taken}_2`]);
      expect(result.page.widgets[taken].type).toBe("hero");
    });

    it("never gives an id that breaks the rule", () => {
      const long = "a".repeat(129);
      const result = repair({
        pageData: page({ [long]: w("text", { blocks: { [long]: w() }, blocksOrder: [long] }) }),
      });
      for (const id of Object.keys(result.page.widgets)) {
        expect(isValidWidgetId(id)).toBe(true);
        for (const blockId of Object.keys(result.page.widgets[id].blocks)) expect(isValidBlockId(blockId)).toBe(true);
      }
    });
  });

  describe("widget ids that break the rule", () => {
    it.each([
      ["a pattern break", "bad id"],
      ["129 characters", "a".repeat(129)],
      ["the header's id", "header"],
      ["the footer's id", "footer"],
      ["a built-in name", "constructor"],
    ])("renames %s, in the map and the order together", (_, id) => {
      const result = repair({ pageData: page({ intro: w(), [id]: w("hero") }) });
      const renamed = result.page.widgetsOrder[1];
      expect(renamed).not.toBe(id);
      expect(Object.keys(result.page.widgets)).toEqual(["intro", renamed]);
      expect(result.page.widgets[renamed].type).toBe("hero");
      expect(result.report.widgets).toEqual([{ owner: "page", from: id, to: renamed }]);
    });

    it("renames a stored `__proto__` widget as an ordinary key", () => {
      const result = repair({ pageData: parsed(page({ ["__proto__"]: w("hero") })) });
      expect(result.page.widgetsOrder).toEqual(["widget_c2c49cb72070fe56"]);
      expect(Object.hasOwn(result.page.widgets, "__proto__")).toBe(false);
      expect(Object.getPrototypeOf(result.page.widgets)).toBe(Object.prototype);
      expect(result.page.widgets.widget_c2c49cb72070fe56.type).toBe("hero");
    });

    it("renames a widget left out of the order and keeps it out", () => {
      const result = repair({ pageData: page({ intro: w(), header: w("hero") }, ["intro"]) });
      expect(result.page.widgetsOrder).toEqual(["intro"]);
      expect(Object.keys(result.page.widgets)).toEqual(["intro", "widget_a7d875a41595f511"]);
    });
  });

  describe("ids two owners on the page use", () => {
    it("renames the area's copy when the page uses the id", () => {
      const result = repair({
        pageData: page({ about_intro: w("hero") }),
        sharedAreas: { before_footer: area({ about_intro: w("banner") }) },
      });
      expect(result.page.widgetsOrder).toEqual(["about_intro"]);
      expect(result.sharedAreas.before_footer.widgetsOrder).toEqual(["widget_bad3799a78086903"]);
      expect(result.report.widgets).toEqual([
        { owner: "area:before_footer", from: "about_intro", to: "widget_bad3799a78086903" },
      ]);
    });

    it("renames the page's copy instead when it doesn't render", () => {
      const result = repair({
        pageData: page({ intro: w(), about_intro: w("hero") }, ["intro"]),
        sharedAreas: { before_footer: area({ about_intro: w("banner") }) },
      });
      expect(result.sharedAreas.before_footer.widgetsOrder).toEqual(["about_intro"]);
      expect(Object.keys(result.page.widgets)).toEqual(["intro", expect.stringMatching(/^widget_/)]);
      expect(result.report.widgets[0].owner).toBe("page");
    });

    it("keeps the first declared area's copy when two areas use the id", () => {
      const result = repair({
        sharedAreas: { first: area({ shared: w() }), second: area({ shared: w() }) },
        declaredAreaIds: ["first", "second"],
      });
      expect(result.sharedAreas.first.widgetsOrder).toEqual(["shared"]);
      expect(result.sharedAreas.second.widgetsOrder).toEqual(["widget_45c0eb120b3fc841"]);
    });

    it("renames every later copy when the page and two areas use the id", () => {
      const result = repair({
        pageData: page({ shared: w() }),
        sharedAreas: { first: area({ shared: w() }), second: area({ shared: w() }) },
        declaredAreaIds: ["first", "second"],
      });
      const ids = [result.page, result.sharedAreas.first, result.sharedAreas.second].map((o) => o.widgetsOrder[0]);
      expect(ids[0]).toBe("shared");
      expect(new Set(ids).size).toBe(3);
    });

    it("doesn't rename into an id another owner on the page already uses", () => {
      const taken = "widget_bad3799a78086903";
      const result = repair({
        pageData: page({ about_intro: w(), [taken]: w() }),
        sharedAreas: { before_footer: area({ about_intro: w("banner") }) },
      });
      expect(result.sharedAreas.before_footer.widgetsOrder).toEqual([`${taken}_2`]);
    });

    it("leaves areas the theme doesn't declare alone", () => {
      const retained = area({ about_intro: w() });
      const result = repair({
        pageData: page({ about_intro: w() }),
        sharedAreas: { old: retained },
        declaredAreaIds: [],
      });
      expect(result.sharedAreas.old).toBe(retained);
      expect(result.report.widgets).toEqual([]);
    });
  });

  describe("order entries that name no widget", () => {
    it("drops them from the page and from areas", () => {
      const result = repair({
        pageData: page({ intro: w() }, ["gone", "intro", 7]),
        sharedAreas: { before_footer: area({ cta: w() }, ["cta", "constructor"]) },
      });
      expect(result.page.widgetsOrder).toEqual(["intro"]);
      expect(result.sharedAreas.before_footer.widgetsOrder).toEqual(["cta"]);
      expect(result.changed).toBe(true);
      expect(result.report.widgets).toEqual([]);
    });
  });

  describe("block ids", () => {
    it("renames bad block ids in page, area, header and footer widgets", () => {
      const withBad = () => w("text", { blocks: { ok: w(), "bad id": w("item") }, blocksOrder: ["ok", "bad id"] });
      const result = repair({
        pageData: page({ hero: withBad() }),
        sharedAreas: { before_footer: area({ cta: withBad() }) },
        globalWidgets: { header: withBad(), footer: null },
      });
      for (const widget of [result.page.widgets.hero, result.sharedAreas.before_footer.widgets.cta, result.globalWidgets.header]) {
        expect(widget.blocksOrder[0]).toBe("ok");
        expect(widget.blocksOrder[1]).toMatch(/^block_[0-9a-f]{16}$/);
        expect(Object.keys(widget.blocks)).toEqual(widget.blocksOrder);
      }
      expect(result.globalWidgets.footer).toBeNull();
      expect(result.report.blocks).toEqual([
        { owner: "page", widget: "hero", from: "bad id", to: "block_eef483dc337eeefa" },
        { owner: "area:before_footer", widget: "cta", from: "bad id", to: result.sharedAreas.before_footer.widgets.cta.blocksOrder[1] },
        { owner: "header", widget: "header", from: "bad id", to: "block_d6f4f86876f6fabb" },
      ]);
    });

    it("renames the blocks of a widget that is renamed too, from their old ids", () => {
      const result = repair({ pageData: page({ "bad id": w("text", { blocks: { "x y": w() }, blocksOrder: ["x y"] }) }) });
      const widget = Object.values(result.page.widgets)[0];
      expect(widget.blocksOrder[0]).toMatch(/^block_/);
      expect(result.report.blocks[0]).toMatchObject({ widget: "bad id", from: "x y" });
    });
  });

  describe("nothing to repair", () => {
    it("returns the same objects and reports nothing", () => {
      const input = {
        pageData: page({ intro: w("text", { blocks: { a: w() }, blocksOrder: ["a"] }) }),
        sharedAreas: { before_footer: area({ cta: w() }) },
        globalWidgets: { header: w("header"), footer: null },
      };
      const result = repair(input);
      expect(result.page).toBe(input.pageData);
      expect(result.sharedAreas).toBe(input.sharedAreas);
      expect(result.globalWidgets).toBe(input.globalWidgets);
      expect(result.changed).toBe(false);
      expect(result.report).toEqual({ widgets: [], blocks: [] });
    });

    it("returns an owner it didn't touch as the same object", () => {
      const untouched = area({ cta: w() });
      const result = repair({ pageData: page({ header: w() }), sharedAreas: { before_footer: untouched } });
      expect(result.sharedAreas.before_footer).toBe(untouched);
    });
  });
});
