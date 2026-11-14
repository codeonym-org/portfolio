import type { Metadata } from "next";
import { Interview } from "@/components/interview/interview";

export const metadata: Metadata = {
  title: "The interview — CODEONYM",
  description:
    "Interview Bouarour Ayoub (codeonym), AI Agent Engineer, through his AI replica: his avatar answers by text or by voice, in the first person, and shows his record as it goes.",
};

/** the avatar alone in the room; every part of its reply floats in its own window */
export default function InterviewPage() {
  return <Interview />;
}
