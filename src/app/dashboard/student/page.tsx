import type { Metadata } from "next";
import { Suspense } from "react";
import { RequireAuth } from "@/components/auth/require-auth";
import { StudentProfileView } from "@/components/dashboard/student-profile-view";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Student Profile",
  robots: { index: false },
};

export default function StudentPage() {
  return (
    <RequireAuth>
      <Suspense
        fallback={
          <div className="mx-auto w-full max-w-[1000px] p-6">
            <Skeleton className="h-64 w-full rounded-3xl" />
          </div>
        }
      >
        <StudentProfileView />
      </Suspense>
    </RequireAuth>
  );
}
