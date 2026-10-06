"use client";

import { useEffect, useState } from "react";
import { Clock, Check, X, Calendar as CalendarIcon, AlertCircle, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getStudentLessonsForPortal } from "@/lib/schedule/repository";
import type { Lesson } from "@/lib/schedule/types";
import { useToast } from "@/components/ui/toast";

// Firebase callables - in reality we would import the initialized functions
// import { getFunctions, httpsCallable } from "firebase/functions";

export function StudentScheduleTab({ 
  teacherUid, 
  studentId 
}: { 
  teacherUid: string; 
  studentId: string;
}) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<Lesson[]>([]);

  useEffect(() => {
    let active = true;
    
    getStudentLessonsForPortal(teacherUid, studentId).then((data) => {
      if (!active) return;
      // Filter out past cancelled or old lessons for clarity
      const now = new Date();
      now.setHours(now.getHours() - 1); // Keep lessons up to 1 hr ago
      
      const upcoming = data
        .filter(l => l.start > now && l.status !== "cancelled")
        .sort((a, b) => a.start.getTime() - b.start.getTime());
        
      setLessons(upcoming);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      if (active) setLoading(false);
    });

    return () => { active = false; };
  }, [teacherUid, studentId]);

  const handleRespond = async (lessonId: string, accept: boolean) => {
    // const functions = getFunctions();
    // const respond = httpsCallable(functions, 'respondToProposal');
    // await respond({ teacherUid, lessonId, accept });
    
    toast(accept ? "Lesson confirmed!" : "Lesson declined.");
    
    if (accept) {
      setLessons(prev => prev.map(l => l.id === lessonId ? { ...l, confirmation: "confirmed" } : l));
    } else {
      setLessons(prev => prev.filter(l => l.id !== lessonId));
    }
  };

  const handleJoin = async (lessonId: string) => {
    // const functions = getFunctions();
    // const join = httpsCallable(functions, 'joinLesson');
    // const result = await join({ teacherUid, lessonId });
    // window.open(result.data.meetingUrl, "_blank");
    toast("Opening meeting link and deducting 1 credit...");
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2.5 font-display text-xl font-medium text-fg">
          <span className="flex size-8 items-center justify-center rounded-full bg-accent-muted text-accent">
            <CalendarIcon className="size-4" />
          </span>
          My Schedule
        </h2>
        <Button className="bg-accent text-primary hover:bg-accent/90">
          Book a Lesson
        </Button>
      </div>

      {lessons.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border-strong bg-elevated p-12 text-center text-sm text-fg-secondary">
          You don't have any upcoming lessons scheduled.
        </div>
      ) : (
        <div className="space-y-4">
          {lessons.map(lesson => {
            const isProposed = lesson.confirmation === "pending-student";
            const isPendingTeacher = lesson.confirmation === "pending-teacher";
            const isConfirmed = lesson.confirmation === "confirmed";
            
            // Check if we are within 15 minutes of start time
            const now = new Date();
            const diffMs = lesson.start.getTime() - now.getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const canJoin = isConfirmed && diffMins <= 15 && diffMins >= -60;

            return (
              <article key={lesson.id} className="rounded-2xl border border-border-subtle bg-elevated p-5 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between shadow-sm">
                <div className="flex gap-4">
                  <div className="flex flex-col items-center justify-center bg-primary rounded-xl p-3 border border-border-subtle min-w-17.5">
                    <span className="text-xs font-semibold text-accent uppercase tracking-wider">{lesson.start.toLocaleString('en-US', { month: 'short' })}</span>
                    <span className="text-2xl font-display font-medium text-fg">{lesson.start.getDate()}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      {lesson.start.toLocaleString('en-US', { weekday: 'long' })} at {lesson.start.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      {isProposed && (
                         <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">Proposal</span>
                      )}
                      {isPendingTeacher && (
                         <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">Awaiting Teacher</span>
                      )}
                      {isConfirmed && (
                         <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 border border-green-500/20">Confirmed</span>
                      )}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-fg-secondary mt-1">
                      <span className="flex items-center gap-1"><Clock className="size-3.5" /> {lesson.durationMin} min</span>
                      <span className="flex items-center gap-1 capitalize"><Video className="size-3.5" /> {lesson.mode}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  {isProposed && (
                    <>
                      <Button size="sm" onClick={() => handleRespond(lesson.id, true)} className="flex-1 md:flex-none bg-blue-500 text-white hover:bg-blue-600">
                        <Check className="size-4 mr-1" /> Accept
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => handleRespond(lesson.id, false)} className="flex-1 md:flex-none">
                        <X className="size-4 mr-1" /> Decline
                      </Button>
                    </>
                  )}

                  {canJoin && (
                    <div className="flex flex-col items-end gap-1 w-full md:w-auto">
                      <Button onClick={() => handleJoin(lesson.id)} className="w-full bg-green-500 hover:bg-green-600 text-white shadow-lg animate-pulse">
                        <Video className="size-4 mr-2" /> Join Lesson
                      </Button>
                      <span className="text-[10px] text-muted flex items-center gap-1">
                        <AlertCircle className="size-3" /> Uses 1 credit
                      </span>
                    </div>
                  )}

                  {!isProposed && !canJoin && (
                    <Button variant="ghost" size="sm" className="w-full md:w-auto" onClick={() => toast("Canceling...")}>
                      Cancel / Reschedule
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
