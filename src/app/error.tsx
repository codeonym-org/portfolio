"use client";

import { useEffect } from "react";
import { StatusScreen } from "@/components/system/status-screen";

/** a fault while a page renders, below the root layout */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return <StatusScreen kind="error" reset={reset} digest={error.digest} />;
}
