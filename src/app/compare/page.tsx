import { Suspense } from "react";
import { CompareMatrix } from "@/components/compare-matrix";

export const metadata = { title: "Compare programmes · Mobility Explorer" };

export default function ComparePage() {
  return (
    <Suspense>
      <CompareMatrix />
    </Suspense>
  );
}
