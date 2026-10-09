# Image optimization — early concept

**Notes updated 21 September 2026. Direction agreed for discussion: not implemented, scheduled, or a finished design.** Requirements below describe intended behaviour, not capabilities the app already has.

## The idea

Let people upload their images normally, while Widgetizer prepares lighter versions that help their websites load faster.

A person adding a photograph should not have to understand image formats, compression settings or pixel dimensions. Widgetizer should make sensible choices and briefly explain the result.

**The aim is smaller downloads and efficient project storage, with little or no noticeable change in appearance.** We should not promise that every image will become smaller or look exactly identical after processing.

## Why this matters

People often upload large photographs, screenshots and AI-generated images. Making an image smaller on the page does not necessarily make the file smaller for the visitor.

Widgetizer already creates smaller image versions, but there are still opportunities to reduce unnecessary downloads. Existing projects also need a way to benefit without asking their owners to replace every image by hand.

## Project storage is a core constraint

The OSS version is used intact inside the online version, where users have different storage allowances depending on their plan. Image handling in OSS therefore needs to be efficient from the start; the online version must not need a separate image system to control disk usage.

An exported website includes only images currently in use. The project holds more: unused uploads, the different sizes created for images, and any originals we choose to retain. A small export can still come from a large project that fills the owner's available space.

Every additional image version needs a purpose. Avoid unnecessary sizes, identical copies and old generated versions accumulating after repeated optimization. Reusing an image in several places or languages should not require another set of stored copies.

Judge improvements by both the website's download size and the total space occupied by the project. Do not describe smaller visitor downloads as space freed from the owner's allowance when the project has actually grown.

Unused uploads still belong to the owner and may be intended for later use. They must not be silently deleted. Helping owners identify and deliberately remove unused images is a separate choice from improving their image quality and size.

Processing also needs temporary room for replacements. A project close to its storage limit must be handled without losing working images or leaving unnecessary temporary copies behind.

## Direction agreed so far

- **Use an appropriate image size first.** A small card should not download an image intended for a full-width banner.
- **Optimize new uploads automatically.** No extra question or decision each time someone adds an image.
- **Balance original retention with storage limits.** Keeping the untouched source is useful, but retaining every original indefinitely is no longer a settled requirement.
- **Create only useful image versions.** Smaller downloads must not come at the cost of uncontrolled project growth.
- **Respect the kind of image.** Photographs, screenshots, logos and illustrations do not all tolerate the same changes.
- **Only replace an image with a lighter version when it is worthwhile.** A different format is not automatically an improvement.
- **Handle existing libraries as a separate feature.** Changing images already used across a project needs more care than preparing a new upload.
- **Start with a good automatic default.** Additional quality controls can wait until there is a demonstrated need.

## 1. Load the right size for the space

Start by improving how the theme chooses from the image sizes already available.

A small news card, a photograph filling the screen and the same photograph viewed on a phone have different needs. Visitors should receive an image suited to the space and screen, with enough detail to look sharp.

This should require no action from the website owner. They keep choosing and placing images as usual.

This is the first priority because it removes unnecessary downloads without asking people to accept lower image quality. Existing projects would receive theme improvements through the normal theme update process.

## 2. Optimize new uploads automatically

When someone uploads an image, Widgetizer prepares suitable versions for the website before the image is used anywhere.

The choice should depend on the image:

- Photographs can often become much smaller with little visible difference.
- Screenshots and graphics need sharp text, lines and edges.
- Logos and illustrations must keep transparent backgrounds where present.
- Moving images must keep their movement. Image types that do not benefit should be left alone.

If processing does not produce a useful saving at acceptable quality, keep the existing version rather than forcing a conversion.

Show a short result after upload, such as **“Images optimized: 4.2 MB → 480 KB.”** Report actual savings, not a promise made before processing.

### Keeping the original

Keeping the untouched upload lets the owner recover it and allows Widgetizer to prepare new website versions later without repeatedly reducing quality. However, keeping it alongside every generated version can substantially increase the project's storage needs. The earlier proposal to always retain originals needs revisiting before implementation.

The original should not be included in the exported website just because it is retained. Keeping it will use more project storage; the smaller website download and the space occupied by the project are different things.

Whether originals are always retained, optionally retained, or handled another way still needs discussion. The policy must be clear to the owner; discarding an original must not be a hidden consequence of optimization. Downloading or deliberately removing retained originals also remains to be decided.

## 3. Improve images already in a project

Later, add an **Optimize images** action to the Media page.

The owner sees an estimate of possible savings before starting, distinguishing smaller website downloads from space actually freed in the project. Widgetizer then shows progress and reports what changed, what was skipped and what could not be completed. The final saving may differ from the estimate.

This is more than converting a batch of files. Existing images may appear on many pages, in headers and footers, inside articles, in different languages, or in the website's business details. All those uses must keep working.

The owner's text, image descriptions, links and layout choices must stay intact. Website icons and images used when sharing a page must continue to work in their own roles.

### Safe to interrupt and recover

An interruption must not leave missing images or pages pointing to files that no longer exist. Keep the previous working images until their replacements and all affected uses are safely saved.

Editing during the operation must not lose recent changes. Whether editing briefly pauses or the work happens safely alongside it is still to be decided.

A project copy or backup must preserve the images needed to keep working, including retained originals.

After completion, explain that the owner needs to **export and publish again** for visitors to receive the smaller images. An already published website does not change automatically.

## What can wait

A possible future control is **Balanced / Highest quality / Smallest files**. We are not committing to adding it now. First establish a reliable automatic default and learn whether owners need more choice.

Specific image formats, processing methods and screens are also undecided. Those belong in a later implementation plan, once the intended experience is settled.

## Questions still open

- What counts as a worthwhile saving without an unacceptable change in appearance?
- Do some images need an individual “keep the original appearance” option?
- Where should owners download retained originals, and should deleting them be offered at all?
- Which image sizes are worth storing, and when should they be created?
- What original-retention policy balances future image quality with limited project space?
- How should optimization work when there is little free space for temporary replacements?
- How should the Media page distinguish website download size from total stored size?
- What should owners be able to edit while an existing library is being optimized?

## Proposed order

1. Fix unnecessary downloads by using the right image size in each place.
2. Optimize new uploads automatically, protecting image quality and settling how originals and useful sizes are stored.
3. Add a reliable way to optimize existing projects.
4. Revisit quality controls only if users need them.

Success means a lighter website, efficient use of the project's storage allowance, images that still look right, and no extra image-preparation chore for the owner.
