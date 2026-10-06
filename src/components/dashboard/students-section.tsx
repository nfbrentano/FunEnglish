"use client";

import { Play, Plus, User } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { useClasses } from "@/lib/classes/use-classes";
import type { SessionMode } from "@/lib/session/types";
import { useSessionContext } from "@/lib/session/session-context";

export function StudentsSection() {
  const { students, loading, addIndividualStudent } = useClasses();
  const session = useSessionContext();
  const toast = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [level, setLevel] = useState("B1");
  const [goal, setGoal] = useState("Conversation");
  const [mode, setMode] = useState("online");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await addIndividualStudent({
        name,
        level,
        goal,
        defaultMode: mode,
      });
      toast(`Student ${name} added!`);
      setModalOpen(false);
      setName("");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error adding student");
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeStudents = students.filter(s => s.status !== "Former");

  return (
    <section id="students" className="scroll-mt-24 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="flex items-center gap-3 font-display text-3xl font-medium">
          <span className="flex size-9 items-center justify-center rounded-full bg-accent-muted text-accent">
            <User aria-hidden="true" className="size-5" />
          </span>
          My Students
        </h2>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="size-4 mr-2" /> Add Student
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-32 w-full rounded-2xl" />
      ) : activeStudents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong p-8 text-center text-fg-secondary">
          No students yet. Add your first 1:1 student!
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {activeStudents.map((student) => (
            <li key={student.id} className="rounded-2xl border border-border-subtle bg-elevated p-5 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <Link href={`/dashboard/student?id=${student.id}`} className="font-display text-xl font-medium text-fg hover:text-accent">
                    {student.name}
                  </Link>
                  <div className="flex items-center gap-2 mt-1 text-sm text-fg-secondary">
                    {student.level && <span className="font-semibold text-accent">{student.level}</span>}
                    {student.goal && <span>· {student.goal}</span>}
                  </div>
                </div>
              </div>
              <Button
                className="w-full bg-accent text-primary hover:bg-accent/90"
                onClick={async () => {
                  try {
                    if (session?.startOneToOne) {
                      await session.startOneToOne(student.id, student.name, student.defaultMode as SessionMode);
                    } else {
                      // Fallback if session context doesn't have startOneToOne yet
                      toast("startOneToOne not implemented in session context yet");
                    }
                  } catch (err) {
                    toast(err instanceof Error ? err.message : "Error starting session");
                  }
                }}
              >
                <Play className="size-4 mr-2 fill-current" /> Start Lesson
              </Button>
            </li>
          ))}
        </ul>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-border-subtle bg-elevated p-6 shadow-2xl">
            <h3 className="font-display text-2xl font-medium text-fg">Add Student</h3>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted">Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="mt-1 min-h-11 w-full rounded-full border border-border-strong bg-primary px-4 text-sm text-fg focus:border-accent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted">Level</label>
                  <select value={level} onChange={e => setLevel(e.target.value)} className="mt-1 min-h-11 w-full rounded-full border border-border-strong bg-primary px-4 text-sm text-fg focus:border-accent">
                    <option value="A1">A1</option>
                    <option value="A2">A2</option>
                    <option value="B1">B1</option>
                    <option value="B2">B2</option>
                    <option value="C1">C1</option>
                    <option value="C2">C2</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted">Mode</label>
                  <select value={mode} onChange={e => setMode(e.target.value)} className="mt-1 min-h-11 w-full rounded-full border border-border-strong bg-primary px-4 text-sm text-fg focus:border-accent">
                    <option value="online">Online</option>
                    <option value="in-person">In person</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted">Goal</label>
                <select value={goal} onChange={e => setGoal(e.target.value)} className="mt-1 min-h-11 w-full rounded-full border border-border-strong bg-primary px-4 text-sm text-fg focus:border-accent">
                  <option value="Conversation">Conversation</option>
                  <option value="Travel">Travel</option>
                  <option value="Work">Work</option>
                  <option value="Exam">Exam</option>
                  <option value="School">School</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting || !name.trim()}>Save</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
