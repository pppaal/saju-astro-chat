# ZAP Scanning Report

ZAP by [Checkmarx](https://checkmarx.com/).


## Summary of Alerts

| Risk Level | Number of Alerts |
| --- | --- |
| High | 0 |
| Medium | 2 |
| Low | 3 |
| Informational | 4 |




## Insights

| Level | Reason | Site | Description | Statistic |
| --- | --- | --- | --- | --- |
| Low | Warning |  | ZAP errors logged - see the zap.log file for details | 2    |
| Low | Warning |  | ZAP warnings logged - see the zap.log file for details | 4    |
| Info | Informational |  | Percentage of network failures | 28 % |
| Info | Informational | http://host.docker.internal:3000 | Percentage of responses with status code 2xx | 100 % |
| Info | Informational | http://host.docker.internal:3000 | Percentage of endpoints with content type application/javascript | 58 % |
| Info | Informational | http://host.docker.internal:3000 | Percentage of endpoints with content type application/json | 5 % |
| Info | Informational | http://host.docker.internal:3000 | Percentage of endpoints with content type image/png | 5 % |
| Info | Informational | http://host.docker.internal:3000 | Percentage of endpoints with content type text/css | 23 % |
| Info | Informational | http://host.docker.internal:3000 | Percentage of endpoints with content type text/html | 5 % |
| Info | Informational | http://host.docker.internal:3000 | Percentage of endpoints with method GET | 100 % |
| Info | Informational | http://host.docker.internal:3000 | Count of total endpoints | 17    |
| Info | Informational | http://host.docker.internal:3000 | Percentage of slow responses | 100 % |




## Alerts

| Name | Risk Level | Number of Instances |
| --- | --- | --- |
| CSP: Wildcard Directive | Medium | 3 |
| Sub Resource Integrity Attribute Missing | Medium | 3 |
| Cross-Domain JavaScript Source File Inclusion | Low | 3 |
| Dangerous JS Functions | Low | 8 |
| Insufficient Site Isolation Against Spectre Vulnerability | Low | Systemic |
| Information Disclosure - Suspicious Comments | Informational | 10 |
| Non-Storable Content | Informational | 1 |
| Storable and Cacheable Content | Informational | Systemic |
| Storable but Non-Cacheable Content | Informational | 1 |




## Alert Detail



### [ CSP: Wildcard Directive ](https://www.zaproxy.org/docs/alerts/10055/)



##### Medium (High)

### Description

Content Security Policy (CSP) is an added layer of security that helps to detect and mitigate certain types of attacks. Including (but not limited to) Cross Site Scripting (XSS), and data injection attacks. These attacks are used for everything from data theft to site defacement or distribution of malware. CSP provides a set of standard HTTP headers that allow website owners to declare approved sources of content that browsers should be allowed to load on that page — covered types are JavaScript, CSS, HTML frames, fonts, images and embeddable objects such as Java applets, ActiveX, audio and video files.

* URL: http://host.docker.internal:3000
  * Node Name: `http://host.docker.internal:3000`
  * Method: `GET`
  * Parameter: `content-security-policy`
  * Attack: ``
  * Evidence: `default-src 'self'; script-src 'self' 'nonce-arFcop/8RY9uMu8lKe2Q1g==' 'strict-dynamic' https://cdn.jsdelivr.net https://www.googletagmanager.com https://www.clarity.ms https://va.vercel-scripts.com https://cdnjs.cloudflare.com https://t1.kakaocdn.net; worker-src 'self' blob: https://cdnjs.cloudflare.com; style-src 'self' 'nonce-arFcop/8RY9uMu8lKe2Q1g==' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https: http:; connect-src 'self' https://api.destinypal.com https://*.sentry.io https://www.google-analytics.com https://region1.google-analytics.com http://localhost:* https://api.openai.com wss://api.openai.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests`
  * Other Info: `The following directives either allow wildcard sources (or ancestors), are not defined, or are overly broadly defined:
img-src`
* URL: http://host.docker.internal:3000
  * Node Name: `http://host.docker.internal:3000`
  * Method: `GET`
  * Parameter: `content-security-policy`
  * Attack: ``
  * Evidence: `default-src 'self'; script-src 'self' 'nonce-tf5oTxQJC9n7RPEx9Wm5ow==' 'strict-dynamic' https://cdn.jsdelivr.net https://www.googletagmanager.com https://www.clarity.ms https://va.vercel-scripts.com https://cdnjs.cloudflare.com https://t1.kakaocdn.net; worker-src 'self' blob: https://cdnjs.cloudflare.com; style-src 'self' 'nonce-tf5oTxQJC9n7RPEx9Wm5ow==' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https: http:; connect-src 'self' https://api.destinypal.com https://*.sentry.io https://www.google-analytics.com https://region1.google-analytics.com http://localhost:* https://api.openai.com wss://api.openai.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests`
  * Other Info: `The following directives either allow wildcard sources (or ancestors), are not defined, or are overly broadly defined:
img-src`
* URL: http://host.docker.internal:3000/
  * Node Name: `http://host.docker.internal:3000/`
  * Method: `GET`
  * Parameter: `content-security-policy`
  * Attack: ``
  * Evidence: `default-src 'self'; script-src 'self' 'nonce-NYjS4HBhqBd5bgnkHtS8ag==' 'strict-dynamic' https://cdn.jsdelivr.net https://www.googletagmanager.com https://www.clarity.ms https://va.vercel-scripts.com https://cdnjs.cloudflare.com https://t1.kakaocdn.net; worker-src 'self' blob: https://cdnjs.cloudflare.com; style-src 'self' 'nonce-NYjS4HBhqBd5bgnkHtS8ag==' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https: http:; connect-src 'self' https://api.destinypal.com https://*.sentry.io https://www.google-analytics.com https://region1.google-analytics.com http://localhost:* https://api.openai.com wss://api.openai.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests`
  * Other Info: `The following directives either allow wildcard sources (or ancestors), are not defined, or are overly broadly defined:
img-src`


Instances: 3

### Solution

Ensure that your web server, application server, load balancer, etc. is properly configured to set the Content-Security-Policy header.

### Reference


* [ https://www.w3.org/TR/CSP/ ](https://www.w3.org/TR/CSP/)
* [ https://caniuse.com/#search=content+security+policy ](https://caniuse.com/#search=content+security+policy)
* [ https://content-security-policy.com/ ](https://content-security-policy.com/)
* [ https://github.com/HtmlUnit/htmlunit-csp ](https://github.com/HtmlUnit/htmlunit-csp)
* [ https://web.dev/articles/csp#resource-options ](https://web.dev/articles/csp#resource-options)


#### CWE Id: [ 693 ](https://cwe.mitre.org/data/definitions/693.html)


#### WASC Id: 15

#### Source ID: 3

### [ Sub Resource Integrity Attribute Missing ](https://www.zaproxy.org/docs/alerts/90003/)



##### Medium (High)

### Description

The integrity attribute is missing on a script or link tag served by an external server. The integrity tag prevents an attacker who have gained access to this server from injecting a malicious content.

* URL: http://host.docker.internal:3000
  * Node Name: `http://host.docker.internal:3000`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `<script defer="" src="https://t1.kakaocdn.net/kakao_js_sdk/2.6.0/kakao.min.js" nonce="arFcop/8RY9uMu8lKe2Q1g=="></script>`
  * Other Info: ``
* URL: http://host.docker.internal:3000
  * Node Name: `http://host.docker.internal:3000`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `<script defer="" src="https://t1.kakaocdn.net/kakao_js_sdk/2.6.0/kakao.min.js" nonce="tf5oTxQJC9n7RPEx9Wm5ow=="></script>`
  * Other Info: ``
* URL: http://host.docker.internal:3000/
  * Node Name: `http://host.docker.internal:3000/`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `<script defer="" src="https://t1.kakaocdn.net/kakao_js_sdk/2.6.0/kakao.min.js" nonce="NYjS4HBhqBd5bgnkHtS8ag=="></script>`
  * Other Info: ``


Instances: 3

### Solution

Provide a valid integrity attribute to the tag.

### Reference


* [ https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity ](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity)


#### CWE Id: [ 345 ](https://cwe.mitre.org/data/definitions/345.html)


#### WASC Id: 15

#### Source ID: 3

### [ Cross-Domain JavaScript Source File Inclusion ](https://www.zaproxy.org/docs/alerts/10017/)



##### Low (Medium)

### Description

The page includes one or more script files from a third-party domain.

* URL: http://host.docker.internal:3000
  * Node Name: `http://host.docker.internal:3000`
  * Method: `GET`
  * Parameter: `https://t1.kakaocdn.net/kakao_js_sdk/2.6.0/kakao.min.js`
  * Attack: ``
  * Evidence: `<script defer="" src="https://t1.kakaocdn.net/kakao_js_sdk/2.6.0/kakao.min.js" nonce="arFcop/8RY9uMu8lKe2Q1g=="></script>`
  * Other Info: ``
* URL: http://host.docker.internal:3000
  * Node Name: `http://host.docker.internal:3000`
  * Method: `GET`
  * Parameter: `https://t1.kakaocdn.net/kakao_js_sdk/2.6.0/kakao.min.js`
  * Attack: ``
  * Evidence: `<script defer="" src="https://t1.kakaocdn.net/kakao_js_sdk/2.6.0/kakao.min.js" nonce="tf5oTxQJC9n7RPEx9Wm5ow=="></script>`
  * Other Info: ``
* URL: http://host.docker.internal:3000/
  * Node Name: `http://host.docker.internal:3000/`
  * Method: `GET`
  * Parameter: `https://t1.kakaocdn.net/kakao_js_sdk/2.6.0/kakao.min.js`
  * Attack: ``
  * Evidence: `<script defer="" src="https://t1.kakaocdn.net/kakao_js_sdk/2.6.0/kakao.min.js" nonce="NYjS4HBhqBd5bgnkHtS8ag=="></script>`
  * Other Info: ``


Instances: 3

### Solution

Ensure JavaScript source files are loaded from only trusted sources, and the sources can't be controlled by end users of the application.

### Reference



#### CWE Id: [ 829 ](https://cwe.mitre.org/data/definitions/829.html)


#### WASC Id: 15

#### Source ID: 3

### [ Dangerous JS Functions ](https://www.zaproxy.org/docs/alerts/10110/)



##### Low (Low)

### Description

A dangerous JS function seems to be in use that would leave the site vulnerable.

* URL: http://host.docker.internal:3000/_next/static/chunks/_app-pages-browser_src_components_WeeklyFortuneCard_tsx.js
  * Node Name: `http://host.docker.internal:3000/_next/static/chunks/_app-pages-browser_src_components_WeeklyFortuneCard_tsx.js`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `eval(`
  * Other Info: ``
* URL: http://host.docker.internal:3000/_next/static/chunks/app-pages-internals.js
  * Node Name: `http://host.docker.internal:3000/_next/static/chunks/app-pages-internals.js`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `eval(`
  * Other Info: ``
* URL: http://host.docker.internal:3000/_next/static/chunks/app/(main&29/loading.js
  * Node Name: `http://host.docker.internal:3000/_next/static/chunks/app/(main)/loading.js`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `eval(`
  * Other Info: ``
* URL: http://host.docker.internal:3000/_next/static/chunks/app/(main&29/page.js
  * Node Name: `http://host.docker.internal:3000/_next/static/chunks/app/(main)/page.js`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `eval(`
  * Other Info: ``
* URL: http://host.docker.internal:3000/_next/static/chunks/app/error.js
  * Node Name: `http://host.docker.internal:3000/_next/static/chunks/app/error.js`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `eval(`
  * Other Info: ``
* URL: http://host.docker.internal:3000/_next/static/chunks/app/global-error.js
  * Node Name: `http://host.docker.internal:3000/_next/static/chunks/app/global-error.js`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `eval(`
  * Other Info: ``
* URL: http://host.docker.internal:3000/_next/static/chunks/app/layout.js
  * Node Name: `http://host.docker.internal:3000/_next/static/chunks/app/layout.js`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `eval(`
  * Other Info: ``
* URL: http://host.docker.internal:3000/_next/static/chunks/app/not-found.js
  * Node Name: `http://host.docker.internal:3000/_next/static/chunks/app/not-found.js`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `eval(`
  * Other Info: ``


Instances: 8

### Solution

See the references for security advice on the use of these functions.

### Reference


* [ https://v17.angular.io/guide/security ](https://v17.angular.io/guide/security)


#### CWE Id: [ 749 ](https://cwe.mitre.org/data/definitions/749.html)


#### Source ID: 3

### [ Insufficient Site Isolation Against Spectre Vulnerability ](https://www.zaproxy.org/docs/alerts/90004/)



##### Low (Medium)

### Description

Cross-Origin-Resource-Policy header is an opt-in header designed to counter side-channels attacks like Spectre. Resource should be specifically set as shareable amongst different origins.

* URL: http://host.docker.internal:3000
  * Node Name: `http://host.docker.internal:3000`
  * Method: `GET`
  * Parameter: `Cross-Origin-Resource-Policy`
  * Attack: ``
  * Evidence: ``
  * Other Info: ``
* URL: http://host.docker.internal:3000/_next/static/css/_app-pages-browser_src_components_WeeklyFortuneCard_tsx.css
  * Node Name: `http://host.docker.internal:3000/_next/static/css/_app-pages-browser_src_components_WeeklyFortuneCard_tsx.css`
  * Method: `GET`
  * Parameter: `Cross-Origin-Resource-Policy`
  * Attack: ``
  * Evidence: ``
  * Other Info: ``
* URL: http://host.docker.internal:3000/_next/static/css/app/(main&29/loading.css%3Fv=1768898472860
  * Node Name: `http://host.docker.internal:3000/_next/static/css/app/(main)/loading.css (v)`
  * Method: `GET`
  * Parameter: `Cross-Origin-Resource-Policy`
  * Attack: ``
  * Evidence: ``
  * Other Info: ``
* URL: http://host.docker.internal:3000/_next/static/css/app/(main&29/page.css%3Fv=1768898472860
  * Node Name: `http://host.docker.internal:3000/_next/static/css/app/(main)/page.css (v)`
  * Method: `GET`
  * Parameter: `Cross-Origin-Resource-Policy`
  * Attack: ``
  * Evidence: ``
  * Other Info: ``
* URL: http://host.docker.internal:3000/_next/static/css/app/layout.css%3Fv=1768898472860
  * Node Name: `http://host.docker.internal:3000/_next/static/css/app/layout.css (v)`
  * Method: `GET`
  * Parameter: `Cross-Origin-Resource-Policy`
  * Attack: ``
  * Evidence: ``
  * Other Info: ``
* URL: http://host.docker.internal:3000
  * Node Name: `http://host.docker.internal:3000`
  * Method: `GET`
  * Parameter: `Cross-Origin-Embedder-Policy`
  * Attack: ``
  * Evidence: ``
  * Other Info: ``
* URL: http://host.docker.internal:3000
  * Node Name: `http://host.docker.internal:3000`
  * Method: `GET`
  * Parameter: `Cross-Origin-Opener-Policy`
  * Attack: ``
  * Evidence: ``
  * Other Info: ``

Instances: Systemic


### Solution

Ensure that the application/web server sets the Cross-Origin-Resource-Policy header appropriately, and that it sets the Cross-Origin-Resource-Policy header to 'same-origin' for all web pages.
'same-site' is considered as less secured and should be avoided.
If resources must be shared, set the header to 'cross-origin'.
If possible, ensure that the end user uses a standards-compliant and modern web browser that supports the Cross-Origin-Resource-Policy header (https://caniuse.com/mdn-http_headers_cross-origin-resource-policy).

### Reference


* [ https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Embedder-Policy ](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Embedder-Policy)


#### CWE Id: [ 693 ](https://cwe.mitre.org/data/definitions/693.html)


#### WASC Id: 14

#### Source ID: 3

### [ Information Disclosure - Suspicious Comments ](https://www.zaproxy.org/docs/alerts/10027/)



##### Informational (Low)

### Description

The response appears to contain suspicious comments which may help an attacker.

* URL: http://host.docker.internal:3000
  * Node Name: `http://host.docker.internal:3000`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `query`
  * Other Info: `The following pattern was used: \bQUERY\b and was detected 3 times, the first in likely comment: "//schema.org","@type":"WebSite","name":"DestinyPal","url":"https://destinypal.com","description":"Diagnose with Fate, Analyze wi", see evidence field for the suspicious comment/snippet.`
* URL: http://host.docker.internal:3000
  * Node Name: `http://host.docker.internal:3000`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `user`
  * Other Info: `The following pattern was used: \bUSER\b and was detected in likely comment: "///40954\",151,75,142,1,false],[\"headers\",\"webpack-internal:///40954\",112,32,21,1,false],[\"RootLayout\",\"webpack-internal:", see evidence field for the suspicious comment/snippet.`
* URL: http://host.docker.internal:3000/_next/static/chunks/_app-pages-browser_src_components_WeeklyFortuneCard_tsx.js
  * Node Name: `http://host.docker.internal:3000/_next/static/chunks/_app-pages-browser_src_components_WeeklyFortuneCard_tsx.js`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `later`
  * Other Info: `The following pattern was used: \bLATER\b and was detected in likely comment: "//# sourceMappingURL=image-config.js.map\n\n\n;\n    // Wrapped in an IIFE to avoid polluting the global scope\n    ;\n    (func", see evidence field for the suspicious comment/snippet.`
* URL: http://host.docker.internal:3000/_next/static/chunks/app-pages-internals.js
  * Node Name: `http://host.docker.internal:3000/_next/static/chunks/app-pages-internals.js`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `later`
  * Other Info: `The following pattern was used: \bLATER\b and was detected in likely comment: "// We don't use makeResolvedReactPromise here because params\n    // supports copying with spread and we don't want to unnecessa", see evidence field for the suspicious comment/snippet.`
* URL: http://host.docker.internal:3000/_next/static/chunks/app/(main&29/loading.js
  * Node Name: `http://host.docker.internal:3000/_next/static/chunks/app/(main)/loading.js`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `later`
  * Other Info: `The following pattern was used: \bLATER\b and was detected in likely comment: "// Wrapped in an IIFE to avoid polluting the global scope\n    ;\n    (function () {\n        var _a, _b;\n        // Legacy CSS", see evidence field for the suspicious comment/snippet.`
* URL: http://host.docker.internal:3000/_next/static/chunks/app/error.js
  * Node Name: `http://host.docker.internal:3000/_next/static/chunks/app/error.js`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `from`
  * Other Info: `The following pattern was used: \bFROM\b and was detected in likely comment: "// Type definitions for logger metadata\n// Helper to convert any value to LogMetadata\nfunction toMeta(value) {\n    if (value ", see evidence field for the suspicious comment/snippet.`
* URL: http://host.docker.internal:3000/_next/static/chunks/app/global-error.js
  * Node Name: `http://host.docker.internal:3000/_next/static/chunks/app/global-error.js`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `from`
  * Other Info: `The following pattern was used: \bFROM\b and was detected in likely comment: "// Type definitions for logger metadata\n// Helper to convert any value to LogMetadata\nfunction toMeta(value) {\n    if (value ", see evidence field for the suspicious comment/snippet.`
* URL: http://host.docker.internal:3000/_next/static/chunks/app/not-found.js
  * Node Name: `http://host.docker.internal:3000/_next/static/chunks/app/not-found.js`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `user`
  * Other Info: `The following pattern was used: \bUSER\b and was detected in likely comment: "// NOTE: In theory, we could skip the wrapping if only one of the refs is non-null.\n    // (this happens often if the user does", see evidence field for the suspicious comment/snippet.`
* URL: http://host.docker.internal:3000/_next/static/chunks/polyfills.js
  * Node Name: `http://host.docker.internal:3000/_next/static/chunks/polyfills.js`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `from`
  * Other Info: `The following pattern was used: \bFROM\b and was detected in likely comment: "//github.com/zloirock/core-js/blob/v3.38.1/LICENSE",source:"https://github.com/zloirock/core-js"})}),nt=function(t,e){return rt[", see evidence field for the suspicious comment/snippet.`
* URL: http://host.docker.internal:3000/_next/static/chunks/webpack.js%3Fv=1768898472860
  * Node Name: `http://host.docker.internal:3000/_next/static/chunks/webpack.js (v)`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `from`
  * Other Info: `The following pattern was used: \bFROM\b and was detected in likely comment: "// inherit from previous dispose call", see evidence field for the suspicious comment/snippet.`


Instances: 10

### Solution

Remove all comments that return information that may help an attacker and fix any underlying problems they refer to.

### Reference



#### CWE Id: [ 615 ](https://cwe.mitre.org/data/definitions/615.html)


#### WASC Id: 13

#### Source ID: 3

### [ Non-Storable Content ](https://www.zaproxy.org/docs/alerts/10049/)



##### Informational (Medium)

### Description

The response contents are not storable by caching components such as proxy servers. If the response does not contain sensitive, personal or user-specific information, it may benefit from being stored and cached, to improve performance.

* URL: http://host.docker.internal:3000
  * Node Name: `http://host.docker.internal:3000`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `no-store`
  * Other Info: ``


Instances: 1

### Solution

The content may be marked as storable by ensuring that the following conditions are satisfied:
The request method must be understood by the cache and defined as being cacheable ("GET", "HEAD", and "POST" are currently defined as cacheable)
The response status code must be understood by the cache (one of the 1XX, 2XX, 3XX, 4XX, or 5XX response classes are generally understood)
The "no-store" cache directive must not appear in the request or response header fields
For caching by "shared" caches such as "proxy" caches, the "private" response directive must not appear in the response
For caching by "shared" caches such as "proxy" caches, the "Authorization" header field must not appear in the request, unless the response explicitly allows it (using one of the "must-revalidate", "public", or "s-maxage" Cache-Control response directives)
In addition to the conditions above, at least one of the following conditions must also be satisfied by the response:
It must contain an "Expires" header field
It must contain a "max-age" response directive
For "shared" caches such as "proxy" caches, it must contain a "s-maxage" response directive
It must contain a "Cache Control Extension" that allows it to be cached
It must have a status code that is defined as cacheable by default (200, 203, 204, 206, 300, 301, 404, 405, 410, 414, 501).

### Reference


* [ https://datatracker.ietf.org/doc/html/rfc7234 ](https://datatracker.ietf.org/doc/html/rfc7234)
* [ https://datatracker.ietf.org/doc/html/rfc7231 ](https://datatracker.ietf.org/doc/html/rfc7231)
* [ https://www.w3.org/Protocols/rfc2616/rfc2616-sec13.html ](https://www.w3.org/Protocols/rfc2616/rfc2616-sec13.html)


#### CWE Id: [ 524 ](https://cwe.mitre.org/data/definitions/524.html)


#### WASC Id: 13

#### Source ID: 3

### [ Storable and Cacheable Content ](https://www.zaproxy.org/docs/alerts/10049/)



##### Informational (Medium)

### Description

The response contents are storable by caching components such as proxy servers, and may be retrieved directly from the cache, rather than from the origin server by the caching servers, in response to similar requests from other users. If the response data is sensitive, personal or user-specific, this may result in sensitive information being leaked. In some cases, this may even result in a user gaining complete control of the session of another user, depending on the configuration of the caching components in use in their environment. This is primarily an issue where "shared" caching servers such as "proxy" caches are configured on the local network. This configuration is typically found in corporate or educational environments, for instance.

* URL: http://host.docker.internal:3000/_next/static/css/_app-pages-browser_src_components_WeeklyFortuneCard_tsx.css
  * Node Name: `http://host.docker.internal:3000/_next/static/css/_app-pages-browser_src_components_WeeklyFortuneCard_tsx.css`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `max-age=31536000`
  * Other Info: ``
* URL: http://host.docker.internal:3000/_next/static/css/app/(main&29/loading.css%3Fv=1768898472860
  * Node Name: `http://host.docker.internal:3000/_next/static/css/app/(main)/loading.css (v)`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `max-age=31536000`
  * Other Info: ``
* URL: http://host.docker.internal:3000/_next/static/css/app/(main&29/page.css%3Fv=1768898472860
  * Node Name: `http://host.docker.internal:3000/_next/static/css/app/(main)/page.css (v)`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `max-age=31536000`
  * Other Info: ``
* URL: http://host.docker.internal:3000/_next/static/css/app/layout.css%3Fv=1768898472860
  * Node Name: `http://host.docker.internal:3000/_next/static/css/app/layout.css (v)`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `max-age=31536000`
  * Other Info: ``
* URL: http://host.docker.internal:3000/logo/logo.png
  * Node Name: `http://host.docker.internal:3000/logo/logo.png`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `max-age=31536000`
  * Other Info: ``

Instances: Systemic


### Solution

Validate that the response does not contain sensitive, personal or user-specific information. If it does, consider the use of the following HTTP response headers, to limit, or prevent the content being stored and retrieved from the cache by another user:
Cache-Control: no-cache, no-store, must-revalidate, private
Pragma: no-cache
Expires: 0
This configuration directs both HTTP 1.0 and HTTP 1.1 compliant caching servers to not store the response, and to not retrieve the response (without validation) from the cache, in response to a similar request.

### Reference


* [ https://datatracker.ietf.org/doc/html/rfc7234 ](https://datatracker.ietf.org/doc/html/rfc7234)
* [ https://datatracker.ietf.org/doc/html/rfc7231 ](https://datatracker.ietf.org/doc/html/rfc7231)
* [ https://www.w3.org/Protocols/rfc2616/rfc2616-sec13.html ](https://www.w3.org/Protocols/rfc2616/rfc2616-sec13.html)


#### CWE Id: [ 524 ](https://cwe.mitre.org/data/definitions/524.html)


#### WASC Id: 13

#### Source ID: 3

### [ Storable but Non-Cacheable Content ](https://www.zaproxy.org/docs/alerts/10049/)



##### Informational (Medium)

### Description

The response contents are storable by caching components such as proxy servers, but will not be retrieved directly from the cache, without validating the request upstream, in response to similar requests from other users.

* URL: http://host.docker.internal:3000/manifest.json
  * Node Name: `http://host.docker.internal:3000/manifest.json`
  * Method: `GET`
  * Parameter: ``
  * Attack: ``
  * Evidence: `max-age=0`
  * Other Info: ``


Instances: 1

### Solution



### Reference


* [ https://datatracker.ietf.org/doc/html/rfc7234 ](https://datatracker.ietf.org/doc/html/rfc7234)
* [ https://datatracker.ietf.org/doc/html/rfc7231 ](https://datatracker.ietf.org/doc/html/rfc7231)
* [ https://www.w3.org/Protocols/rfc2616/rfc2616-sec13.html ](https://www.w3.org/Protocols/rfc2616/rfc2616-sec13.html)


#### CWE Id: [ 524 ](https://cwe.mitre.org/data/definitions/524.html)


#### WASC Id: 13

#### Source ID: 3


