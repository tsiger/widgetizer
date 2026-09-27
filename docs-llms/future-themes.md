# Future themes and Arch presets

> **Status: Proposal.** Recorded on 2026-09-27. These are candidate directions, not an approved roadmap or proof of market defensibility.

## Recommendation

Explore **workshops and small manufacturers** first. This adds a distinct website job: **show what we can make, demonstrate our capabilities, and receive a quote enquiry**.

Architecture/interiors and therapy/rehabilitation should initially be explored as additional **Arch presets**, rather than automatically becoming separate themes. Education/training and tours/experiences are further candidates with more specialised content requirements.

The selection principle is to help visitors evaluate a particular business through its work, expertise, approach, and suitability. A sector having a plausible need for a website does not, by itself, establish a defensible market for Widgetizer.

## Existing coverage

The catalogue review identified 31 named Arch designs. The repository preset registry also includes a Blank starting option.

Relevant existing coverage includes:

| Existing preset | Current target |
| --- | --- |
| Bedrock | General contractors, including renovation businesses |
| Ledgerworks | Accounting firms |
| Everafter | Wedding planners |
| Framelight | Photographers |
| Hearthstone | Hotels and bed-and-breakfasts |
| Brightside | Dental practices |
| Little Oaks | Daycares and preschools |
| Greenfield | Landscaping businesses |
| Pixelcraft | Graphic designers |
| Arch / Clearpath | Consulting firms and independent consultants |

These sectors are not catalogue gaps. A new direction should offer a genuinely different information structure or customer task, not just a different colour palette.

## 1. Workshops and small manufacturers

**Audience:** furniture makers, metal fabricators, machining workshops, and small bespoke manufacturers.

**Website job:** demonstrate whether the business can make what the customer needs, then turn that interest into a qualified enquiry.

**Suggested pages and content:**

- Capabilities and services, including materials, processes, and supported project types.
- Completed projects with photographs, requirements, and explanations of the work.
- Product or product-family pages without mandatory checkout.
- Specifications and downloadable documents where relevant.
- About the workshop, facilities, genuine certifications, and a quote-enquiry page.

**Starter presets:** furniture/cabinetry, metalwork/fabrication, and small-scale bespoke manufacturing.

**Scope boundary:** catalogue and enquiry first. Do not turn the theme into inventory management, manufacturing software, or a compulsory ecommerce solution.

**Theme or preset:** strongest candidate for a new theme family. Prototype with Arch first and identify any actual missing layouts or widgets before committing to a separate codebase.

## 2. Architecture and interiors

**Audience:** architects, interior designers, and landscape architects.

**Website job:** help prospective clients judge the practice's work, design approach, and suitability for their project.

**Suggested pages and content:** a project index; detailed project stories with photography, plans, materials, location, and project type; studio and team profiles; services and process; awards or publications where genuine; project enquiries.

**Difference from existing coverage:** Framelight addresses photography and Greenfield addresses landscaping services. This direction should centre on explaining designed spaces and project decisions, rather than simply presenting an image gallery.

**Theme or preset:** Arch preset first. Consider a separate theme only when the portfolio's layout and interaction requirements materially exceed Arch's shared system.

## 3. Education and training

**Audience:** language schools, music schools, tutoring centres, and vocational trainers.

**Website job:** let students or parents compare programmes, understand suitability, and enquire about enrolment.

**Suggested pages and content:** course listings and detail pages; levels, age groups, prerequisites, duration, fees, and start dates; teacher profiles; published schedules; facilities; frequently asked questions; enrolment enquiries.

**Difference from existing coverage:** Little Oaks addresses preschool/daycare. A course-led information structure is a different requirement.

**Scope boundary:** a school or training-provider website, not a learning-management system. Publishing a timetable does not imply real-time enrolment, capacity management, or student accounts.

**Theme or preset:** test whether course-focused templates and reusable content structures justify a dedicated family. Do not decide solely from the sector label.

## 4. Therapy and rehabilitation

**Audience:** psychologists, physiotherapists, speech therapists, and occupational therapists.

**Website job:** explain who the practitioner helps, their approach and qualifications, and what a first visit involves.

**Suggested pages and content:** practitioner profiles; services and specialisms; treatment approach; first-visit information; fees; accessibility and location details; frequently asked questions; contact or external appointment links.

**Difference from existing coverage:** Brightside addresses dentistry. This direction needs practitioner-led information and careful explanations of the service, rather than a dental demo with replacement photographs.

**Scope boundary:** an informational practice website, not patient records, clinical intake, or a practice-management system. Keep ordinary enquiry forms focused on contact requests rather than detailed clinical histories.

**Theme or preset:** Arch preset first.

## 5. Tours and experiences

**Audience:** local guides, sailing operators, hiking companies, and cooking-class providers.

**Website job:** explain a specific experience well enough for a visitor to enquire or proceed to a booking provider.

**Suggested pages and content:** experience listings; itineraries; duration; meeting points; inclusions and exclusions; equipment or participation requirements; guide profiles; photographs; cancellation information; enquiries or external booking links.

**Difference from existing coverage:** Hearthstone addresses accommodation, not itinerary-led activities.

**Scope boundary:** do not make the theme responsible for live inventory, payments, or booking operations. Start with enquiries and links to existing providers; assess integrations separately.

**Theme or preset:** candidate for a dedicated family if repeated itinerary and experience-detail requirements warrant it.

## Delivery and validation

Build one representative workshop/manufacturer demo before expanding into several variants. Use it to test whether a business can present its capabilities and receive an appropriate enquiry without substantial customisation.

For every candidate, identify the missing page structures and components, reuse existing widgets where they fit, and provide realistic multipage starter content. A standalone theme should earn its additional maintenance burden through meaningful structural differences.

Validate owner demand, competing options, willingness to pay, setup difficulty, and ongoing update needs before treating any direction as a commercial priority. The catalogue review establishes coverage gaps; it does not establish market size, conversion rates, or immunity to AI builders and marketplaces.

## Sources and implementation references

The following sources were reviewed earlier in the discussion. This document records those findings and recommendations; it is not a new market study.

- [Widgetizer designs catalogue](https://widgetizer.org/designs): public preset names and sector descriptions.
- [Arch preset registry](../themes/arch/presets/presets.json): repository preset IDs and descriptions.
- [Theme presets](theme-presets.md): distinction between shared theme infrastructure and preset-specific settings/content.
- [Theme preset authoring process](theme-preset-process.md): implementation workflow for future approved presets.

Relative links assume this file is placed in `docs-llms/`.

The proposed audiences, page structures, priority, and scope boundaries above are product recommendations, not findings from a new sector-level market study.
