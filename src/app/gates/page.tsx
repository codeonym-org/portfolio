import type { Metadata } from "next";
import { GateCatalog } from "@/components/gates/gate-catalog";

export const metadata: Metadata = {
  title: "Gates — CODEONYM",
  description: "Every way into the record of Bouarour Ayoub (codeonym), AI Agent Engineer: named, ranked gates, from a one-minute surface to a deep world.",
};

/** the catalog of gates — no WebGL, a few kilobytes */
export default function Gates() {
  return (
    <main className="grain relative">
      <GateCatalog />
    </main>
  );
}
