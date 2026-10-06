"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CalendarClock, MessageCircle, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { getTeacherLessons } from "@/lib/schedule/repository";
import type { Lesson } from "@/lib/schedule/types";
import { getStudentPrivateProfile } from "@/lib/classes/repository";
import { useToast } from "@/components/ui/toast";

export function PendingActionsSection() {
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [pendingLessons, setPendingLessons] = useState<Lesson[]>([]);
  // We'll map student phone numbers if needed for WhatsApp
  const [phones, setPhones] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    let active = true;

    // Fetch lessons from now to 30 days ahead
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + 30);

    getTeacherLessons(user.uid, now, future).then(async (lessons) => {
      if (!active) return;
      
      const pending = lessons.filter(l => 
        l.confirmation === "pending-teacher" || 
        l.confirmation === "pending-student" || 
        (l.bookedBy === "student" && l.confirmation === "confirmed" && l.status === "scheduled")
      );

      // Sort by start date
      pending.sort((a, b) => a.start.getTime() - b.start.getTime());
      
      setPendingLessons(pending);
      setLoading(false);

      // Fetch phones for WhatsApp link for pending-student proposals
      const pendingStudentIds = pending
        .filter(l => l.confirmation === "pending-student")
        .map(l => l.studentId);
      
      const uniqueIds = Array.from(new Set(pendingStudentIds));
      
      const phoneMap: Record<string, string> = {};
      await Promise.all(
        uniqueIds.map(async (id) => {
          try {
            const profile = await getStudentPrivateProfile(id);
            if (profile?.phone) {
              phoneMap[id] = profile.phone;
            }
          } catch (e) {
            // ignore
          }
        })
      );
      if (active) setPhones(phoneMap);

    }).catch(err => {
      console.error(err);
      if (active) setLoading(false);
    });

    return () => { active = false; };
  }, [user]);

  const handleApprove = (lessonId: string) => {
    // In a real implementation we would call a Cloud Function or update the document
    toast("Lesson approved.");
    setPendingLessons(prev => prev.filter(l => l.id !== lessonId));
  };

  const handleDecline = (lessonId: string) => {
    toast("Lesson declined.");
    setPendingLessons(prev => prev.filter(l => l.id !== lessonId));
  };

  const handleShareWhatsApp = (lesson: Lesson) => {
    const phone = phones[lesson.studentId];
    if (!phone) {
      toast("No phone number registered for this student.");
      return;
    }
    const cleaned = phone.replace(/\D/g, "");
    
    // Format the date/time nicely
    const dateStr = lesson.start.toLocaleString(undefined, { 
      weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
    
    const msg = `Hi ${lesson.studentName}! I proposed a new lesson for ${dateStr}. Please check your student portal to accept it: https://app.example.com/portal`;
    window.open(`https://wa.me/${cleaned}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  };

  if (loading) return <Skeleton className="h-48 w-full rounded-2xl" />;

  // If no pending items, we can hide the section entirely or show an empty state.
  // For the dashboard, hiding it when empty keeps things clean.
  if (pendingLessons.length === 0) return null;

  return (
    <section id="pending-actions" aria-labelledby="pending-actions-title" className="scroll-mt-24 space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h2 id="pending-actions-title" className="flex items-center gap-3 font-display text-3xl font-medium">
          <span className="flex size-9 items-center justify-center rounded-full bg-accent-muted text-accent">
            <CalendarClock aria-hidden="true" className="size-5" />
          </span>
          Pending Actions
          <span className="text-sm font-semibold bg-red-500 text-white rounded-full px-2 py-0.5 ml-2">
            {pendingLessons.length}
          </span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pendingLessons.map((lesson) => {
          const isPendingTeacher = lesson.confirmation === "pending-teacher";
          const isPendingStudent = lesson.confirmation === "pending-student";
          const isNewBooking = lesson.bookedBy === "student" && lesson.confirmation === "confirmed";

          return (
            <div key={lesson.id} className="rounded-2xl border border-border-subtle bg-elevated p-5 flex flex-col gap-4 shadow-sm relative overflow-hidden">
              {/* Highlight ribbon for "New" or "Requires Approval" */}
              <div className={`absolute top-0 left-0 w-1 h-full ${isPendingTeacher ? "bg-amber-500" : isNewBooking ? "bg-green-500" : "bg-blue-500"}`} />
              
              <div className="pl-2">
                <div className="flex items-start justify-between">
                  <div className="font-semibold text-lg text-fg">{lesson.studentName}</div>
                  
                  {isNewBooking && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 border border-green-500/20">
                      New
                    </span>
                  )}
                  {isPendingTeacher && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                      Needs Approval
                    </span>
                  )}
                  {isPendingStudent && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20 flex items-center gap-1">
                      <AlertCircle className="size-3" /> Waiting for student
                    </span>
                  )}
                </div>
                
                <div className="text-sm text-fg-secondary mt-1">
                  {lesson.start.toLocaleString(undefined, { weekday: 'short', month: 'long', day: 'numeric' })} at {lesson.start.toLocaleString(undefined, { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="text-xs text-muted mt-1">
                  {lesson.durationMin} min · {lesson.mode}
                </div>
              </div>

              <div className="mt-auto pl-2 pt-2 border-t border-border-subtle flex gap-2">
                {isPendingTeacher && (
                  <>
                    <Button size="sm" onClick={() => handleApprove(lesson.id)} className="flex-1 bg-amber-500 text-white hover:bg-amber-600">
                      <Check className="size-4 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => handleDecline(lesson.id)} className="flex-1">
                      <X className="size-4 mr-1" /> Decline
                    </Button>
                  </>
                )}
                
                {isPendingStudent && (
                  <Button size="sm" variant="secondary" onClick={() => handleShareWhatsApp(lesson)} className="w-full">
                    <MessageCircle className="size-4 mr-2" /> Share via WhatsApp
                  </Button>
                )}

                {isNewBooking && (
                  <Button size="sm" variant="secondary" className="w-full" onClick={() => {
                     // Just dismiss the "new" badge locally for the demo
                     setPendingLessons(prev => prev.filter(l => l.id !== lesson.id));
                  }}>
                    Dismiss
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
