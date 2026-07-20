# Batch FAQ-Accordion-1: Schema FAQ Accordion Projection

**Date:** 2026-07-19
**Author:** /root
**Status:** MERGED — PR #72 landed in `dev` as `9f0fe28`; browser ratification remains a pre-publication host gate

## Summary

Adds an opt-in Schema.org FAQ projection that passes a narrow derived model into
the canonical components-ui accordion, with an optional class-only Bootstrap
presentation. Published defaults and locked resolver/compiler/cache/JSON-LD
owners remain unchanged.

## Changes

### Added

- Public canonical `accordion.group` root binder.
- Root-only Bootstrap `accordion.group` overlay.
- `FAQPage.accordion` projection for exact FAQPage/Question/Answer shapes.
- Source, pipeline, manifest, persistence, cache-generation, and package
  contract tests.

### Modified

- Coordinated components, Bootstrap, and schema package metadata to `0.2.0`.
- Advanced components/Bootstrap singleton identities and all seven canonical
  cache IDs while retaining schema's published legacy asset namespace.
- Refactored `accordion.default` to acquire the same-package group binder after
  its unchanged `items` gate.
- Updated package READMEs with validation, framework, cache, rollout, rollback,
  inherited-property, and accessible-name ownership.

### Removed

- Nothing. No export, mapper key, package, or published default was removed.

## Key Files

| File | Change Type | Description |
|---|---|---|
| `src/uis/schema-ui/src/faq-page/faq-page-accordion.tss` | Added | Narrow schema.org projection and derived handoff |
| `src/uis/components-ui/src/accordion/accordion-group.tss` | Added | Canonical root/cache binder |
| `src/uis/bootstrap-ui/src/accordion/accordion-group.tss` | Added | Literal root presentation |
| `test/pipeline/schema-faq.test.js` | Added | Projection, hostile input, framework, JSON-LD, cache, restart, and scale evidence |
| `test/pipeline/ui-manifest.test.js` | Modified | Deterministic eight-asset FAQ pack and prepared lookup |

## STRIDE Security Analysis

| Threat | Status | Notes |
|---|---|---|
| **Spoofing** | Mitigated | Exact bounded FAQPage/Question/Answer type gates |
| **Tampering** | Mitigated | Own-index traversal and derived two-field handoff |
| **Repudiation** | N/A | Pure deterministic render; no user action or mutation |
| **Info Disclosure** | Mitigated | Escaped sinks and static data-free fragment cache |
| **DoS** | Residual | Linear/constant-acquisition path; hosts own collection/string bounds |
| **Elevation** | Mitigated | No HTML, selector, URL, event, Bootstrap behavior, or runtime import sink |

## Test Coverage

| Category | Before | After | Delta |
|---|---:|---:|---:|
| Repository `node:test` total | 912 | 928 | +16 |
| Post-review focused UI/manifest/restart set | — | 59 | — |
| Live browser accessibility | 0 | 0 | 0 |

## Code Quality Score

**Overall: 9/10 — implementation clean; browser evidence pending**

| Dimension | Score | Notes |
|---|---:|---|
| Architecture | 10/10 | Published owners and DI boundaries preserved |
| Consistency | 10/10 | Additive mapper/TSS/package conventions |
| Type Safety | 10/10 | No authored TypeScript/declarations or changed view contract |
| Validation | 9/10 | Automated gates pass; live accessibility validation pending |
| Error Handling | 10/10 | Fail-closed invalids and loud bounded-policy failures |
| Security/Privacy | 10/10 | Escaping, minimization, cache purity, no new collection |
| Performance | 10/10 | Linear traversal and constant one/32-item acquisition |
| Maintainability | 10/10 | One canonical root owner; no duplicated adapter logic |
| Testability | 9/10 | 928 automated tests pass; Phase 9 browser evidence pending |
| Readability | 10/10 | Terse local style and explicit published contracts |

## Dependencies

- **Blocks:** coherent publish order: components, Bootstrap, then schema.
- **Blocked by:** configured host page and Chrome MCP/browser integration for
  pre-publish accessibility QA.
- **Related:** `feature-reviews/schema-faq-accordion-spec.md`,
  `feature-reviews/schema-faq-accordion-test-plan.md`, and
  `feature-reviews/stride-schema-faq-accordion.md`.

## Migration Notes

No data or database migration exists. Versioned static cache entries cold
migrate to `0.2.0`; rollback pins the coherent prior trio, restores matching
manifests, and reinitializes resolver state. Old and new cache generations are
isolated and caller-data-free.

## Ratification

- [x] Code review completed with no remaining valid implementation finding.
- [x] STRIDE analysis reviewed.
- [x] Automated tests, typecheck, package dry-runs, and diff checks pass.
- [x] Documentation updated.
- [x] Final head `314eb71` passed green CI and clean current-head Codex review before PR #72 merged as `9f0fe28`.
- [ ] Live browser accessibility evidence complete.
- [ ] Ready for publication.
