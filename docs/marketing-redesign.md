# GRID-X marketing redesign

This change replaces the five public marketing pages with a shared, monochrome design system and adds six useful public routes. Authenticated application pages, business workflows, API code, dependencies and database configuration are outside this change.

## Pages

| Route | Purpose and presentation |
| --- | --- |
| `/` | Product narrative with a selectable four-stage job workflow, evidence record, existing product film and role workspaces. |
| `/platform` | All six module groups, original module controls and supporting capabilities, presented as readable product stories and illustrative records. Existing module anchors are retained. |
| `/partners` | Partner workspace tabs, shop-floor benefits, drawing and material examples, five-step onboarding and a selected-KPI scorecard. |
| `/security` | Access controls, drawing grants, audit events, authentication and system boundaries. |
| `/pricing` | Pilot, Network and Group rollout scopes, one comparison table and completion checkpoints. The page describes rollout rather than inventing subscription prices. |
| `/solutions` | Production and engineering, quality and materials, and finance workflows with their records and decisions. |
| `/integrations` | Existing IMS, master-data import and CSV reporting capabilities with explicit system ownership. |
| `/resources` | Guide directory and an onboarding introduction. |
| `/resources/partner-onboarding` | Registration, capability, assessment, trial and approval. |
| `/resources/drawing-control` | Release, access scope, acknowledgement, revisions and access history. |
| `/resources/material-reconciliation` | Issue, receipt, consumption, returns, variance and invoice evidence. |

## Design and content

- Pure black page canvas, neutral surfaces, fine separators and restrained white actions.
- Inter for marketing headings and body text, with less compressed tracking and a smaller heading scale. Existing fonts are reused, so there is no new remote font dependency.
- Typography and page styles are scoped to the marketing layout. Operational application colors and screens retain their own styling.
- Distinct structures for distinct information: workflows use tabs, onboarding uses a step index, comparisons use a table, scores use proportional bars, history uses an event log and long reference content uses native disclosures.
- Existing product footage is retained in a bounded frame. Playback pauses off screen and in background tabs, respects reduced-motion preferences and has explicit play/pause controls.
- Preview data is labeled as illustrative. No new customer testimonials, certification badges, customer counts or performance guarantees are introduced.
- The navigation includes the new pages and remains available through the tablet breakpoint. Menus support keyboard operation, Escape and route changes.
- Native disclosures and existing Radix tabs/menu primitives provide keyboard interaction. Tables can scroll within their own container on small screens.

The visual references were [Attio](https://attio.com/), [Linear](https://linear.app/) and [Stripe](https://stripe.com/in). The implementation adapts product-led explanations, focused workflow examples, calm typography and clear page organization. It does not reuse their branding, copy or proprietary images.

## Review

The change is based on the complete source tree of main at `24ffdf004a5f34011b100c4b81918184f92b799e`. New source is contained in the marketing routes and marketing component directory.

The existing authentication destinations and module deep links remain connected. Guide detail routes are statically generated from the guide catalog; unknown guide slugs return a not-found response.

Browser and screenshot testing were not performed in this environment. Review the responsive pages and interactions in the deployment preview before publishing to production.
