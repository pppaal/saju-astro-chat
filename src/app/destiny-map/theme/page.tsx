import { Suspense } from "react";
import ThemeSelectClient from "./ThemeSelectClient";

export default function ThemePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ThemeSelectClient />
    </Suspense>
  );
}