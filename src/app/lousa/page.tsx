import type { Metadata } from "next";
import { RequireAuth } from "@/components/auth/require-auth";
import { WhiteboardPageView } from "@/components/board/whiteboard-page-view";

export const metadata: Metadata = {
  title: "Lousa Digital",
  description: "Lousa interativa e quadro digital para professores no Fun English.",
  robots: { index: false },
};

export default function LousaPage() {
  return (
    <RequireAuth allowedRoles={["teacher"]}>
      <WhiteboardPageView />
    </RequireAuth>
  );
}
