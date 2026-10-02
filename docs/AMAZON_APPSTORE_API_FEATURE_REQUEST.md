# Amazon Appstore feature request: Fire TV application catalog API

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

## References

- Amazon Appstore developer portal: https://developer.amazon.com/apps-and-games
- Amazon SDKs: https://developer.amazon.com/apps-and-games/sdks
- Fire TV developer documentation: https://developer.amazon.com/docs/fire-tv/get-started-with-fire-tv.html
