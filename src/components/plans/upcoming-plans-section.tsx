"use client";

import {
  Calendar,
  Clock,
  Copy,
  Edit2,
  ListOrdered,
  Play,
  Plus,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth/use-auth";
import { useClasses } from "@/lib/classes/use-classes";
import {
  deletePlan,
  duplicatePlan,
  getUpcomingPlansForClass,
  getUpcomingPlansForStudent,
} from "@/lib/plans/repository";
import { sumMinutes, type Plan, type PlanTargetType } from "@/lib/plans/types";
import { useSessionContext } from "@/lib/session/session-context";
import { PlanEditorModal } from "./plan-editor-modal";

interface UpcomingPlansSectionProps {
  targetType: PlanTargetType;
  targetId: string;
  targetName: string;
  studentIds?: string[]; // Needed for class sessions
  initialGoal?: string;
  suggestedWords?: string[];
}

export function UpcomingPlansSection({
  targetType,
  targetId,
  targetName,
  studentIds = [],
  initialGoal,
  suggestedWords = [],
}: UpcomingPlansSectionProps) {
  const { user } = useAuth();
  const session = useSessionContext();
  const { students } = useClasses();
  const toast = useToast();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadPlans = useCallback(async () => {
    if (!user || !targetId) return;
    try {
      setLoading(true);
      const res =
        targetType === "student"
          ? await getUpcomingPlansForStudent(user.uid, targetId)
          : await getUpcomingPlansForClass(user.uid, targetId);
      setPlans(res);
    } catch (err) {
      console.warn("Failed loading upcoming plans:", err);
    } finally {
      setLoading(false);
    }
  }, [user, targetType, targetId]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const handleStartFromPlan = async (plan: Plan) => {
    try {
      if (targetType === "student") {
        await session?.startOneToOne(targetId, targetName, "online", plan);
        toast(`Started 1:1 lesson with plan "${plan.title}"`);
      } else {
        await session?.startClass(targetId, targetName, studentIds, plan);
        toast(`Started class with plan "${plan.title}"`);
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error starting session");
    }
  };

  const handleDuplicate = async (plan: Plan) => {
    if (!user) return;
    try {
      const copy = await duplicatePlan(user.uid, plan, {
        targetType,
        classId: targetType === "class" ? targetId : undefined,
        studentId: targetType === "student" ? targetId : undefined,
      });
      toast(`Duplicated "${plan.title}"`);
      loadPlans();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error duplicating plan");
    }
  };

  const handleDelete = async (planId: string) => {
    if (!user) return;
    try {
      await deletePlan(user.uid, planId);
      toast("Plan deleted.");
      setPlans((prev) => prev.filter((p) => p.id !== planId));
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error deleting plan");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListOrdered className="size-4 text-accent" />
          <h4 className="font-display text-lg font-medium text-fg">
            Upcoming Plans {plans.length > 0 && `(${plans.length})`}
          </h4>
        </div>
        <Button
          size="sm"
          variant="secondary"
          className="text-xs"
          onClick={() => {
            setEditingPlan(null);
            setIsModalOpen(true);
          }}
        >
          <Plus className="size-3.5 mr-1" />
          New Plan
        </Button>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border-subtle bg-secondary/30 p-4 text-xs text-muted animate-pulse">
          Loading lesson plans...
        </div>
      ) : plans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-strong p-6 text-center">
          <p className="text-xs text-muted mb-3">No upcoming lesson plans prepared.</p>
          <Button
            size="sm"
            variant="ghost"
            className="text-xs border border-border-subtle"
            onClick={() => {
              setEditingPlan(null);
              setIsModalOpen(true);
            }}
          >
            <Plus className="size-3.5 mr-1" />
            Create First Plan
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {plans.map((plan) => {
            const totalMins = sumMinutes(plan.items);
            return (
              <div
                key={plan.id}
                className="flex flex-col justify-between rounded-2xl border border-border-subtle bg-elevated p-4 transition-colors hover:border-border-strong"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h5 className="font-display text-base font-semibold text-fg line-clamp-1">
                      {plan.title}
                    </h5>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPlan(plan);
                          setIsModalOpen(true);
                        }}
                        title="Edit Plan"
                        className="p-1 text-fg-secondary hover:text-fg"
                      >
                        <Edit2 className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDuplicate(plan)}
                        title="Duplicate Plan"
                        className="p-1 text-fg-secondary hover:text-fg"
                      >
                        <Copy className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(plan.id)}
                        title="Delete Plan"
                        className="p-1 text-fg-secondary hover:text-error"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  {plan.goal && (
                    <p className="text-xs text-fg-secondary line-clamp-2 italic">
                      &ldquo;{plan.goal}&rdquo;
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3 text-accent" />
                      {plan.items.length} items ({totalMins} min)
                    </span>
                    {plan.scheduledFor && (
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3 text-accent" />
                        {new Date(plan.scheduledFor).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-border-subtle mt-3 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-muted">
                    {plan.words.length > 0
                      ? `${plan.words.length} target word${plan.words.length === 1 ? "" : "s"}`
                      : "Ready"}
                  </span>
                  <Button
                    size="sm"
                    className="text-xs bg-accent text-primary hover:bg-accent/90"
                    onClick={() => handleStartFromPlan(plan)}
                  >
                    <Play className="size-3 fill-current mr-1.5" />
                    {targetType === "student" ? "Start lesson" : "Start class"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Editor Modal */}
      <PlanEditorModal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingPlan(null);
        }}
        plan={editingPlan}
        initialTarget={{
          targetType,
          classId: targetType === "class" ? targetId : undefined,
          studentId: targetType === "student" ? targetId : undefined,
        }}
        initialGoal={initialGoal}
        suggestedWords={suggestedWords}
        onSaved={() => {
          loadPlans();
        }}
      />
    </div>
  );
}
