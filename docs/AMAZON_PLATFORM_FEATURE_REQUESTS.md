# Amazon Platform Feature Requests — ARCHANGEL

## Metadata

| Field | Value |
|---|---|
| Project | ARCHANGEL — The Intelligence Layer for Fire TV |
| Repository | Barnona/archangel |
| Status | Future / Requires official Amazon platform support |
| Created | 2026-10-04 |
| Purpose | Consolidated record of Amazon platform capabilities requested by ARCHANGEL |

---

# 1. Amazon Appstore Application Catalog API

## Proposed title

**Request: Official Amazon Appstore API/feed for Fire TV application discovery**

## Context

ARCHANGEL is an intelligence/discovery layer for Amazon Fire TV. It helps users search for applications, compare alternatives, identify missing applications, and send demand signals to developers.

The current implementation uses a small, manually curated verified catalog because we do not have an official Appstore-wide application catalog API.

Amazon's current public documentation describes Appstore SDK capabilities such as IAP, DRM, and Simple Sign-in, and Fire TV provides discovery/search experiences. The public SDK documentation does not expose an Appstore-wide application enumeration API for third-party apps.

## Feature request

Please consider providing an official, authenticated **Amazon Appstore Application Catalog API** for approved developers/partners.

A read-only API would be sufficient initially.

### Suggested capabilities

- Search applications by name and keyword.
- Filter by category.
- Filter by supported device family / Fire TV model.
- Filter by Fire OS / Vega OS compatibility.
- Return application/package identifiers.
- Return current Appstore availability by marketplace/region.
- Return application detail-page/deep-link information.
- Return developer/publisher information.
- Return version/update timestamp.
- Return monetization model where appropriate.
- Return application icon/banner metadata.
- Support pagination and rate limits.
- Provide change/update timestamps or incremental sync support.
- Respect region, age, parental-control, account, and device eligibility rules.

## Why this would help

A supported API would let third-party discovery tools build accurate experiences without scraping or reverse-engineering Amazon's Appstore.

For ARCHANGEL specifically, it would enable:

1. **Complete or near-complete discovery coverage** based on the developer's authorization.
2. **Accurate device compatibility** instead of relying on a static cache.
3. **Fresh application metadata** and update timestamps.
4. **Better alternatives** because the recommendation engine can operate over the real eligible catalog.
5. **Developer demand signals** when users request applications that are unavailable on a target device or marketplace.
6. **A safer ecosystem** because developers use an official interface rather than unofficial Appstore endpoints.

## Security / privacy model

The API does not need to expose customer-private information.

A useful first version could expose only public catalog metadata, subject to Amazon's existing marketplace and eligibility rules. Authentication, quotas, partner approval, and signed requests could control access.

## Important implementation principle

ARCHANGEL would use the API only as an authorized catalog source. It would not attempt to bypass Appstore controls, install unauthorized packages, or reverse-engineer private endpoints.

## Request

If an Appstore-wide catalog API is already available to selected partners, please point developers to the appropriate documentation or enrollment process.

If it is not currently available, please consider this a feature request for an official read-only catalog API/feed for Fire TV application discovery.

## Suggested posting locations

- Amazon Developer Community → **Fire Devices & Appstore**
- Amazon Developer support / contact case, where available

---

# 2. Amazon Subscription Discovery & Entitlement Integration

## Executive Summary

ARCHANGEL's AdLens module can expose observable monetization signals, including whether an application is associated with a subscription model. The proposed platform capability is an official Amazon-supported Subscription Discovery & Entitlement Integration.

The objective is not to let ARCHANGEL bypass application subscription systems or independently process payments. Instead, ARCHANGEL would use an official Amazon interface to discover eligible offers, identify ad-free tiers where officially exposed, display authoritative terms, initiate an Amazon-managed purchase flow where permitted, verify authorized entitlement, and direct the user to the relevant application.

## Problem

Today ARCHANGEL can identify a subscription monetization signal, but it cannot reliably answer: Does this app offer an official ad-free subscription, and can I access that subscription through Amazon?

A subscription model does not prove that an ad-free tier exists. Therefore ARCHANGEL must not infer subscription = ad-free. It should obtain authoritative information through an official platform integration.

## Proposed user experience

`Find an App → App Details → AdLens → Monetization: Subscription → Subscription Intelligence → Available plans/offers → Ad-free option, if officially exposed → Amazon-managed purchase flow → Entitlement → Target application`

If sufficient information is unavailable, the UI should show **UNKNOWN** rather than manufacture an ad-free claim.

## Requested Amazon capability

ARCHANGEL requests an official, authenticated API or platform integration for subscription discovery and entitlement.

### Subscription discovery

- Application/service identifier
- Subscription identifier
- Plan name and description
- Billing period
- Price and currency
- Availability region
- Device/platform eligibility
- Offer eligibility
- Ad-free designation where officially supplied
- Current availability

The exact schema should be defined by Amazon.

### Ad-free plan identification

Where a service explicitly offers an ad-free tier, Amazon could expose an authoritative attribute. If Amazon cannot verify an ad-free attribute, ARCHANGEL should display **UNKNOWN**.

### Amazon-managed purchase flow

Where supported, ARCHANGEL should invoke an Amazon-managed subscription flow. ARCHANGEL should not handle payment-card data, Amazon credentials, third-party passwords, payment processing, or subscription billing.

### Entitlement verification

An authorized mechanism should allow the relevant application/service—or an authorized ARCHANGEL integration where Amazon permits it—to determine entitlement status.

## Relationship with the Appstore Catalog API

The two requested capabilities solve different problems:

| Capability | Purpose |
|---|---|
| Appstore Catalog API | What applications exist and what metadata/availability they have |
| Subscription Integration | What subscription offers/entitlements are available for supported services |

Together they allow ARCHANGEL to connect application discovery with monetization intelligence.

## Why Amazon integration is necessary

ARCHANGEL should not obtain subscription information by scraping private Amazon endpoints, reverse engineering private APIs, bypassing authentication, extracting another application's private subscription state, intercepting payment flows, modifying another application's subscription state, or claiming system privileges it does not possess.

The requested feature therefore belongs at the platform-integration level.

## Privacy and security requirements

Any future implementation should follow Amazon authorization and privacy requirements and use minimum necessary access.

ARCHANGEL should not retain payment credentials. Payment and authentication should remain under Amazon-supported mechanisms.

## ARCHANGEL product value

This capability would extend AdLens from advertising transparency into broader monetization intelligence:

**How is this app monetized? → Does it have an ad-free option? → What official subscription options are available? → Am I eligible? → Can Amazon handle the purchase?**

## Proposed API characteristics

Potential characteristics include authenticated developer access, application/service identifiers, regional filtering, device eligibility, subscription offer metadata, entitlement status, rate limits, documented errors, privacy controls, and auditability. The final protocol and schema should remain Amazon's decision.

## Current ARCHANGEL implementation

This feature is **not currently implemented as an Amazon integration**. Current AdLens records the catalog-level subscription signal and exposes Subscription Intelligence with explicit UNKNOWN states where authoritative information is unavailable.

The current UI explicitly states that a detected subscription model does not establish that a specific subscription tier removes advertising.

The current catalog must not be interpreted as a complete Amazon subscription database.

## Success criteria

An official Amazon capability should allow an approved ARCHANGEL implementation to:

1. Discover supported subscription offers.
2. Obtain authoritative offer metadata.
3. Identify ad-free tiers when Amazon has authoritative information.
4. Respect regional and account eligibility.
5. Launch an Amazon-managed purchase flow where permitted.
6. Verify authorized entitlement state.
7. Return the user to the appropriate application.
8. Keep payment and authentication under Amazon control.
9. Respect privacy, security, and platform policies.

## Important boundary

ARCHANGEL is **not requesting system-wide ad blocking**.

The requested capability is legitimate subscription discovery and access to subscription-based experiences, including ad-free tiers where officially offered and exposed by Amazon.

AdLens remains an intelligence/transparency system. ARCHANGEL does not claim authority to disable Fire TV Sponsored-row advertising, system-level advertising, or advertisements inside applications without a supported mechanism.

## Future roadmap

**CURRENT** → AdLens monetization signals → Subscription model detection → UNKNOWN when evidence is insufficient

**NEXT** → Subscription Intelligence UI → Evidence/source presentation → Offer comparison

**FUTURE** → Amazon Subscription Discovery API → Amazon-managed purchase flow → Entitlement verification → Ad-free tier discovery

---

# 3. Consolidated implementation boundary

Both requests follow the same ARCHANGEL platform principle:

> **When Amazon does not expose a required capability through an authorized interface, ARCHANGEL should request an official integration rather than scrape, reverse-engineer, bypass, or claim unsupported privileges.**

The Appstore Catalog API would provide authoritative application discovery data.

The Subscription Discovery & Entitlement Integration would provide authoritative subscription and entitlement information.

Together, they would replace the current limited catalog/evidence model with authorized, current platform data where Amazon makes those capabilities available.

---

## Status

**PROPOSED — FUTURE AMAZON PLATFORM FEATURE REQUESTS**

No private API, scraping, reverse engineering, payment bypass, entitlement bypass, or security bypass is assumed. The final API design, authorization model, and eligibility rules remain under Amazon's control.

## References

- Amazon Appstore developer portal: https://developer.amazon.com/apps-and-games
- Amazon SDKs: https://developer.amazon.com/apps-and-games/sdks
- Fire TV developer documentation: https://developer.amazon.com/docs/fire-tv/get-started-with-fire-tv.html

