"use client";

import { useEffect } from "react";
import { StatusScreen } from "@/components/system/status-screen";
import "./globals.css";

/** a fault in the root layout itself: the page is drawn without it, so it brings its own html and styles */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full">
        <StatusScreen kind="error" reset={reset} digest={error.digest} />
      </body>
    </html>
  );
}
