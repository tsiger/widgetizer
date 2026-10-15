import { describe, it, expect } from "vitest";
import { htmlToText } from "../htmlText.js";

describe("htmlToText", () => {
  it("keeps inline markup joined to its neighbours", () => {
    expect(htmlToText("un<strong>break</strong>able")).toBe("unbreakable");
    expect(htmlToText("We are <strong>open</strong>.")).toBe("We are open.");
    expect(htmlToText('<p>See <a href="/x"><em>this</em></a>, then <span>that</span>!</p>')).toBe("See this, then that!");
  });

  it("ignores a > inside a quoted attribute value", () => {
    expect(htmlToText('<a href="https://example.com/?q=a>b">Read more</a>')).toBe("Read more");
    expect(htmlToText("<a title='1 > 0' href=\"x\">Yes</a>")).toBe("Yes");
    expect(htmlToText('<img alt="a > b" src="x.png">after')).toBe("after");
  });

  it("breaks lines at block boundaries and <br>", () => {
    expect(htmlToText("<h2>Why</h2><p>Because.</p><ul><li>One</li><li>Two</li></ul>")).toBe("Why\nBecause.\nOne\nTwo");
    expect(htmlToText("<p>First line<br>second line<br/>third</p>")).toBe("First line\nsecond line\nthird");
  });

  it("collapses whitespace within a line and drops empty lines", () => {
    expect(htmlToText("<p>  lots \n  of\t space  </p><p> </p><div></div><p>end</p>")).toBe("lots of space\nend");
  });

  it("decodes entities in text", () => {
    expect(htmlToText("<p>Flour &amp; water &lt;3 &#233;t&#xE9; &quot;q&quot; &nbsp;x &eacute;</p>")).toBe(
      `Flour & water <3 ${String.fromCodePoint(233)}t${String.fromCodePoint(233)} "q" x &eacute;`,
    );
  });

  it("drops comments and script or style content", () => {
    expect(htmlToText("a<!-- hidden <b>x</b> -->b")).toBe("ab");
    expect(htmlToText("<p>keep</p><script>var a = '<p>no</p>';</script><style>p > b { }</style><p>too</p>")).toBe("keep\ntoo");
  });

  it("treats a < that opens no tag as text and survives unterminated markup", () => {
    expect(htmlToText("1 < 2 and 3 <= 4")).toBe("1 < 2 and 3 <= 4");
    expect(htmlToText("text <strong unterminated")).toBe("text");
    expect(htmlToText("before <!-- never closed")).toBe("before");
    expect(htmlToText(undefined)).toBe("");
  });
});
