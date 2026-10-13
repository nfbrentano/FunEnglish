"use client";

import { BookOpen } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth/use-auth";
import { strings } from "@/lib/strings";
import { SendHomeworkModal } from "./send-homework-modal";

interface SendHomeworkButtonProps {
  activity: { id: string; title: string; slug?: string };
  className?: string;
  children?: ReactNode;
}

export function SendHomeworkButton({ activity, className, children }: SendHomeworkButtonProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      window.location.assign(
        `/login?redirect=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "")}`,
      );
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={className}
        aria-label={strings.homework.sendHomework}
        title={strings.homework.sendHomework}
      >
        {children ?? <BookOpen aria-hidden="true" className="size-4" />}
      </button>

      {open && <SendHomeworkModal activity={activity} open={open} onClose={() => setOpen(false)} />}
    </>
  );
}
