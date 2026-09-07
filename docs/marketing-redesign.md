# GRID-X marketing redesign

This change replaces the five public marketing pages with a shared marketing design system and adds six useful public routes. Authenticated application pages, business workflows, API code, dependencies and database configuration are outside this change.

## Pages

| Route                                | Purpose and presentation                                                                                                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/`                                  | Original sculptural hero, selectable four-stage workflow, concise principles, product film and role workspaces.                                                                |
| `/platform`                          | Six module groups in one tabbed explorer, with short summaries and expandable controls. Existing module anchors select the relevant panel.                                     |
| `/partners`                          | Workshop hero, expandable shop-floor benefits, partner workspace, drawing/material/payment tabs, onboarding and selected-KPI scorecard.                                        |
| `/security`                          | Access controls, drawing grants, audit events, authentication and system boundaries.                                                                                           |
| `/pricing`                           | Pilot, Network and Group cards, expandable completion checkpoints and an optional full comparison table. The page describes rollout rather than inventing subscription prices. |
| `/solutions`                         | Production and engineering, quality and materials, and finance workflows with their records and decisions.                                                                     |
| `/integrations`                      | Existing IMS, master-data import and CSV reporting capabilities with explicit system ownership.                                                                                |
| `/resources`                         | An illustrated guide directory and photographic onboarding introduction.                                                                                                       |
| `/resources/partner-onboarding`      | Registration, capability, assessment, trial and approval.                                                                                                                      |
| `/resources/drawing-control`         | Release, access scope, acknowledgement, revisions and access history.                                                                                                          |
| `/resources/material-reconciliation` | Issue, receipt, consumption, returns, variance and invoice evidence.                                                                                                           |

## Design and content

- Porcelain white (`#fafbfd`) and pale slate surfaces, charcoal feature sections (`#182230`), blue actions (`#3e5fa2`) and restrained copper accents. Semantic colors are scoped to marketing, including nested dark panels and the navigation menu.
- Inter Tight headlines and Inter body copy reuse the installed font families. Larger section spacing, shorter introductions and fewer repeated sections reduce visual density.
- Three original manufacturing images are shared across relevant heroes, guide cards and articles. Local WebP assets total approximately 351 KiB; Next Image reserves dimensions, prioritizes primary hero images and lazily loads the remaining visuals.
- Slow blue/copper signals run along fine background lines in page heroes and closing sections. Motion pauses off screen, in hidden tabs, for the OS reduced-motion preference or through the footer pause control.
- The product film retains explicit play/pause controls, off-screen pausing and reduced-motion handling. Its grayscale filter is removed.
- Product modules, partner records and role workspaces show one topic at a time. Full controls and feature comparisons remain accessible through native disclosures.
- All illustrative records remain labeled. Images depict conceptual manufacturing scenes, not named customers. No customer testimonials, certifications or performance guarantees are invented.
- Existing Radix tabs and menus retain keyboard behavior. Responsive layouts stack stories, wrap navigation controls and contain table overflow.
- Application screens, APIs, dependencies and business logic are outside this update.

## Image sources

These original images were generated for this redesign and converted to WebP without changing their compositions. They are illustrative brand assets, not documentary evidence of a real customer facility.

| Asset                                           | Generation brief                                                                                                                                                  | Use                                                                  |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `public/media/marketing/network-sculpture.webp` | Precision-machined silver modules connected by blue glass and copper paths; charcoal studio, right-weighted composition, no text or logos.                        | Home and integration heroes, guide and rollout imagery.              |
| `public/media/marketing/partner-workshop.webp`  | Clean Indian machining workshop; a worker in ordinary protective eyewear reviews a tablet beside an idle CNC machine; soft daylight, slate workwear and no logos. | Partner and solution heroes, onboarding and guide features.          |
| `public/media/marketing/precision-detail.webp`  | A precision shaft, caliper and blue/copper components on a pale workbench; premium macro photography, no logos.                                                   | Product/security heroes, rollout preparation and engineering guides. |

The visual references were [Attio](https://attio.com/), [Linear](https://linear.app/) and [Stripe](https://stripe.com/in). The implementation adapts product-led explanations, focused workflow examples, calm typography and clear page organization. It does not reuse their branding, copy or proprietary images.

## Review

The change is based on the complete source tree of main at `5397740a2fbf5ae96a7b40ddf42cc7a4872727e8` (the merge of PR #14). New source is contained in the marketing routes and marketing component directory.

The existing authentication destinations and module deep links remain connected. Guide detail routes are statically generated from the guide catalog; unknown guide slugs return a not-found response.

Production build includes lint and TypeScript checks. Local media references and source whitespace are checked separately. Browser and screenshot testing were not performed in this environment.
