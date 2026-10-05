import type { Metadata } from "next";
import { Suspense } from "react";
import { RequireAuth } from "@/components/auth/require-auth";
import { StudentPortalView } from "@/components/portal/student-portal-view";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Student Portal",
  robots: { index: false },
};

export default function StudentPage() {
  return (
    <RequireAuth allowedRoles={["student"]}>
      <Suspense
        fallback={
          <div className="mx-auto w-full max-w-[900px] space-y-8 px-4 py-12">
            <Skeleton className="h-12 w-64 rounded-2xl" />
            <Skeleton className="h-44 w-full rounded-3xl" />
            <Skeleton className="h-64 w-full rounded-3xl" />
          </div>
        }
      >
        <StudentPortalView />
      </Suspense>
    </RequireAuth>
  );
}
