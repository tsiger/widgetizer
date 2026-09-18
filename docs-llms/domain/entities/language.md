# Language and translation group

[Map](../README.md) · [Multilingual rules](../multilingual.md) · [Language operations](../operations/languages.md)

## Plain-language guide

### What is a site language?

A site language is one of the languages in which you author the website. You start with a default language and can add others supported by the app.

This is separate from the language of Widgetizer's buttons and menus. Choosing Greek for the website does not translate the editor interface, and choosing Greek for the interface does not translate your pages.

### What is a translation group?

A translation group simply means “these are versions of the same page or collection entry.” For example, English About and Greek About belong together even if their addresses and layouts differ.

There is no master version that controls all the others. You may edit each independently, and deleting one leaves the remaining versions related.

### What can you do?

| Action | What happens |
| --- | --- |
| Add a language | Creates starting menus, header and footer for it. Pages and collection entries still need their own versions. |
| Create a version | Copies one page or entry into another language and records that the two belong together. |
| Open an existing version | Takes you to that independently editable page or entry. |
| Duplicate normally | Creates a new, unrelated page or entry; this is different from creating a translation. |
| Remove a language | Deletes its pages, collection entries, menus, header/footer and translated media descriptions. |
| Change the default language | Relabels the existing main-language content; allowed only while the project has no additional languages. |

### What gets translated automatically?

The words do not translate themselves. A new version begins with copied content that you can translate and rearrange. A page can have a version in one additional language and none in another.

Images and shared design settings do not need one copy per language. An image can have a translated description while keeping the same uploaded photograph.

### When do these actions take effect?

Adding, creating a version and removing are separate saved operations. Editing the contents afterward follows that page or form's save process. Removal is not a temporary language filter: it deletes authored work in that language.

Adding a language does not immediately include it in website exports. Create its homepage first; until then exports skip it and name it in the result. The default language's missing homepage stops the whole export. See [export rules](../operations/output.md#which-languages-are-included).

### Example

Translate English About into Greek, then create Italian About from the Greek version. All three belong together. Deleting English About leaves the Greek and Italian pages intact and related.

## Technical details

## Language

A project has one default language and zero or more additional languages. Language codes are normalized to lowercase. The current validator accepts a restricted language/subtag format and rejects unsupported right-to-left forms and numeric-region forms. The editor interface's language is a separate application preference.

Content language is determined by its directory. Loaded page/menu/item models carry `language`; normal persistence strips that property. Default-language content stays at the root; additional content sits in a code-named folder. [Address examples](../multilingual.md#addresses-and-identity).

Adding a language copies default-language menus and globals. It does not create page or collection-item versions. Removing a language removes its content and metadata overrides, while shared uploaded files remain.

## Translation group

A group is a relationship encoded in page/item documents, not a separate owned master record. `translationGroupId` identifies the group; when absent, the document's UUID is its effective group ID.

- A version gets a new UUID and joins its source's group.
- An ordinary duplicate gets a new UUID and starts a new group.
- A group permits at most one page version per language, or one item version per language within its collection type.
- Any member can be the source for creating another version.
- Deleting the original member does not dissolve the group or delete its siblings.
- Documents without a stable identity must be saved before creating versions.
- Menus, globals, widgets, blocks, and media do not join page/item translation groups.

The creation handlers serialize check-and-create operations per project. Language add/remove uses another per-project serializer. Coordination between those two workflows is a [review question](../review-questions.md#r3-language-lifecycle-and-content-writes).

Implementation: [languages](../../../packages/core/src/utils/languages.js), [contentAddress](../../../packages/core/src/utils/contentAddress.js), [contentLanguage](../../../packages/builder-server/src/utils/contentLanguage.js), [translationService](../../../packages/builder-server/src/services/translationService.js).

Test evidence: [translationGroups](../../../packages/builder-server/src/tests/translationGroups.test.js) asserts group membership, unchanged source documents, duplicate separation, deleting a member, concurrent creation, missing identities, and target-language conflicts. [languageService](../../../packages/builder-server/src/tests/languageService.test.js) covers seeding and removal.
