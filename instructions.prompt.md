# Home Task: Dynamic AdSense Search Related Content Platform

You may read the file .env.local for environment variable definitions needed for this task. Use them, or request more of them as needed.

## Overview
Build a high-performance web application that dynamically generates content pages with Google AdSense Related Search on Content (RSOC) ads, tracks user interactions, and integrates with Facebook Conversion API for lead tracking.

## Project Objectives
Create a production-ready system that:
- Generates SEO-optimized article pages dynamically using AI
- Implements Google AdSense RSOC with related search units
- Tracks ad clicks and user behavior
- Sends conversion events to Facebook
- Complies with GDPR/CCPA privacy regulations
- Handles high traffic loads efficiently

## Technical Requirements

### 1. Frontend Article & SERP Pages
**Requirements:**
- SERP Page: Search results page with related search suggestions and ads
- Article Page: Fast-loading content page with embedded RSOC ads
- Performance: Page load time < 2 seconds (mobile & desktop)

**Reference Examples:**
- https://www.homelivi.com/dsr?q=php%20developer&asid=a3_ch961...
- https://storyimagur.com/asrsearch?search=stock%20investment%20tips...

**Implementation Guide:**
- https://developers.google.com/custom-search-ads/s/docs/implementation-guide#related-search-on-content-pages-beta  
- https://support.google.com/adsense/answer/10233819?hl=en#create-a-related-search-unit-for-your-content-pages

---

### 2. Event Tracking System
**Capture and Store:**
- Click ID (gclid, fbclid, clickid)
- Channel (mon)
- Article query (q)
- Locale (locale)
- User Agent  
- Timestamp (UTC)
- GEO location  
- Referrer Ad Creative (rac)
- Any additional URL parameters

**Database Requirements:**
- Support high-volume writes  
- Optimized indexing for analytics queries

---

### 3. Facebook Conversion API Integration
**Requirements:**
- Send `Lead` event when user clicks an ad
- Include: click_id, source, timestamp, IP, UA, cookies (FBC/FBP), channel, keyword, ad creative
- Secure API authentication
- Error handling + retry logic

---

### 4. Dynamic Content Generation
**AI Integration:**
- Use OpenAI/Grok/Gemini API  
- Generate 850–1500 word SEO articles based on `q` and `locale`
- Include meta tags, headers, structured HTML  
- Cache generated content

**Content Quality Requirements:**
- Relevant, readable, engaging  
- SEO optimized  
- Naturally include related search terms

---

### 5. URL Structure

**Format:**
`domain.com/article/?q={keyword}&locale={language}&mon={channel}&rac={referrerAdCreative}`

This will lead into a matching SERP page, and each article page must embed RSOC ads relevant to the `q` parameter.

**Parameters:**
- q  
- locale  
- mon  
- rac  
- Support UTMs & tracking IDs

**URL Handling:**
- Parse & validate parameters  
- Graceful handling of missing/malformed params  
- Support URL encoding/decoding

---

### 6. Privacy Compliance (GDPR & CCPA)
**Requirements:**
- Consent Management Platform (CMP)
- GDPR & CCPA opt-out
- Cookie consent banner
- Privacy policy page
- Do Not Sell My Info option

**CMP Recommendation:**
- Inmobi Free CMP

---

### 7. Performance & Scalability
**High Traffic Readiness:**
- Optimize DB queries & pooling
- Caching
- Async tracking & API calls
- Monitor performance

**Infrastructure:**
- CDN for static assets  
- Database connection limits  
- Rate limit AI API calls  

---

## Deliverables

### 1. Source Code
- Clean repo  
- README  
- Env template  
- DB schema/migrations  

### 2. Documentation
- Architecture diagram  
- Tech stack & rationale  
- DB design  
- API docs  
- Deployment guide  
- User flow documentation  
- Tracking flow diagrams  

### 3. Demo
- Deployed version  
- Sample URLs  
- Tracking test cases  

### 4. Testing
- Checklist  
- Performance results  
- Test scenario docs  

---

## Evaluation Criteria
1. **Functionality (45%)**  
2. **Code Quality (20%)**  
3. **Performance (20%)**  
4. **Technology Choices (10%)**  
5. **Problem Solving (5%)**

---

## Resources & Tools
Allowed:
- Any language/framework
- AI assistance
- Open-source libraries
- Google AdSense RSOC
- OpenAI/Grok/Gemini
- Facebook Conversion API
- CMP (Inmobi recommended)

