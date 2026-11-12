import type { Metadata } from "next";
import { GateRealm } from "@/components/gates/gate-realm";

export const metadata: Metadata = {
  title: "Gates — CODEONYM",
  description: "Every way into the record of Bouarour Ayoub (codeonym), AI Agent Engineer: a star system where each gate is a world, from a one-minute first look to a sealed world to play.",
};

/** the Gate Realm: the gates as worlds around one star; readable before the 3D scene arrives */
export default function Gates() {
  return (
    <main className="grain relative">
      <GateRealm />
    </main>
  );
}
