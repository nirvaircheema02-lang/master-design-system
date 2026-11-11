import { loadManifests } from "../../../lib/registry";
import { Redirect } from "../../../components/Redirect";

/** Old URL (/c/ID) kept alive: it forwards to /components/ID. (A static export has no server redirects.) */
export function generateStaticParams() { return loadManifests().map((m) => ({ id: m.id })); }

export default async function OldComponentUrl({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Redirect to={`/components/${id}/`} />;
}
