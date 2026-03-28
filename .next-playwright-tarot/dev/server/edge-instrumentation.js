// runtime can't be in strict mode because a global variable is assign and maybe created.
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(self["webpackChunk_N_E"] = self["webpackChunk_N_E"] || []).push([["instrumentation"],{

/***/ 4613:
/*!********************************!*\
  !*** ./src/instrumentation.ts ***!
  \********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   onRequestError: () => (/* binding */ onRequestError),\n/* harmony export */   register: () => (/* binding */ register)\n/* harmony export */ });\n/* harmony import */ var _sentry_nextjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @sentry/nextjs */ 4358);\n// src/instrumentation.ts\n// Next.js instrumentation file for Sentry error monitoring\n// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation\nglobalThis[\"_sentryRewritesTunnelPath\"] = \"/monitoring\";\nglobalThis[\"SENTRY_RELEASE\"] = undefined;\nglobalThis[\"_sentryBasePath\"] = undefined;\nglobalThis[\"_sentryNextJsVersion\"] = \"16.1.6\";\nglobalThis[\"_sentryRewriteFramesDistDir\"] = \".next-playwright-tarot\";\n\n// Export error handler for nested React Server Components\nconst onRequestError = _sentry_nextjs__WEBPACK_IMPORTED_MODULE_0__.captureRequestError;\nasync function register() {\n    if (false) {}\n    if (true) {\n        // Edge runtime Sentry initialization\n        const Sentry = await Promise.resolve(/*! import() */).then(__webpack_require__.bind(__webpack_require__, /*! @sentry/nextjs */ 4987));\n        Sentry.init({\n            dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,\n            environment: \"development\",\n            tracesSampleRate:  false ? 0 : 1.0,\n            debug: false\n        });\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiNDYxMy5qcyIsIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSx5QkFBeUI7QUFDekIsMkRBQTJEO0FBQzNELG1GQUFtRjtBQUVsRkEsVUFBVSxDQUFDLDRCQUE0QixHQUFHO0FBQWNBLFVBQVUsQ0FBQyxpQkFBaUIsR0FBR0M7QUFBVUQsVUFBVSxDQUFDLGtCQUFrQixHQUFHQztBQUFVRCxVQUFVLENBQUMsdUJBQXVCLEdBQUc7QUFBU0EsVUFBVSxDQUFDLDhCQUE4QixHQUFHO0FBQWtFO0FBRXhTLDBEQUEwRDtBQUNuRCxNQUFNRyxpQkFBaUJELCtEQUEwQixDQUFDO0FBRWxELGVBQWVHO0lBQ3BCLElBQUlDLEtBQXFDLEVBQUUsRUFxQzFDO0lBRUQsSUFBSUEsSUFBbUMsRUFBRTtRQUN2QyxxQ0FBcUM7UUFDckMsTUFBTUosU0FBUyxNQUFNLGdIQUF3QjtRQUU3Q0EsT0FBT08sSUFBSSxDQUFDO1lBQ1ZDLEtBQUtKLFFBQVFDLEdBQUcsQ0FBQ0ksc0JBQXNCO1lBQ3ZDQztZQUNBQyxrQkFBa0JQLE1BQXFDLEdBQUcsQ0FBRyxHQUFHO1lBQ2hFUSxPQUFPO1FBQ1Q7SUFDRjtBQUNGIiwic291cmNlcyI6WyJDOlxcVXNlcnNcXHBqeXJoXFxEZXNrdG9wXFxzYWp1LWFzdHJvLWNoYXQtYmFja3VwLWxhdGVzdFxcc3JjXFxpbnN0cnVtZW50YXRpb24udHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gc3JjL2luc3RydW1lbnRhdGlvbi50c1xuLy8gTmV4dC5qcyBpbnN0cnVtZW50YXRpb24gZmlsZSBmb3IgU2VudHJ5IGVycm9yIG1vbml0b3Jpbmdcbi8vIGh0dHBzOi8vbmV4dGpzLm9yZy9kb2NzL2FwcC9idWlsZGluZy15b3VyLWFwcGxpY2F0aW9uL29wdGltaXppbmcvaW5zdHJ1bWVudGF0aW9uXG5cbjtnbG9iYWxUaGlzW1wiX3NlbnRyeVJld3JpdGVzVHVubmVsUGF0aFwiXSA9IFwiL21vbml0b3JpbmdcIjtnbG9iYWxUaGlzW1wiU0VOVFJZX1JFTEVBU0VcIl0gPSB1bmRlZmluZWQ7Z2xvYmFsVGhpc1tcIl9zZW50cnlCYXNlUGF0aFwiXSA9IHVuZGVmaW5lZDtnbG9iYWxUaGlzW1wiX3NlbnRyeU5leHRKc1ZlcnNpb25cIl0gPSBcIjE2LjEuNlwiO2dsb2JhbFRoaXNbXCJfc2VudHJ5UmV3cml0ZUZyYW1lc0Rpc3REaXJcIl0gPSBcIi5uZXh0LXBsYXl3cmlnaHQtdGFyb3RcIjtpbXBvcnQgKiBhcyBTZW50cnkgZnJvbSAnQHNlbnRyeS9uZXh0anMnO1xuXG4vLyBFeHBvcnQgZXJyb3IgaGFuZGxlciBmb3IgbmVzdGVkIFJlYWN0IFNlcnZlciBDb21wb25lbnRzXG5leHBvcnQgY29uc3Qgb25SZXF1ZXN0RXJyb3IgPSBTZW50cnkuY2FwdHVyZVJlcXVlc3RFcnJvcjtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlZ2lzdGVyKCkge1xuICBpZiAocHJvY2Vzcy5lbnYuTkVYVF9SVU5USU1FID09PSAnbm9kZWpzJykge1xuICAgIC8vIFNlcnZlci1zaWRlIFNlbnRyeSBpbml0aWFsaXphdGlvblxuICAgIGNvbnN0IFNlbnRyeSA9IGF3YWl0IGltcG9ydCgnQHNlbnRyeS9uZXh0anMnKTtcblxuICAgIFNlbnRyeS5pbml0KHtcbiAgICAgIGRzbjogcHJvY2Vzcy5lbnYuTkVYVF9QVUJMSUNfU0VOVFJZX0RTTixcbiAgICAgIGVudmlyb25tZW50OiBwcm9jZXNzLmVudi5OT0RFX0VOVixcblxuICAgICAgLy8gUGVyZm9ybWFuY2UgbW9uaXRvcmluZ1xuICAgICAgdHJhY2VzU2FtcGxlUmF0ZTogcHJvY2Vzcy5lbnYuTk9ERV9FTlYgPT09ICdwcm9kdWN0aW9uJyA/IDAuMSA6IDEuMCxcblxuICAgICAgLy8gRGVidWcgbW9kZSBmb3IgZGV2ZWxvcG1lbnRcbiAgICAgIGRlYnVnOiBmYWxzZSxcblxuICAgICAgLy8gRmlsdGVyIG91dCBjZXJ0YWluIGVycm9yc1xuICAgICAgYmVmb3JlU2VuZChldmVudCwgaGludCkge1xuICAgICAgICAvLyBEb24ndCBzZW5kIGVycm9ycyBpbiBkZXZlbG9wbWVudCB1bmxlc3MgZXhwbGljaXRseSBlbmFibGVkXG4gICAgICAgIGlmIChwcm9jZXNzLmVudi5OT0RFX0VOViA9PT0gJ2RldmVsb3BtZW50JyAmJiAhcHJvY2Vzcy5lbnYuU0VOVFJZX0RFQlVHKSB7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBGaWx0ZXIgb3V0IGtub3duIG5vbi1hY3Rpb25hYmxlIGVycm9yc1xuICAgICAgICBjb25zdCBlcnJvciA9IGhpbnQub3JpZ2luYWxFeGNlcHRpb247XG4gICAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgICAgLy8gUmF0ZSBsaW1pdCBlcnJvcnMgYXJlIGV4cGVjdGVkXG4gICAgICAgICAgaWYgKGVycm9yLm1lc3NhZ2U/LmluY2x1ZGVzKCdUb28gbWFueSByZXF1ZXN0cycpKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gQXV0aGVudGljYXRpb24gZXJyb3JzIGFyZSB1c2VyLWZhY2luZ1xuICAgICAgICAgIGlmIChlcnJvci5tZXNzYWdlPy5pbmNsdWRlcygnVW5hdXRob3JpemVkJykpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBldmVudDtcbiAgICAgIH0sXG4gICAgfSk7XG4gIH1cblxuICBpZiAocHJvY2Vzcy5lbnYuTkVYVF9SVU5USU1FID09PSAnZWRnZScpIHtcbiAgICAvLyBFZGdlIHJ1bnRpbWUgU2VudHJ5IGluaXRpYWxpemF0aW9uXG4gICAgY29uc3QgU2VudHJ5ID0gYXdhaXQgaW1wb3J0KCdAc2VudHJ5L25leHRqcycpO1xuXG4gICAgU2VudHJ5LmluaXQoe1xuICAgICAgZHNuOiBwcm9jZXNzLmVudi5ORVhUX1BVQkxJQ19TRU5UUllfRFNOLFxuICAgICAgZW52aXJvbm1lbnQ6IHByb2Nlc3MuZW52Lk5PREVfRU5WLFxuICAgICAgdHJhY2VzU2FtcGxlUmF0ZTogcHJvY2Vzcy5lbnYuTk9ERV9FTlYgPT09ICdwcm9kdWN0aW9uJyA/IDAuMSA6IDEuMCxcbiAgICAgIGRlYnVnOiBmYWxzZSxcbiAgICB9KTtcbiAgfVxufVxuIl0sIm5hbWVzIjpbImdsb2JhbFRoaXMiLCJ1bmRlZmluZWQiLCJTZW50cnkiLCJvblJlcXVlc3RFcnJvciIsImNhcHR1cmVSZXF1ZXN0RXJyb3IiLCJyZWdpc3RlciIsInByb2Nlc3MiLCJlbnYiLCJORVhUX1JVTlRJTUUiLCJpbml0IiwiZHNuIiwiTkVYVF9QVUJMSUNfU0VOVFJZX0RTTiIsImVudmlyb25tZW50IiwidHJhY2VzU2FtcGxlUmF0ZSIsImRlYnVnIiwiYmVmb3JlU2VuZCIsImV2ZW50IiwiaGludCIsIlNFTlRSWV9ERUJVRyIsImVycm9yIiwib3JpZ2luYWxFeGNlcHRpb24iLCJFcnJvciIsIm1lc3NhZ2UiLCJpbmNsdWRlcyJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///4613\n");

/***/ }),

/***/ 5356:
/*!******************************!*\
  !*** external "node:buffer" ***!
  \******************************/
/***/ ((module) => {

"use strict";
module.exports = require("node:buffer");

/***/ })

},
/******/ __webpack_require__ => { // webpackRuntimeModules
/******/ var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
/******/ __webpack_require__.O(0, ["vendors-_instrument_node_modules_sentry_nextjs_build_esm_edge_index_js"], () => (__webpack_exec__(4613)));
/******/ var __webpack_exports__ = __webpack_require__.O();
/******/ (_ENTRIES = typeof _ENTRIES === "undefined" ? {} : _ENTRIES).middleware_instrumentation = __webpack_exports__;
/******/ }
]);