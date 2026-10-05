"use client";

import { useSearchParams } from "next/navigation";
import { StudentLiveView } from "@/components/live/student-live-view";

export function LiveStudentPageClient() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code") || "";

  return <StudentLiveView initialCode={code} />;
}
