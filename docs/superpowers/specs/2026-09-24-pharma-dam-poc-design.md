# Sun Pharma DAM POC — Design Spec

**Date:** 2026-09-24
**Catalyst project:** `PharmaPOC` (id `21268000035138541`, org `60047188586`, env: Development)
**Author:** prashaanth.r (via Claude Code)
**Terminology source:** `Sun_Pharma_DMS_Taxonomy_Consulting_Deck.pdf` (Sun Pharma's own DMS Taxonomy
Blueprint) — this demo's taxonomy, metadata model, AI-classification pipeline, and governance
language are deliberately adapted from that deck so the demo speaks back Sun Pharma's own
vocabulary rather than generic DAM terms.

## 1. Purpose

Sun Pharma issued an RFP asking vendors to present and demo a Digital Asset
Management (DAM) solution for their Emerging Markets rollout. This spec
covers a **working interactive demo** built on Catalyst by Zoho — not a
static mockup — that a presenter can click through live to show core DAM
capability. It intentionally does not attempt to cover every RFP bullet;
it covers the highest-value, most-differentiating ones for real, and the
rest are called out explicitly (§7) as narrated/deck-only or roadmap.

No authentication is required — a role-switcher on load lets the presenter
jump between personas instantly.

**Scope note:** the source deck describes an enterprise **DMS** taxonomy for
GxP-regulated documents (Quality, Regulatory, R&D, Manufacturing, Clinical,
PV, Corporate). Our demo is a **DAM** for marketing/medical/training/corporate
*creative* assets (images, videos, brochures, decks), per the original RFP.
We are not rebuilding a GxP document system — we are reusing the deck's
taxonomy *structure* (six dimensions, metadata facet groups, AI-classification
pipeline, governance layer) and applying it to our creative-asset domain,
because that structure is what Sun Pharma will recognize as "speaking their
language."

## 2. Personas

| Persona | Represents | Access | Deck-governance analogue |
|---|---|---|---|
| Brand/Marketing Manager | Uploads and manages marketing/medical/training/corporate assets | Full CRUD on own uploads, submit for review | Domain Owner (Marketing function) |
| Reviewer/Approver (MLR/Compliance) | Reviews assets before publication | Approve/reject, annotate, delegate | Domain Owner / Compliance sign-off |
| Admin | IT/DAM administrator | Manage users, taxonomy, view analytics & full audit trail | DMS Product Team + Metadata Steward |
| Agency/Field/External Viewer | External agency or field rep in an EM country | Read-only, scoped to Published assets in their market/brand | — (consumer, no governance role) |

## 3. Architecture

- **Frontend:** React SPA hosted on Catalyst **Slate**. A persona picker on
  first load sets `role` in app state (localStorage-backed); no login.
- **API:** Node.js **Advanced I/O Functions** (Express) with public routes
  (no Security Rules — no auth in this POC). Each endpoint accepts a `role`
  parameter and server-side filters what it returns/allows, so access
  scoping is real even without a login system.
- **Data:** Catalyst **Data Store** (ZCQL) is the source of truth for all
  metadata, workflow, versions, annotations, and usage — real reads/writes,
  not mocked.
- **Files:** Catalyst **Stratus** bucket `pharmapoc-assets` stores actual
  sample asset files and any file uploaded live during the demo. Upload
  goes through a Function that writes to Stratus and inserts the resulting
  URL into `Assets`.
- **AI classification suggestions:** pre-canned per sample file for this POC
  (not a live Zia call) — see the Classify/Enrich stages in §4.3. The data
  model doesn't preclude wiring in a real Zia Object Detection/OCR call
  later; it would just replace the source of the suggested values.

## 4. Taxonomy & Metadata Model (adapted from the Sun Pharma DMS deck)

### 4.1 Six-dimension taxonomy

The deck's target taxonomy architecture (Function → Process → Document Type →
Product → Site/Market → Lifecycle Metadata) maps onto our creative-asset
world as follows:

| Dimension | DMS deck meaning | Our DAM meaning | Example values |
|---|---|---|---|
| **L1 Function** | Owning business function | Owning business function | Marketing, Medical Affairs, Training & Learning, Corporate Communications |
| **L2 Process** | Business process (Deviation, CAPA, Submission…) | The initiative/workflow the asset serves | Product Launch, Campaign, Medical Education, Congress/Event, Field Enablement, Onboarding |
| **L3 Document/Asset Type** | SOP, Protocol, Report… | Creative asset format | Image, Video, Brochure, Detail/Visual Aid, Presentation, Social Post, Packaging Artwork, Press Release |
| **L4 Product** | Brand, Molecule, Dosage form | Same, directly reusable | Brand, Molecule/Generic Name, Therapeutic Area, Dosage Form |
| **L5 Site/Market** | Manufacturing site, Regulatory market | Same, directly reusable | Market/Country, Region |
| **L6 Lifecycle Metadata** | GxP, Version, Status, Retention | Same, directly reusable | Status, Version, Owner, Effective Date, Retention, Confidentiality |

This replaces the flat `CATEGORY` field from the original draft with explicit
`FUNCTION` and `PROCESS` columns, and reframes `STATUS`/`CURRENT_VERSION`/
`UPLOADED_BY`/`EXPIRY_DATE` as the "Lifecycle Metadata" facet group — same
data, deck-aligned naming.

### 4.2 Metadata model facet groups

Per the deck's Metadata Model slide (Identity / Business / Product / Location
/ Compliance / Lifecycle), the `Assets` table columns below are grouped into
the same six facets for the UI's "Asset Detail" metadata panel:

| Facet | Fields |
|---|---|
| **Identity** | Asset ID, Name, Asset Type, Version |
| **Business** | Function, Process, Owner (Uploaded By), Approver |
| **Product** | Brand, Molecule/Generic Name, Therapeutic Area |
| **Location** | Market, Region |
| **Compliance** | Usage Rights, Confidentiality, Language |
| **Lifecycle** | Status, Effective Date, Expiry/Retention, Review Date |

### 4.3 AI-assisted classification pipeline

The deck's six-stage pipeline (Ingest → Extract → Classify → Enrich →
Validate → Publish) becomes the literal, visible steps of our Upload flow —
shown as a stepper in the UI, not just a backend detail:

| Stage | What happens in the demo |
|---|---|
| **1. Ingest** | File selected and uploaded to Stratus |
| **2. Extract** | Basic file signals captured (type, size, dimensions) |
| **3. Classify** | Pre-canned suggestion of Function / Process / Asset Type |
| **4. Enrich** | Pre-canned suggestion of Product / Market / Tags |
| **5. Validate** | Brand Manager confirms/edits metadata; Reviewer approves — this is the deck's control model: *"AI suggests → business owner confirms → workflow applies → audit trail records"* |
| **6. Publish** | Status moves to Published; asset becomes visible to the Agency/Field Viewer |

### 4.4 Governance layer (Admin persona)

The Admin page's taxonomy screen is framed using the deck's governance roles
so the demo narrates real DAM governance, not just a CRUD screen:

- **Controlled vocabularies** (deck principle #3) = our Tags/Categories
  management screen — Admin edits the approved value list, not free text.
- **Metadata Stewards** = the Admin persona's role when managing `Tags`/taxonomy.
- **Domain Owners** = Brand Manager (Marketing) and Reviewer (Compliance)
  personas, shown as a small governance diagram on the Admin page for
  narrative purposes only (no separate table/logic).

## 5. Data Model (Catalyst Data Store)

### Assets
| Column | Facet (§4.2) | Type | Notes |
|---|---|---|---|
| ASSET_ID | Identity | Auto Number | PK |
| NAME | Identity | Text | |
| DESCRIPTION | Identity | Text | |
| ASSET_TYPE | Identity (L3) | Text | Image / Video / Brochure / Detail Aid / Presentation / Social Post / Packaging Artwork / Press Release |
| FUNCTION | Business (L1) | Text | Marketing / Medical Affairs / Training & Learning / Corporate Communications |
| PROCESS | Business (L2) | Text | Product Launch / Campaign / Medical Education / Congress-Event / Field Enablement / Onboarding |
| BRAND | Product (L4) | Text | |
| THERAPEUTIC_AREA | Product (L4) | Text | |
| MARKET | Location (L5) | Text | EM country |
| LANGUAGE | Compliance | Text | Content language (UI stays English) |
| USAGE_RIGHTS | Compliance | Text | Internal / External / Licensed |
| STATUS | Lifecycle (L6) | Text | Draft / UnderReview / Approved / Published (Effective) / Archived (Obsolete) |
| CURRENT_VERSION | Lifecycle (L6) | Number | |
| EFFECTIVE_DATE | Lifecycle (L6) | DateTime | Set when Published |
| EXPIRY_DATE | Lifecycle (L6) | DateTime | Rights/retention expiry |
| FILE_URL | — | Text | Stratus object URL |
| THUMBNAIL_URL | — | Text | |
| UPLOADED_BY | Business (L1) | Text | Persona name (Owner) |
| CREATED_TIME | — | DateTime | |

### Tags
| Column | Type | Notes |
|---|---|---|
| TAG_ID | Auto Number | PK |
| TAG_NAME | Text | |
| TAG_CATEGORY | Text | Therapeutic Area / Product / Campaign / Content Type |

### AssetTags (join)
| Column | Type |
|---|---|
| ASSET_ID | Lookup → Assets |
| TAG_ID | Lookup → Tags |

### ApprovalWorkflow
| Column | Type | Notes |
|---|---|---|
| LOG_ID | Auto Number | PK |
| ASSET_ID | Lookup → Assets | |
| ACTION | Text | Submitted / Approved / Rejected / Published / Archived / Delegated |
| ACTOR_PERSONA | Text | |
| ACTOR_ROLE | Text | |
| COMMENTS | Text | |
| TIMESTAMP | DateTime | |

### AssetVersions
| Column | Type | Notes |
|---|---|---|
| VERSION_ID | Auto Number | PK |
| ASSET_ID | Lookup → Assets | |
| VERSION_NUMBER | Number | |
| FILE_URL | Text | |
| CHANGED_BY | Text | |
| CHANGE_NOTES | Text | |
| CREATED_TIME | DateTime | |

### Annotations
| Column | Type | Notes |
|---|---|---|
| ANNOTATION_ID | Auto Number | PK |
| ASSET_ID | Lookup → Assets | |
| X_PERCENT | Decimal | For image pin position |
| Y_PERCENT | Decimal | |
| TIMESTAMP_SEC | Number | For video annotations, null for images |
| COMMENT | Text | |
| AUTHOR_PERSONA | Text | |
| CREATED_TIME | DateTime | |

### UsageLog
| Column | Type | Notes |
|---|---|---|
| LOG_ID | Auto Number | PK |
| ASSET_ID | Lookup → Assets | |
| ACTION | Text | View / Download / Shared |
| PERSONA | Text | |
| CHANNEL | Text | e.g. Website-India, SharePoint, Field Rep App |
| TIMESTAMP | DateTime | |

### Personas
| Column | Type | Notes |
|---|---|---|
| PERSONA_ID | Auto Number | PK |
| NAME | Text | |
| ROLE | Text | Brand Manager / Reviewer / Admin / Agency Viewer |
| MARKET | Text | |

## 6. API Surface (Functions, indicative)

- `GET /assets?role=&search=&tags=&function=&process=&brand=&market=&status=` — smart search/filter, role-scoped, across all six taxonomy dimensions
- `POST /assets` — Stage 1 **Ingest**: uploads file to Stratus, creates Draft asset
- `GET /assets/:id/suggestions` — Stages 2-4 **Extract/Classify/Enrich**: returns pre-canned Function/Process/Asset Type/Product/Market/Tag suggestions for the uploaded file
- `GET /assets/:id` — detail incl. tags, versions, annotations, approval history, grouped by metadata facet (§4.2)
- `POST /assets/:id/submit` — Stage 5 **Validate** (part 1): Draft → UnderReview, logs ApprovalWorkflow
- `POST /assets/:id/approve` / `/reject` — Stage 5 **Validate** (part 2): Reviewer action, logs + updates status; approve sets EFFECTIVE_DATE and moves to Stage 6 **Publish**
- `POST /assets/:id/delegate` — logs a Delegated action to another persona
- `POST /assets/:id/annotate` — add an annotation
- `POST /assets/:id/version` — new version upload
- `GET /admin/analytics` — aggregate counts for dashboard charts
- `GET /admin/audit` — full ApprovalWorkflow feed
- `GET /admin/personas` / `POST /admin/personas` — persona management
- `GET /admin/tags` / `POST /admin/tags` — controlled vocabulary (taxonomy) management
- `POST /usage-log` — fired on view/download for analytics

## 7. RFP Requirement Coverage

| RFP requirement | Status |
|---|---|
| Centralized repository, metadata/tagging/search | **Live** — six-dimension taxonomy (§4.1), Sun Pharma-aligned |
| Version control & audit trail | **Live** |
| Asset lifecycle (create→review→approve→publish→archive) | **Live** — worded as Draft/UnderReview/Approved/Published(Effective)/Archived(Obsolete) to match deck's Lifecycle Metadata vocabulary |
| Brand/content governance | **Live** (via approval gating + governance layer narrative, §4.4) |
| Multiple workflow/approval automation | **Live** (submit/approve/reject/delegate) |
| Annotations on image and video | **Live** |
| Reporting/analytics on usage & adoption | **Live** (Admin dashboard from UsageLog) |
| Delegation handling | **Live** (logged action) |
| Agency Access Control | **Live** (role-scoped API) |
| Multi-language content (UI stays English) | **Live** (Language field + filter) |
| Digital rights/usage management | **Partial** — UsageRights/ExpiryDate fields shown, no enforcement engine |
| Multi-channel distribution | **Simulated** — Channel field on UsageLog represents distribution, no live integrations |
| M365 (SharePoint/Teams/OneDrive), CRM/CMS integration, API/SSO | **Deck-only** — narrated capability + roadmap, not built |
| Data residency/hosting per country, security certifications | **Deck-only** — Catalyst DC/region story, not built |
| Pricing/licensing, customer references, roadmap | **Deck content**, not a build item |

## 8. Non-Goals

- No real authentication/SSO
- No live third-party integrations (M365, CRM, CMS)
- No live Zia AI call in v1 (pre-canned Classify/Enrich suggestions)
- No GxP document management (Quality/Regulatory/Manufacturing SOPs, deviations,
  batch records, submissions) — that is the source deck's DMS scope, explicitly
  out of scope for this DAM demo (see §1 Scope note)
- No hierarchical hosting/DR story — POC lives in one Development env

## 9. Follow-up: Presentation Deck

The RFP also asks for a slide deck covering features, competitive
differentiation, a feature-comparison table vs. competitors, pricing/
licensing, and customer success stories. That's a separate content
deliverable (not a Catalyst build) — to be scoped and drafted after this
app is functional, likely as a Claude Artifact slide deck. It should
explicitly call out that the demo's taxonomy mirrors Sun Pharma's own DMS
Taxonomy Blueprint as a differentiator.
