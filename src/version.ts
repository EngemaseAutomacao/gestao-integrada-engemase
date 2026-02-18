// Version is auto-incremented. Update PATCH for fixes, MINOR for features, MAJOR for breaking changes.
export const APP_VERSION = "1.1.0";

declare global {
  const __BUILD_DATE__: string;
}

export const BUILD_DATE = __BUILD_DATE__;
