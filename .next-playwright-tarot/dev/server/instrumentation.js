/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "instrumentation";
exports.ids = ["instrumentation"];
exports.modules = {

/***/ 8086:
/*!*************************!*\
  !*** external "module" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("module");

/***/ }),

/***/ 13356:
/*!***********************************************************************************!*\
  !*** ./node_modules/@opentelemetry/instrumentation/build/esm/platform/node/ sync ***!
  \***********************************************************************************/
/***/ ((module) => {

function webpackEmptyContext(req) {
	var e = new Error("Cannot find module '" + req + "'");
	e.code = 'MODULE_NOT_FOUND';
	throw e;
}
webpackEmptyContext.keys = () => ([]);
webpackEmptyContext.resolve = webpackEmptyContext;
webpackEmptyContext.id = 13356;
module.exports = webpackEmptyContext;

/***/ }),

/***/ 19063:
/*!****************************************!*\
  !*** external "require-in-the-middle" ***!
  \****************************************/
/***/ ((module) => {

"use strict";
module.exports = require("require-in-the-middle");

/***/ }),

/***/ 19771:
/*!**************************!*\
  !*** external "process" ***!
  \**************************/
/***/ ((module) => {

"use strict";
module.exports = require("process");

/***/ }),

/***/ 21820:
/*!*********************!*\
  !*** external "os" ***!
  \*********************/
/***/ ((module) => {

"use strict";
module.exports = require("os");

/***/ }),

/***/ 28354:
/*!***********************!*\
  !*** external "util" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("util");

/***/ }),

/***/ 29021:
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ 31421:
/*!*************************************!*\
  !*** external "node:child_process" ***!
  \*************************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:child_process");

/***/ }),

/***/ 33873:
/*!***********************!*\
  !*** external "path" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("path");

/***/ }),

/***/ 36686:
/*!**************************************!*\
  !*** external "diagnostics_channel" ***!
  \**************************************/
/***/ ((module) => {

"use strict";
module.exports = require("diagnostics_channel");

/***/ }),

/***/ 37067:
/*!****************************!*\
  !*** external "node:http" ***!
  \****************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:http");

/***/ }),

/***/ 38522:
/*!****************************!*\
  !*** external "node:zlib" ***!
  \****************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:zlib");

/***/ }),

/***/ 41692:
/*!***************************!*\
  !*** external "node:tls" ***!
  \***************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:tls");

/***/ }),

/***/ 43909:
/*!********************************!*\
  !*** ./src/instrumentation.ts ***!
  \********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   onRequestError: () => (/* binding */ onRequestError),\n/* harmony export */   register: () => (/* binding */ register)\n/* harmony export */ });\n/* harmony import */ var _sentry_nextjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @sentry/nextjs */ 37340);\n/* harmony import */ var _sentry_nextjs__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_sentry_nextjs__WEBPACK_IMPORTED_MODULE_0__);\n// src/instrumentation.ts\n// Next.js instrumentation file for Sentry error monitoring\n// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation\nglobalThis[\"_sentryRewritesTunnelPath\"] = \"/monitoring\";\nglobalThis[\"SENTRY_RELEASE\"] = undefined;\nglobalThis[\"_sentryBasePath\"] = undefined;\nglobalThis[\"_sentryNextJsVersion\"] = \"16.1.6\";\nglobalThis[\"_sentryRewriteFramesDistDir\"] = \".next-playwright-tarot\";\n\n// Export error handler for nested React Server Components\nconst onRequestError = _sentry_nextjs__WEBPACK_IMPORTED_MODULE_0__.captureRequestError;\nasync function register() {\n    if (true) {\n        // Server-side Sentry initialization\n        const Sentry = await Promise.resolve(/*! import() */).then(__webpack_require__.t.bind(__webpack_require__, /*! @sentry/nextjs */ 37340, 23));\n        Sentry.init({\n            dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,\n            environment: \"development\",\n            // Performance monitoring\n            tracesSampleRate:  false ? 0 : 1.0,\n            // Debug mode for development\n            debug: false,\n            // Filter out certain errors\n            beforeSend (event, hint) {\n                // Don't send errors in development unless explicitly enabled\n                if ( true && !process.env.SENTRY_DEBUG) {\n                    return null;\n                }\n                // Filter out known non-actionable errors\n                const error = hint.originalException;\n                if (error instanceof Error) {\n                    // Rate limit errors are expected\n                    if (error.message?.includes('Too many requests')) {\n                        return null;\n                    }\n                    // Authentication errors are user-facing\n                    if (error.message?.includes('Unauthorized')) {\n                        return null;\n                    }\n                }\n                return event;\n            }\n        });\n    }\n    if (false) {}\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiNDM5MDkuanMiLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUFBLHlCQUF5QjtBQUN6QiwyREFBMkQ7QUFDM0QsbUZBQW1GO0FBRWxGQSxVQUFVLENBQUMsNEJBQTRCLEdBQUc7QUFBY0EsVUFBVSxDQUFDLGlCQUFpQixHQUFHQztBQUFVRCxVQUFVLENBQUMsa0JBQWtCLEdBQUdDO0FBQVVELFVBQVUsQ0FBQyx1QkFBdUIsR0FBRztBQUFTQSxVQUFVLENBQUMsOEJBQThCLEdBQUc7QUFBa0U7QUFFeFMsMERBQTBEO0FBQ25ELE1BQU1HLGlCQUFpQkQsK0RBQTBCLENBQUM7QUFFbEQsZUFBZUc7SUFDcEIsSUFBSUMsSUFBcUMsRUFBRTtRQUN6QyxvQ0FBb0M7UUFDcEMsTUFBTUosU0FBUyxNQUFNLHVIQUF3QjtRQUU3Q0EsT0FBT08sSUFBSSxDQUFDO1lBQ1ZDLEtBQUtKLFFBQVFDLEdBQUcsQ0FBQ0ksc0JBQXNCO1lBQ3ZDQztZQUVBLHlCQUF5QjtZQUN6QkMsa0JBQWtCUCxNQUFxQyxHQUFHLENBQUcsR0FBRztZQUVoRSw2QkFBNkI7WUFDN0JRLE9BQU87WUFFUCw0QkFBNEI7WUFDNUJDLFlBQVdDLEtBQUssRUFBRUMsSUFBSTtnQkFDcEIsNkRBQTZEO2dCQUM3RCxJQUFJWCxLQUFzQyxJQUFJLENBQUNBLFFBQVFDLEdBQUcsQ0FBQ1csWUFBWSxFQUFFO29CQUN2RSxPQUFPO2dCQUNUO2dCQUVBLHlDQUF5QztnQkFDekMsTUFBTUMsUUFBUUYsS0FBS0csaUJBQWlCO2dCQUNwQyxJQUFJRCxpQkFBaUJFLE9BQU87b0JBQzFCLGlDQUFpQztvQkFDakMsSUFBSUYsTUFBTUcsT0FBTyxFQUFFQyxTQUFTLHNCQUFzQjt3QkFDaEQsT0FBTztvQkFDVDtvQkFDQSx3Q0FBd0M7b0JBQ3hDLElBQUlKLE1BQU1HLE9BQU8sRUFBRUMsU0FBUyxpQkFBaUI7d0JBQzNDLE9BQU87b0JBQ1Q7Z0JBQ0Y7Z0JBRUEsT0FBT1A7WUFDVDtRQUNGO0lBQ0Y7SUFFQSxJQUFJVixLQUFtQyxFQUFFLEVBVXhDO0FBQ0giLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xccGp5cmhcXERlc2t0b3BcXHNhanUtYXN0cm8tY2hhdC1iYWNrdXAtbGF0ZXN0XFxzcmNcXGluc3RydW1lbnRhdGlvbi50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBzcmMvaW5zdHJ1bWVudGF0aW9uLnRzXG4vLyBOZXh0LmpzIGluc3RydW1lbnRhdGlvbiBmaWxlIGZvciBTZW50cnkgZXJyb3IgbW9uaXRvcmluZ1xuLy8gaHR0cHM6Ly9uZXh0anMub3JnL2RvY3MvYXBwL2J1aWxkaW5nLXlvdXItYXBwbGljYXRpb24vb3B0aW1pemluZy9pbnN0cnVtZW50YXRpb25cblxuO2dsb2JhbFRoaXNbXCJfc2VudHJ5UmV3cml0ZXNUdW5uZWxQYXRoXCJdID0gXCIvbW9uaXRvcmluZ1wiO2dsb2JhbFRoaXNbXCJTRU5UUllfUkVMRUFTRVwiXSA9IHVuZGVmaW5lZDtnbG9iYWxUaGlzW1wiX3NlbnRyeUJhc2VQYXRoXCJdID0gdW5kZWZpbmVkO2dsb2JhbFRoaXNbXCJfc2VudHJ5TmV4dEpzVmVyc2lvblwiXSA9IFwiMTYuMS42XCI7Z2xvYmFsVGhpc1tcIl9zZW50cnlSZXdyaXRlRnJhbWVzRGlzdERpclwiXSA9IFwiLm5leHQtcGxheXdyaWdodC10YXJvdFwiO2ltcG9ydCAqIGFzIFNlbnRyeSBmcm9tICdAc2VudHJ5L25leHRqcyc7XG5cbi8vIEV4cG9ydCBlcnJvciBoYW5kbGVyIGZvciBuZXN0ZWQgUmVhY3QgU2VydmVyIENvbXBvbmVudHNcbmV4cG9ydCBjb25zdCBvblJlcXVlc3RFcnJvciA9IFNlbnRyeS5jYXB0dXJlUmVxdWVzdEVycm9yO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVnaXN0ZXIoKSB7XG4gIGlmIChwcm9jZXNzLmVudi5ORVhUX1JVTlRJTUUgPT09ICdub2RlanMnKSB7XG4gICAgLy8gU2VydmVyLXNpZGUgU2VudHJ5IGluaXRpYWxpemF0aW9uXG4gICAgY29uc3QgU2VudHJ5ID0gYXdhaXQgaW1wb3J0KCdAc2VudHJ5L25leHRqcycpO1xuXG4gICAgU2VudHJ5LmluaXQoe1xuICAgICAgZHNuOiBwcm9jZXNzLmVudi5ORVhUX1BVQkxJQ19TRU5UUllfRFNOLFxuICAgICAgZW52aXJvbm1lbnQ6IHByb2Nlc3MuZW52Lk5PREVfRU5WLFxuXG4gICAgICAvLyBQZXJmb3JtYW5jZSBtb25pdG9yaW5nXG4gICAgICB0cmFjZXNTYW1wbGVSYXRlOiBwcm9jZXNzLmVudi5OT0RFX0VOViA9PT0gJ3Byb2R1Y3Rpb24nID8gMC4xIDogMS4wLFxuXG4gICAgICAvLyBEZWJ1ZyBtb2RlIGZvciBkZXZlbG9wbWVudFxuICAgICAgZGVidWc6IGZhbHNlLFxuXG4gICAgICAvLyBGaWx0ZXIgb3V0IGNlcnRhaW4gZXJyb3JzXG4gICAgICBiZWZvcmVTZW5kKGV2ZW50LCBoaW50KSB7XG4gICAgICAgIC8vIERvbid0IHNlbmQgZXJyb3JzIGluIGRldmVsb3BtZW50IHVubGVzcyBleHBsaWNpdGx5IGVuYWJsZWRcbiAgICAgICAgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WID09PSAnZGV2ZWxvcG1lbnQnICYmICFwcm9jZXNzLmVudi5TRU5UUllfREVCVUcpIHtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZpbHRlciBvdXQga25vd24gbm9uLWFjdGlvbmFibGUgZXJyb3JzXG4gICAgICAgIGNvbnN0IGVycm9yID0gaGludC5vcmlnaW5hbEV4Y2VwdGlvbjtcbiAgICAgICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgICAvLyBSYXRlIGxpbWl0IGVycm9ycyBhcmUgZXhwZWN0ZWRcbiAgICAgICAgICBpZiAoZXJyb3IubWVzc2FnZT8uaW5jbHVkZXMoJ1RvbyBtYW55IHJlcXVlc3RzJykpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBBdXRoZW50aWNhdGlvbiBlcnJvcnMgYXJlIHVzZXItZmFjaW5nXG4gICAgICAgICAgaWYgKGVycm9yLm1lc3NhZ2U/LmluY2x1ZGVzKCdVbmF1dGhvcml6ZWQnKSkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGV2ZW50O1xuICAgICAgfSxcbiAgICB9KTtcbiAgfVxuXG4gIGlmIChwcm9jZXNzLmVudi5ORVhUX1JVTlRJTUUgPT09ICdlZGdlJykge1xuICAgIC8vIEVkZ2UgcnVudGltZSBTZW50cnkgaW5pdGlhbGl6YXRpb25cbiAgICBjb25zdCBTZW50cnkgPSBhd2FpdCBpbXBvcnQoJ0BzZW50cnkvbmV4dGpzJyk7XG5cbiAgICBTZW50cnkuaW5pdCh7XG4gICAgICBkc246IHByb2Nlc3MuZW52Lk5FWFRfUFVCTElDX1NFTlRSWV9EU04sXG4gICAgICBlbnZpcm9ubWVudDogcHJvY2Vzcy5lbnYuTk9ERV9FTlYsXG4gICAgICB0cmFjZXNTYW1wbGVSYXRlOiBwcm9jZXNzLmVudi5OT0RFX0VOViA9PT0gJ3Byb2R1Y3Rpb24nID8gMC4xIDogMS4wLFxuICAgICAgZGVidWc6IGZhbHNlLFxuICAgIH0pO1xuICB9XG59XG4iXSwibmFtZXMiOlsiZ2xvYmFsVGhpcyIsInVuZGVmaW5lZCIsIlNlbnRyeSIsIm9uUmVxdWVzdEVycm9yIiwiY2FwdHVyZVJlcXVlc3RFcnJvciIsInJlZ2lzdGVyIiwicHJvY2VzcyIsImVudiIsIk5FWFRfUlVOVElNRSIsImluaXQiLCJkc24iLCJORVhUX1BVQkxJQ19TRU5UUllfRFNOIiwiZW52aXJvbm1lbnQiLCJ0cmFjZXNTYW1wbGVSYXRlIiwiZGVidWciLCJiZWZvcmVTZW5kIiwiZXZlbnQiLCJoaW50IiwiU0VOVFJZX0RFQlVHIiwiZXJyb3IiLCJvcmlnaW5hbEV4Y2VwdGlvbiIsIkVycm9yIiwibWVzc2FnZSIsImluY2x1ZGVzIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///43909\n");

/***/ }),

/***/ 44708:
/*!*****************************!*\
  !*** external "node:https" ***!
  \*****************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:https");

/***/ }),

/***/ 48161:
/*!**************************!*\
  !*** external "node:os" ***!
  \**************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:os");

/***/ }),

/***/ 53053:
/*!*******************************************!*\
  !*** external "node:diagnostics_channel" ***!
  \*******************************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:diagnostics_channel");

/***/ }),

/***/ 55511:
/*!*************************!*\
  !*** external "crypto" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("crypto");

/***/ }),

/***/ 56801:
/*!***************************************!*\
  !*** external "import-in-the-middle" ***!
  \***************************************/
/***/ ((module) => {

"use strict";
module.exports = require("import-in-the-middle");

/***/ }),

/***/ 57075:
/*!******************************!*\
  !*** external "node:stream" ***!
  \******************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:stream");

/***/ }),

/***/ 57207:
/*!************************************************************************************************************************!*\
  !*** ./node_modules/@prisma/instrumentation/node_modules/@opentelemetry/instrumentation/build/esm/platform/node/ sync ***!
  \************************************************************************************************************************/
/***/ ((module) => {

function webpackEmptyContext(req) {
	var e = new Error("Cannot find module '" + req + "'");
	e.code = 'MODULE_NOT_FOUND';
	throw e;
}
webpackEmptyContext.keys = () => ([]);
webpackEmptyContext.resolve = webpackEmptyContext;
webpackEmptyContext.id = 57207;
module.exports = webpackEmptyContext;

/***/ }),

/***/ 57975:
/*!****************************!*\
  !*** external "node:util" ***!
  \****************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:util");

/***/ }),

/***/ 73024:
/*!**************************!*\
  !*** external "node:fs" ***!
  \**************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:fs");

/***/ }),

/***/ 73566:
/*!*********************************!*\
  !*** external "worker_threads" ***!
  \*********************************/
/***/ ((module) => {

"use strict";
module.exports = require("worker_threads");

/***/ }),

/***/ 75919:
/*!**************************************!*\
  !*** external "node:worker_threads" ***!
  \**************************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:worker_threads");

/***/ }),

/***/ 76760:
/*!****************************!*\
  !*** external "node:path" ***!
  \****************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:path");

/***/ }),

/***/ 77030:
/*!***************************!*\
  !*** external "node:net" ***!
  \***************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:net");

/***/ }),

/***/ 78474:
/*!******************************!*\
  !*** external "node:events" ***!
  \******************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:events");

/***/ }),

/***/ 79551:
/*!**********************!*\
  !*** external "url" ***!
  \**********************/
/***/ ((module) => {

"use strict";
module.exports = require("url");

/***/ }),

/***/ 79646:
/*!********************************!*\
  !*** external "child_process" ***!
  \********************************/
/***/ ((module) => {

"use strict";
module.exports = require("child_process");

/***/ }),

/***/ 80481:
/*!********************************!*\
  !*** external "node:readline" ***!
  \********************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:readline");

/***/ }),

/***/ 83997:
/*!**********************!*\
  !*** external "tty" ***!
  \**********************/
/***/ ((module) => {

"use strict";
module.exports = require("tty");

/***/ }),

/***/ 84297:
/*!******************************!*\
  !*** external "async_hooks" ***!
  \******************************/
/***/ ((module) => {

"use strict";
module.exports = require("async_hooks");

/***/ }),

/***/ 86592:
/*!*********************************!*\
  !*** external "node:inspector" ***!
  \*********************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:inspector");

/***/ }),

/***/ 94735:
/*!*************************!*\
  !*** external "events" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("events");

/***/ }),

/***/ 98995:
/*!******************************!*\
  !*** external "node:module" ***!
  \******************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:module");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("./webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["common","vendors-_instrument_node_modules_sentry_nextjs_build_cjs_index_server_js"], () => (__webpack_exec__(43909)));
module.exports = __webpack_exports__;

})();