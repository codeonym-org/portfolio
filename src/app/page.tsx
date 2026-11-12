import { FirstLightGate } from "@/components/gates/first-light-gate";

/** `/` opens the default gate with no choice to make; the Gate Realm is at /gates */
export default function Home() {
  return <FirstLightGate />;
}
