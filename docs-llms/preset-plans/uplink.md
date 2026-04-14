# Uplink — IT Support

## Phase 0 — Industry Strategy Brief

- **Business archetype:** Local lead-gen service business. Managed IT support and computer repair for small businesses and home offices. Recurring monthly contracts plus ad-hoc repair/troubleshooting work. 3–8 person operation covering a metro area.

- **Primary conversion:** Phone call or service request form. IT problems are often urgent — the visitor needs to know they can reach someone fast. Secondary: managed services inquiry for ongoing contracts.

- **Trust mechanism:** Response time, competence clarity, and process transparency. Visitors are usually stressed (something is broken or they are worried about security). Trust comes from: clear explanation of what you do, proof you respond quickly, credentials/certifications, and real client testimonials from other small businesses. No one wants to hand their network to someone they are not sure about.

- **Decision mode:** Urgent or semi-urgent. When something breaks, the decision is fast — who can fix it today? For managed services contracts, the decision is more considered but still driven by competence and reliability rather than aesthetics. Price matters but responsiveness matters more.

- **Brand personality:** Competent, direct, and reliable. Not flashy, not corporate-stuffy, not startup-trendy. The site should feel like a capable person who shows up on time, explains the problem clearly, and fixes it. Professional but human. Blue-collar professionalism applied to white-collar problems.

- **Content posture:** Process-led and offer-led. The site must clearly explain what services are available, how the process works, and how to get help fast. Images support but do not lead — this is not a visual business. Structure, clarity, and responsiveness carry the site.

- **Audience model:** Two audiences with different urgency levels. (1) Small business owners/office managers who need ongoing IT support — managed services, network setup, security monitoring. They are evaluating providers. (2) Anyone with an urgent problem — computer down, network issue, data recovery, virus. They need help now.

- **Required page jobs:**
  - **Home** — Establish competence fast, surface core services, show responsiveness proof, drive to contact
  - **Services** — Explain each service clearly with enough detail to build confidence. Both managed (recurring) and break-fix (ad-hoc) services need separate treatment.
  - **About** — Team credentials, certifications, years in business, service area. This is a trust page for the considered-decision audience.
  - **Contact** — Phone number prominent, service request context, service area, business hours, FAQ for common questions

- **No-go patterns:**
  - Startup/tech-bro aesthetic (gradients, abstract shapes, "innovation" language)
  - Overly corporate enterprise feel (this is a local business, not IBM)
  - Dark moody photography (the mood should be clear, bright, capable)
  - Vague service descriptions ("solutions" without saying what you actually do)
  - Buried contact information — phone number must be immediately accessible

- **Opener candidates:**
  - Direct banner with clear value proposition and phone number — "IT breaks, we fix it" energy. The visitor should know what this business does and how to reach them within 3 seconds.
  - Split-hero with service overview on one side, trust proof on the other

- **Closing pattern:** Strong CTA with phone number. Every page should end with a clear path to contact — either a dedicated action-bar or inline contact info. The urgency audience needs the phone number on every page close.

---

## Phase 1 — Full Plan

### Identity

- **Preset ID:** uplink
- **Name:** Uplink
- **Industry:** IT Support
- **Tagline:** IT support for small businesses and home offices in Portland

### Industry Translation

Uplink is a 6-person IT support company in Portland, Oregon. They handle managed IT services (monthly contracts for small businesses) and break-fix work (ad-hoc troubleshooting, repairs, data recovery). The site must feel competent and fast. The visitor is either evaluating providers (considered) or panicking because something broke (urgent). Both audiences need to see what Uplink does, how fast they respond, and how to reach them — within seconds.

### Sitemap Rationale

4 pages:

| Page | Slug | Job |
|------|------|-----|
| Home | index | Establish competence, surface services, prove responsiveness, drive to contact |
| Services | services | Full service breakdown — managed and break-fix, clearly separated |
| About | about | Team credentials, certifications, service area, company story |
| Contact | contact | Phone, email, hours, service area map, FAQ |

4 pages is right for this business. There is no portfolio to show, no menu to browse, no rooms to tour. The visitor needs to know what Uplink does, trust them, and call.

### preset.json Settings

**Colors — Standard (clean white):**
- `standard_bg_primary`: #ffffff
- `standard_bg_secondary`: #f4f6f8
- `standard_text_heading`: #111827
- `standard_text_content`: #374151
- `standard_text_muted`: #6b7280
- `standard_border_color`: #e5e7eb
- `standard_accent`: #2563eb
- `standard_accent_text`: #ffffff
- `standard_rating_star`: #f59e0b

**Colors — Highlight (dark blue-gray):**
- `highlight_bg_primary`: #111827
- `highlight_bg_secondary`: #0a0f1a
- `highlight_text_heading`: #ffffff
- `highlight_text_content`: #d1d5db
- `highlight_text_muted`: #9ca3af
- `highlight_border_color`: #374151
- `highlight_accent`: #60a5fa
- `highlight_accent_text`: #111827
- `highlight_rating_star`: #f59e0b

**Typography:**
- `heading_font`: "Barlow", sans-serif — weight 600
- `body_font`: "Source Sans 3", sans-serif — weight 400

**Style:**
- `corner_style`: sharp
- `spacing_density`: default
- `button_shape`: sharp

### Header Configuration

- `logoText`: "Uplink"
- `contactDetailsLine1`: "(503) 555-0142"
- `contactDetailsLine2`: ""
- `contact_position`: "header"
- `ctaButtonLink`: { href: "contact.html", text: "Get Help Now", target: "_self" }
- `ctaButtonStyle`: "primary"
- `center_nav`: false
- `full_width`: true
- `sticky`: true
- `transparent_on_hero`: true
- `color_scheme`: "highlight-primary"

Rationale: Phone number in the header — the urgent audience needs it immediately. Sticky keeps it always visible. Transparent on hero for the banner opener. Sharp buttons match the no-nonsense personality.

### Footer Configuration

- Layout: first-featured
- Color scheme: highlight-primary
- Copyright: "© 2026 Uplink IT. All rights reserved."
- Blocks:
  1. `logo_text` — "IT support for small businesses and home offices in Portland, Oregon. Managed services, troubleshooting, and same-day repairs."
  2. `text_block` — "Reach Us" with phone, email, hours
  3. `menu_block` — "Navigate"
  4. `social_block` — "Follow"

### Page Strategy

#### Home (index) — 6 widgets

| # | Widget | Type | Color Scheme | Purpose |
|---|--------|------|-------------|---------|
| 1 | hero_banner | banner | highlight-primary | Direct value prop + phone + CTA |
| 2 | who_we_help | features-split | standard-primary | Two audiences: businesses + home offices |
| 3 | services_overview | icon-card-grid | standard-secondary | 6 core services at a glance |
| 4 | how_it_works | steps | standard-primary | 3-step process: Call → Diagnose → Fix |
| 5 | client_reviews | testimonials | highlight-primary | 3 small-business client reviews |
| 6 | home_cta | action-bar | highlight-secondary | Phone number + CTA |

**hero_banner** — Height: medium, fullwidth: true, alignment: start, content_width: medium. Heading 6xl: "IT Support That Shows Up". Text: "Managed services, troubleshooting, and same-day repairs for small businesses and home offices in Portland." Two buttons: "Get Help Now" (primary) → contact.html, "Our Services" (secondary) → services.html.

**who_we_help** — features-split. Eyebrow: "Who We Help". Title: "IT Support Built for Small Teams". content_position: start, show_divider: true, icon_style: filled, icon_size: lg, icon_shape: sharp. 2 features:
1. icon: building / "Small Businesses" / Monthly managed IT, network monitoring, security, and help desk for teams of 5 to 50.
2. icon: home / "Home Offices" / Workstation setup, troubleshooting, data backup, and on-call support for remote workers and freelancers.

**services_overview** — icon-card-grid, 6 cards, columns: 3, card_layout: flat, alignment: center, no subtitles, no buttons. Eyebrow: "What We Do", Title: "Core Services".
1. icon: server / "Managed IT" / Proactive monitoring, maintenance, and help desk for a fixed monthly rate.
2. icon: shield-lock / "Cybersecurity" / Firewall management, endpoint protection, threat monitoring, and security audits.
3. icon: cloud / "Cloud Services" / Microsoft 365 management, cloud backups, and migration from on-premise systems.
4. icon: wifi / "Network Setup" / Office Wi-Fi, cabling, switches, routers, and VPN configuration.
5. icon: device-desktop / "Computer Repair" / Hardware diagnostics, component replacement, OS reinstalls, and data recovery.
6. icon: headset / "Help Desk" / Same-day remote and on-site support when something breaks or stops working.

**how_it_works** — steps, 3 steps, no images, no buttons. Heading_alignment: center. Title: "How It Works".
1. "Call or Submit a Request" / You tell us what is going on. We ask a few questions to understand the scope and urgency.
2. "We Diagnose the Problem" / Remote or on-site, we identify the root cause — not just the symptom. You get a clear explanation before we proceed.
3. "We Fix It" / We resolve the issue and confirm everything is working. For managed clients, we document the fix and update your system profile.

**client_reviews** — 3 testimonials, grid, columns: 3, card_layout: box. Eyebrow: "Clients". Title: "What They Say".

**home_cta** — "Need IT Help?" / "(503) 555-0142 — call us or submit a request online." / "Contact Us" → contact.html.

#### Services (services) — 4 widgets

| # | Widget | Type | Color Scheme | Purpose |
|---|--------|------|-------------|---------|
| 1 | services_banner | banner | highlight-primary | Page opener |
| 2 | managed_services | numbered-service-list | standard-primary | Managed (recurring) services |
| 3 | breakfix_services | numbered-service-list | standard-secondary | Break-fix (ad-hoc) services |
| 4 | services_cta | action-bar | highlight-primary | CTA |

**services_banner** — Height: small, alignment: center, content_width: medium. Heading: "Our Services". Text: "Managed IT for ongoing support. Break-fix for when something goes wrong."

**managed_services** — numbered-service-list, show_numbers: true, show_dividers: true, heading_alignment: start. Eyebrow: "Monthly Plans", Title: "Managed IT Services". 4 services:
1. "Proactive Monitoring" / We watch your systems around the clock. Server health, disk space, failed logins, patch status — if something drifts, we catch it before it becomes a problem. Links to contact.
2. "Help Desk Support" / Unlimited remote support for your team during business hours. Password resets, software issues, printer problems, email trouble — one number to call for everything. Links to contact.
3. "Cybersecurity Management" / Firewall configuration, endpoint protection, email filtering, and quarterly security reviews. We keep your business protected without you having to think about it. Links to contact.
4. "Cloud and Backup" / Microsoft 365 administration, cloud backup management, and disaster recovery planning. Your data is always recoverable, your tools are always running. Links to contact.

**breakfix_services** — numbered-service-list, show_numbers: true, show_dividers: true, heading_alignment: start. Eyebrow: "As-Needed", Title: "Break-Fix Services". 4 services:
1. "Computer Repair" / Hardware diagnostics, component replacement, SSD upgrades, and OS reinstalls. We fix desktops, laptops, and workstations — most repairs same-day. Links to contact.
2. "Network Troubleshooting" / Slow Wi-Fi, dropped connections, switch failures, VPN issues. We diagnose and resolve network problems on-site. Links to contact.
3. "Data Recovery" / Deleted files, failed drives, corrupted backups. We recover what we can and set up systems to prevent it from happening again. Links to contact.
4. "New Office Setup" / Workstation deployment, network cabling, printer setup, and user onboarding. We get your new space running from day one. Links to contact.

**services_cta** — "Not Sure What You Need?" / "Call us and we will figure it out together. No jargon, no pressure." / "Call (503) 555-0142" → tel link.

#### About (about) — 4 widgets

| # | Widget | Type | Color Scheme | Purpose |
|---|--------|------|-------------|---------|
| 1 | about_banner | banner | highlight-primary | Page opener |
| 2 | company_story | image-text | standard-primary | Who we are |
| 3 | trust_numbers | key-figures | standard-secondary | Trust stats |
| 4 | about_cta | action-bar | highlight-primary | CTA |

**about_banner** — Height: small, alignment: center. Heading: "About Uplink". Text: "Six people, one van, and every tool we need."

**company_story** — image_position: end. Heading: "Local IT, Done Right". Body about the team — started in 2016, grew from a solo freelancer to 6 technicians, serve Portland metro, CompTIA and Microsoft certified, background-checked, direct and honest communication.

**trust_numbers** — key-figures, 4 figures, grid, columns: 4, flat, animate: true. top_spacing: small, bottom_spacing: small.
1. 8 / " years" / "In Business"
2. 340 / "+" / "Clients Served"
3. 98 / "%" / "Same-Day Resolution"
4. 15 / " min" / "Avg Response Time"

**about_cta** — "Let's Talk" / "Whether you need ongoing support or a one-time fix, we are here to help." / "Get in Touch" → contact.html.

#### Contact (contact) — 3 widgets

| # | Widget | Type | Color Scheme | Purpose |
|---|--------|------|-------------|---------|
| 1 | contact_info | rich-text | standard-primary | Phone, email, hours |
| 2 | location_map | map | standard-primary | Map + info sidebar |
| 3 | contact_faq | accordion | standard-secondary | FAQ with info sidebar |

**contact_info** — text_alignment: center, content_width: medium. Heading: "Get in Touch". Body: phone, email, hours in separate paragraphs. Button: "Call Now" → tel link.

**location_map** — Address: "2847 SE Hawthorne Blvd, Portland, OR 97214". Height: medium, sidebar_position: end. Info block: "Service Area" — Portland metro including Beaverton, Lake Oswego, Tigard, Hillsboro, and Gresham.

**contact_faq** — 5 items, style: separated, heading_alignment: start, sidebar_position: start. Eyebrow: "FAQ", Title: "Common Questions". Sidebar info block: "Emergency?" with phone number.
1. "How fast can you get here?" — For managed clients, remote support begins within 15 minutes. On-site visits are typically same-day. Break-fix clients are scheduled based on availability, usually within 24 hours.
2. "What does managed IT cost?" — Plans start at $99 per user per month and include monitoring, help desk, security, and backups. We scope every plan to the client — no two are exactly alike.
3. "Do you support Mac and Linux?" — Yes. Our team supports Windows, macOS, and common Linux distributions. Most of our managed clients run Windows, but we handle mixed environments regularly.
4. "What happens if something breaks after hours?" — Managed clients with a priority support plan have access to our emergency line 24/7. Break-fix clients are served during business hours.
5. "Do you work with home offices?" — Yes. We support remote workers, freelancers, and anyone who works from home and needs reliable IT. Same services, same response time.

### Menus

**Main menu:** Home, Services, About, Contact
**Footer menu:** Home, Services, About, Contact

### Widget Usage Summary

| Widget | Count | Pages |
|--------|-------|-------|
| banner | 4 | Home, Services, About, Contact (opener on all) |
| features-split | 1 | Home |
| icon-card-grid | 1 | Home |
| steps | 1 | Home |
| testimonials | 1 | Home |
| action-bar | 4 | Home, Services, About, Contact |
| numbered-service-list | 2 | Services (×2) |
| image-text | 1 | About |
| key-figures | 1 | About |
| rich-text | 1 | Contact |
| map | 1 | Contact |
| accordion | 1 | Contact |

**Total: 12 unique widget types, 19 widget instances across 4 pages.**

**Underused widgets used naturally:**
1. features-split — Two-audience split (businesses vs home offices) on homepage
2. numbered-service-list — Used twice on services page to clearly separate managed vs break-fix offerings

### Differentiation Notes

- **Opener:** Direct, left-aligned banner with dual CTAs (urgent + considered). No slideshow, no cinematic imagery. The first fold is about information, not atmosphere.
- **Color palette:** Clean white + strong blue accent. Technology-appropriate, trust-signaling. No warm tones — this is a capability site, not an atmosphere site.
- **Typography:** Barlow (sans, 600) + Source Sans 3 (sans, 400). Both sans-serif — deliberate for a tech business. Barlow's slight condensation gives headings a technical, efficient feel.
- **Style:** Sharp corners, default spacing, sharp buttons. No roundness anywhere — this business is direct and efficient.
- **Page structure:** Only 4 pages — lean, purposeful, no padding. Services page uses two numbered-service-lists to clearly separate recurring and ad-hoc offerings.
- **Header:** Phone number visible in header at all times. This is the single most important UX decision for an IT support site.
- **Closing pattern:** Every page ends with phone number in the action-bar. The urgent visitor can always see how to call.
