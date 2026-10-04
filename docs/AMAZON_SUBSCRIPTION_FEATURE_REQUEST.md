# Amazon Feature Request — Subscription Discovery & Entitlement Integration

## Metadata
| Field | Value |
|---|---|
| Project | ARCHANGEL — The Intelligence Layer for Fire TV |
| Repository | Barnona/archangel |
| Feature request | Amazon Subscription Discovery & Entitlement Integration |
| Status | Future / Requires official Amazon platform support |
| Related module | AdLens / Subscription Intelligence |
| Related request | Amazon Appstore Application Catalog API |
| Created | 2026-10-04 |

## 1. Executive Summary

ARCHANGEL's AdLens module can expose observable monetization signals, including whether an application is associated with a subscription model. The proposed platform capability is an official Amazon-supported Subscription Discovery & Entitlement Integration.

The objective is not to let ARCHANGEL bypass application subscription systems or independently process payments. Instead, ARCHANGEL would use an official Amazon interface to discover eligible offers, identify ad-free tiers where officially exposed, display authoritative terms, initiate an Amazon-managed purchase flow where permitted, verify authorized entitlement, and direct the user to the relevant application.

## 2. Problem

Today ARCHANGEL can identify a subscription monetization signal, but it cannot reliably answer: Does this app offer an official ad-free subscription, and can I access that subscription through Amazon?

A subscription model does not prove that an ad-free tier exists. Therefore ARCHANGEL must not infer subscription = ad-free. It should obtain authoritative information through an official platform integration.

## 3. Proposed User Experience

Find an App → App Details → AdLens → Monetization: Subscription → Subscription Intelligence → Available plans/offers → Ad-free option, if officially exposed → Amazon-managed purchase flow → Entitlement → Target application.

If sufficient information is unavailable, the UI should show UNKNOWN rather than manufacture an ad-free claim.

## 4. Requested Amazon Capability

ARCHANGEL requests an official, authenticated API or platform integration for subscription discovery and entitlement.

### 4.1 Subscription discovery
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

### 4.2 Ad-free plan identification

Where a service explicitly offers an ad-free tier, Amazon could expose an authoritative attribute. If Amazon cannot verify an ad-free attribute, ARCHANGEL should display UNKNOWN.

### 4.3 Amazon-managed purchase flow

Where supported, ARCHANGEL should invoke an Amazon-managed subscription flow. ARCHANGEL should not handle payment-card data, Amazon credentials, third-party passwords, payment processing, or subscription billing.

### 4.4 Entitlement verification

An authorized mechanism should allow the relevant application/service—or an authorized ARCHANGEL integration where Amazon permits it—to determine entitlement status.

## 5. Relationship with Amazon Appstore Catalog API

The existing Amazon Appstore Application Catalog API request and this subscription request solve different problems.

| Capability | Purpose |
|---|---|
| Appstore Catalog API | What applications exist and what metadata/availability they have |
| Subscription Integration | What subscription offers/entitlements are available for supported services |

Together they allow ARCHANGEL to connect application discovery with monetization intelligence.

## 6. Why Amazon Integration Is Necessary

ARCHANGEL should not obtain subscription information by scraping private Amazon endpoints, reverse engineering private APIs, bypassing authentication, extracting another application's private subscription state, intercepting payment flows, modifying another application's subscription state, or claiming system privileges it does not possess.

The requested feature therefore belongs at the platform-integration level.

## 7. Privacy and Security Requirements

Any future implementation should follow Amazon authorization and privacy requirements and use minimum necessary access.

ARCHANGEL should not retain payment credentials. Payment and authentication should remain under Amazon-supported mechanisms.

## 8. ARCHANGEL Product Value

This capability would extend AdLens from advertising transparency into broader monetization intelligence:

How is this app monetized? → Does it have an ad-free option? → What official subscription options are available? → Am I eligible? → Can Amazon handle the purchase?

## 9. Proposed API Characteristics

Potential characteristics include authenticated developer access, application/service identifiers, regional filtering, device eligibility, subscription offer metadata, entitlement status, rate limits, documented errors, privacy controls, and auditability. The final protocol and schema should remain Amazon's decision.

## 10. Current ARCHANGEL Implementation

This feature is not currently implemented as an Amazon integration. Current AdLens only records the catalog-level subscription signal.

The current UI explicitly states that a detected subscription model does not establish that a specific subscription tier removes advertising.

The current catalog must not be interpreted as a complete Amazon subscription database.

## 11. Success Criteria

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

## 12. Important Boundary

ARCHANGEL is not requesting system-wide ad blocking.

The requested capability is legitimate subscription discovery and access to subscription-based experiences, including ad-free tiers where officially offered and exposed by Amazon.

AdLens remains an intelligence/transparency system. ARCHANGEL does not claim authority to disable Fire TV Sponsored-row advertising, system-level advertising, or advertisements inside applications without a supported mechanism.

## 13. Future Roadmap

CURRENT → AdLens monetization signals → Subscription model detection → UNKNOWN when evidence is insufficient

NEXT → Subscription Intelligence UI → Evidence/source presentation → Offer comparison

FUTURE → Amazon Subscription Discovery API → Amazon-managed purchase flow → Entitlement verification → Ad-free tier discovery

## 14. Relationship to Existing Amazon Feature Requests

### Request #1 — Amazon Appstore Application Catalog API
Official read-only catalog access for application discovery and metadata.

### Request #2 — Amazon Subscription Discovery & Entitlement Integration
Official subscription offer discovery, ad-free plan information where available, Amazon-managed purchase flow, and authorized entitlement verification.

These remain separate requests because they address different platform capabilities.

## Status

PROPOSED — FUTURE AMAZON FEATURE REQUEST

No private API, scraping, reverse engineering, or security bypass is assumed. The final API design, authorization model, and eligibility rules remain under Amazon's control.

## References

Amazon's official developer documentation describes Amazon IAP and subscription-related capabilities for supported Fire TV/Vega application scenarios. The proposed ARCHANGEL integration should build only on officially documented and authorized platform capabilities.