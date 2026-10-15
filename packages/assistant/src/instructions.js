// Clients may only read the start of server instructions, so the essential rules
// come first and stand on their own.
export const PLATFORM_INSTRUCTIONS = [
  "Widgetizer is a website builder running on the user's computer. You work through it, never on files directly.",
  "Work only on the site that is open in Widgetizer (see widgetizer_status). You may list other sites, but only the user switches sites.",
  "Never invent business facts, prices, reviews or testimonials. Ask, or use clearly marked placeholders.",
  "If Widgetizer is closed or assistant access is off, ask the user to open Widgetizer and turn on AI Assistant access in its settings.",
  "Read get_guidance (topic core) once per conversation, and the other topics when a task calls for them.",
].join("\n");
