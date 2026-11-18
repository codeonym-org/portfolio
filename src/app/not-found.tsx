import type { Metadata } from "next";
import { StatusScreen } from "@/components/system/status-screen";

export const metadata: Metadata = { title: "Not on the record — CODEONYM" };

/** any route that is not a page of the site */
export default function NotFound() {
  return <StatusScreen kind="notFound" />;
}
