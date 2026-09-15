// The OSS desktop build defines __APP_NAME__; any shell that doesn't keeps the product name.
export const APP_NAME = typeof __APP_NAME__ === "undefined" ? "Widgetizer" : __APP_NAME__;
