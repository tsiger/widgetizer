import { describe, it, expect } from "vitest";
import {
  DEFAULT_LANGUAGE,
  effectiveScript,
  hasNumericRegion,
  LANGUAGE_CODE_RE,
  SUPPORTED_LANGUAGES,
  hreflangCase,
  isRtlLanguage,
  isValidLanguageCode,
  languageDir,
  nativeLanguageName,
  normalizeLanguageCode,
} from "../languages.js";

describe("normalizeLanguageCode", () => {
  it("lowercases and trims", () => {
    expect(normalizeLanguageCode("  PT-BR ")).toBe("pt-br");
  });

  it("turns anything that is not a string into an empty code", () => {
    for (const value of [undefined, null, 42, {}, ["en"]]) expect(normalizeLanguageCode(value)).toBe("");
  });
});

describe("isValidLanguageCode", () => {
  it("accepts plain ISO 639-1 codes", () => {
    for (const code of ["en", "el", "it", "ja"]) expect(isValidLanguageCode(code)).toBe(true);
  });

  it("accepts a regional subtag, so pt-br needs no migration later", () => {
    expect(isValidLanguageCode("pt-br")).toBe(true);
    expect(isValidLanguageCode("zh-hans")).toBe(true);
  });

  it("rejects the wrong shape", () => {
    for (const code of ["", "e", "eng", "en_US", "en-", "en-verylongsubtag", "e1", "-en", "en--us"]) {
      expect(isValidLanguageCode(code), code).toBe(false);
    }
  });

  it("rejects right-to-left languages, base subtag included", () => {
    for (const code of ["ar", "he", "fa", "ur", "ks", "ar-eg"]) expect(isValidLanguageCode(code), code).toBe(false);
  });

  it("rejects a left-to-right language written in a right-to-left script", () => {
    for (const code of ["pa-arab", "ku-arab", "az-arab", "sr-hebr"]) {
      expect(isValidLanguageCode(code), code).toBe(false);
    }
    expect(isValidLanguageCode("pa")).toBe(true);
    expect(isValidLanguageCode("zh-hans")).toBe(true);
  });

  it("rejects a region that implies a right-to-left script, with no subtag saying so", () => {
    for (const code of ["pa-pk", "az-ir", "uz-af", "kk-cn", "ky-cn", "ms-cc"]) {
      expect(isValidLanguageCode(code), code).toBe(false);
    }
    expect(isValidLanguageCode("pa-in")).toBe(true);
    expect(isValidLanguageCode("az-az")).toBe(true);
  });

  it("accepts a right-to-left language in a region that writes it left-to-right", () => {
    expect(isValidLanguageCode("sd")).toBe(false);
    expect(isValidLanguageCode("sd-in")).toBe(true);
  });

  it("does not let a four-character variant pass as a script", () => {
    // "1994" is a variant subtag, so Arabic stays right-to-left and refused.
    expect(effectiveScript("ar-1994")).toBe("");
    expect(isValidLanguageCode("ar-1994")).toBe(false);
    expect(languageDir("ar-1994")).toBe("rtl");
  });

  it("refuses a region written as a number rather than guessing its script", () => {
    // 586 is Pakistan, where Punjabi is written right-to-left.
    expect(isValidLanguageCode("pa-586")).toBe(false);
    expect(isValidLanguageCode("pt-076")).toBe(false);
    expect(isValidLanguageCode("pa-in")).toBe(true);
  });
});

describe("isRtlLanguage / languageDir", () => {
  it("reads the base subtag", () => {
    expect(isRtlLanguage("ar-eg")).toBe(true);
    expect(isRtlLanguage("ks")).toBe(true);
    expect(isRtlLanguage("EN")).toBe(false);
  });

  it("lets a script subtag override the base language's direction", () => {
    expect(languageDir("pa")).toBe("ltr");
    expect(languageDir("pa-arab")).toBe("rtl");
    expect(languageDir("PA-Arab")).toBe("rtl");
  });

  it("reads the script a region implies", () => {
    expect(languageDir("pa-pk")).toBe("rtl");
    expect(languageDir("pa-in")).toBe("ltr");
    expect(languageDir("sd-in")).toBe("ltr");
  });

  it("reports ltr for everything supported", () => {
    for (const { code } of SUPPORTED_LANGUAGES) expect(languageDir(code), code).toBe("ltr");
    expect(languageDir("he")).toBe("rtl");
  });
});

describe("effectiveScript", () => {
  it("returns the script subtag when the code names one", () => {
    expect(effectiveScript("zh-hans")).toBe("hans");
    expect(effectiveScript("PA-Arab")).toBe("arab");
  });

  it("returns the script a region implies, and nothing when it implies the default", () => {
    expect(effectiveScript("pa-pk")).toBe("arab");
    expect(effectiveScript("sd-in")).toBe("deva");
    expect(effectiveScript("pa-in")).toBe("");
    expect(effectiveScript("en")).toBe("");
    expect(effectiveScript("")).toBe("");
  });
});

describe("hasNumericRegion", () => {
  it("spots a UN M.49 region number, and nothing else", () => {
    expect(hasNumericRegion("pa-586")).toBe(true);
    expect(hasNumericRegion("pa-pk")).toBe(false);
    expect(hasNumericRegion("ar-1994")).toBe(false);
    expect(hasNumericRegion("en")).toBe(false);
    expect(hasNumericRegion("")).toBe(false);
  });
});

describe("hreflangCase", () => {
  it("uppercases a region and title-cases a script", () => {
    expect(hreflangCase("pt-br")).toBe("pt-BR");
    expect(hreflangCase("zh-hans")).toBe("zh-Hans");
    expect(hreflangCase("zh-hans-cn")).toBe("zh-Hans-CN");
  });

  it("leaves a plain code and an empty value alone", () => {
    expect(hreflangCase("el")).toBe("el");
    expect(hreflangCase("")).toBe("");
    expect(hreflangCase(null)).toBe("");
  });
});

describe("nativeLanguageName", () => {
  it("names a language in its own language", () => {
    expect(nativeLanguageName("el")).toBe("Ελληνικά");
    expect(nativeLanguageName("de")).toBe("Deutsch");
  });

  it("falls back to the base language, keeping the region visible", () => {
    expect(nativeLanguageName("pt-br")).toBe("Português (BR)");
  });

  it("falls back to the code itself when the language is unknown", () => {
    expect(nativeLanguageName("xx")).toBe("xx");
    expect(nativeLanguageName("")).toBe("");
  });
});

describe("SUPPORTED_LANGUAGES", () => {
  it("offers only codes the API would accept", () => {
    for (const { code, name } of SUPPORTED_LANGUAGES) {
      expect(LANGUAGE_CODE_RE.test(code), code).toBe(true);
      expect(isValidLanguageCode(code), code).toBe(true);
      expect(name.length).toBeGreaterThan(0);
    }
  });

  it("lists no code twice, and includes the default", () => {
    const codes = SUPPORTED_LANGUAGES.map((language) => language.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes).toContain(DEFAULT_LANGUAGE);
  });
});
