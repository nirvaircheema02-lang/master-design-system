import { registryDoc } from "../../lib/registry-doc";

export const dynamic = "force-static";
export function GET() {
  return new Response(JSON.stringify(registryDoc(), null, 2) + "\n", { headers: { "content-type": "application/json; charset=utf-8" } });
}
