import { Shell } from "@/components/interface/shell";
import { Stage } from "@/components/scene/stage";

export default function Home() {
  return (
    <main className="grain relative h-dvh w-full overflow-hidden">
      <Stage />
      <Shell />
    </main>
  );
}
