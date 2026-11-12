import { Shell } from "@/components/interface/shell";
import { Stage } from "@/components/scene/stage";

/** The Surface (rank C): the Monolith, the record in orbit and the System. */
export function SurfaceGate() {
  return (
    <main className="grain relative h-dvh w-full overflow-hidden">
      <Stage />
      <Shell />
    </main>
  );
}
