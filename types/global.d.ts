declare global {
  var mongoose: {
    conn: typeof import("mongoose") | null;
    promise: Promise<typeof import("mongoose")> | null;
  } | undefined;
}

// CSS modules support
declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}

// Allow importing global CSS for side effects (no exported bindings required)
declare module "*.css?global";
// Explicit declaration for the root layout side-effect import path
declare module "./globals.css";
