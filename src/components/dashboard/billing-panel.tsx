"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CreditCard, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth/use-auth";
import { getBillingAlerts, getTeacherMonthlyRevenue, type BillingAlert } from "@/lib/billing/repository";

export function BillingPanel() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<BillingAlert[]>([]);
  const [revenue, setRevenue] = useState(0);

  useEffect(() => {
    if (!user) return;
    
    let active = true;
    const now = new Date();
    
    Promise.all([
      getBillingAlerts(user.uid),
      getTeacherMonthlyRevenue(user.uid, now.getFullYear(), now.getMonth() + 1)
    ]).then(([fetchedAlerts, fetchedRevenue]) => {
      if (!active) return;
      setAlerts(fetchedAlerts);
      setRevenue(fetchedRevenue);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      if (active) setLoading(false);
    });
    
    return () => { active = false; };
  }, [user]);

  if (loading) {
    return <Skeleton className="h-48 w-full rounded-2xl" />;
  }

  const alertColor = (status: string) => {
    switch (status) {
      case "No credits":
      case "Overdue": return "text-red-500 bg-red-500/10 border-red-500/20";
      case "Low credits":
      case "Due soon": return "text-amber-500 bg-amber-500/10 border-amber-500/20";
      default: return "text-fg bg-elevated border-border-subtle";
    }
  };

  const handleExportCsv = async () => {
    if (!user) return;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // We can just fetch the ledgers again using getTeacherMonthlyRevenue's internal logic, or add a new function
    // For now, let's just trigger a toast
    // Proper CSV requires fetching `ledger` entries with amountCents
  };

  return (
    <div className="rounded-2xl border border-border-subtle bg-elevated shadow-sm overflow-hidden">
      <div className="p-5 border-b border-border-subtle flex justify-between items-center bg-primary/30">
        <h3 className="font-display text-lg font-medium flex items-center gap-2">
          <CreditCard className="size-4 text-accent" /> Billing Overview
        </h3>
        <div className="text-right">
          <div className="text-xs text-fg-secondary">Received this month</div>
          <div className="font-semibold text-fg">
            {(revenue / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </div>
        </div>
      </div>
      
      <div className="p-2">
        {alerts.length === 0 ? (
          <div className="p-4 text-center text-sm text-fg-secondary">
            No students with low credits or overdue payments.
          </div>
        ) : (
          <div className="space-y-1">
            {alerts.slice(0, 5).map(alert => (
              <Link 
                key={alert.studentId}
                href={`/dashboard/student?id=${alert.studentId}`}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-primary transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <AlertCircle className={`size-4 ${alert.status === "Overdue" || alert.status === "No credits" ? "text-red-500" : "text-amber-500"}`} />
                  <div>
                    <div className="font-medium text-sm text-fg">{alert.studentName}</div>
                    <div className="text-xs text-fg-secondary">{alert.creditsBalance} credits left</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${alertColor(alert.status)}`}>
                    {alert.status}
                  </span>
                  <ChevronRight className="size-4 text-muted group-hover:text-fg transition-colors" />
                </div>
              </Link>
            ))}
            {alerts.length > 5 && (
              <div className="p-2 text-center text-xs text-muted">
                + {alerts.length - 5} more
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
