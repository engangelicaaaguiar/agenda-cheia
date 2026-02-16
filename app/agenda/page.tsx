import { AgendaClient } from "./agenda-client";
import { getAvailability } from "./actions";

export const dynamic = "force-dynamic";

export default async function AgendaPage() {
  const initialSlots = await getAvailability();
  return <AgendaClient initialSlots={initialSlots} />;
}
