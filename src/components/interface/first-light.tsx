import { Shell } from "@/components/interface/shell";
import { Stage } from "@/components/scene/stage";

/** the record: the Monolith, the record in orbit and the System */
export function FirstLight() {
  return (
    <main className="grain relative h-dvh w-full overflow-hidden">
      <Stage />
      <Shell />
    </main>
  );
}
