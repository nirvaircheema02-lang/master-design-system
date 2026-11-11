export * from "./manifest.ts";
export * from "./config.ts";
export * from "./compat.ts";
export * from "./skin.ts";
import { z } from "zod";
import { manifest } from "./manifest.ts";
import { brandConfig, kitConfig, lock } from "./config.ts";

/** JSON Schemas for editors, CI and future AI tool definitions. */
export const jsonSchemas = {
  manifest: z.toJSONSchema(manifest),
  brandConfig: z.toJSONSchema(brandConfig),
  kitConfig: z.toJSONSchema(kitConfig),
  lock: z.toJSONSchema(lock),
};
