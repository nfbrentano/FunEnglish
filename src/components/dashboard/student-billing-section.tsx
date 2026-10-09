"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, CreditCard, FileText, Download, MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { getBillingPlan, updateBillingPlan, getLedgerEntries, addLedgerEntry } from "@/lib/billing/repository";
import type { BillingPlan, LedgerEntry, PaymentMethod } from "@/lib/billing/types";

export function StudentBillingSection({ studentId, studentName, phone }: { studentId: string; studentName: string; phone?: string }) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<BillingPlan | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  
  const paymentDialogRef = useRef<HTMLDialogElement>(null);
  const adjustDialogRef = useRef<HTMLDialogElement>(null);

  // Payment State
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<PaymentMethod>("Pix");
  const [payCredits, setPayCredits] = useState("10");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Adjustment State
  const [adjCredits, setAdjCredits] = useState("1");
  const [adjReason, setAdjReason] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [fetchedPlan, fetchedLedger] = await Promise.all([
        getBillingPlan(studentId),
        getLedgerEntries(studentId)
      ]);
      setPlan(fetchedPlan);
      setLedger(fetchedLedger);
    } catch (err) {
      console.error(err);
      toast("Error loading billing data");
    } finally {
      setLoading(false);
    }
  }, [studentId, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSendReminder = () => {
    if (!phone) {
      toast("No phone number configured for this student.");
      return;
    }
    const message = `Hello ${studentName}, this is a gentle reminder regarding your English classes payment.`;
    const cleaned = phone.replace(/\D/g, "");
    window.open(`https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payAmount || !payCredits) return;
    setIsSubmitting(true);
    
    try {
      const credits = parseInt(payCredits, 10);
      const amountCents = Math.round(parseFloat(payAmount.replace(",", ".")) * 100);
      
      // Update plan if not exists
      if (!plan) {
        await updateBillingPlan(studentId, {
          type: "package",
          priceCents: amountCents,
          paymentMethod: payMethod,
          creditsBalance: 0
        });
      }

      await addLedgerEntry(studentId, {
        type: "payment",
        credits: credits,
        amountCents: amountCents,
        method: payMethod,
        createdBy: "teacher" // In a real app, this should be the teacherUid from auth context
      });
      
      toast("Payment registered successfully.");
      paymentDialogRef.current?.close();
      setPayAmount("");
      setPayCredits("10");
      loadData();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error registering payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjCredits || !adjReason.trim()) return;
    setIsSubmitting(true);
    
    try {
      const credits = parseInt(adjCredits, 10);
      
      await addLedgerEntry(studentId, {
        type: "adjustment",
        credits: credits,
        reason: adjReason.trim(),
        createdBy: "teacher"
      });
      
      toast("Adjustment added successfully.");
      adjustDialogRef.current?.close();
      setAdjCredits("1");
      setAdjReason("");
      loadData();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error adding adjustment");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <Skeleton className="h-64 w-full rounded-3xl" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-2xl font-medium">Billing & Credits</h3>
        <Button variant="secondary" onClick={handleSendReminder} disabled={!phone}>
          <MessageCircle className="size-4 mr-2" /> Send Reminder
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 rounded-2xl border border-border-subtle bg-elevated p-6 space-y-4 shadow-sm">
          <h4 className="font-medium text-fg">Current Plan</h4>
          {plan ? (
            <div className="space-y-2">
              <div className="text-sm text-fg-secondary capitalize">{plan.type.replace(/_/g, " ")}</div>
              <div className="text-3xl font-display font-medium">{plan.creditsBalance} <span className="text-lg text-fg-secondary font-normal">credits</span></div>
            </div>
          ) : (
            <div className="text-sm text-fg-secondary">
              <p className="mb-2">No active plan configured.</p>
              <p className="text-xs">Registering a payment will initialize a package plan.</p>
            </div>
          )}
          <div className="pt-4 flex flex-col gap-2">
            <Button size="sm" className="w-full bg-accent text-primary hover:bg-accent/90" onClick={() => paymentDialogRef.current?.showModal()}>
              <CreditCard className="size-4 mr-1" /> Register Payment
            </Button>
            <Button size="sm" variant="secondary" className="w-full" onClick={() => adjustDialogRef.current?.showModal()}>
              <Plus className="size-4 mr-1" /> Adjust Credits
            </Button>
          </div>
        </div>

        <div className="md:col-span-2 rounded-2xl border border-border-subtle bg-elevated p-6 space-y-4 shadow-sm">
          <div className="flex justify-between items-center">
            <h4 className="font-medium text-fg flex items-center gap-2">
              <FileText className="size-4 text-muted" /> Ledger History
            </h4>
            <Button variant="ghost" size="sm" className="text-muted hover:text-fg">
              <Download className="size-4" /> CSV
            </Button>
          </div>
          
          {ledger.length === 0 ? (
            <div className="text-sm text-fg-secondary py-4 text-center border border-dashed rounded-xl">No history found.</div>
          ) : (
            <div className="space-y-3 max-h-75 overflow-y-auto pr-2">
              {ledger.map(entry => (
                <div key={entry.id} className="flex items-center justify-between text-sm py-2 border-b border-border-subtle last:border-0">
                  <div className="space-y-0.5">
                    <div className="font-medium text-fg capitalize">{entry.type} {entry.reason ? `· ${entry.reason}` : ""}</div>
                    <div className="text-xs text-muted">
                      {entry.at.toLocaleDateString()} {entry.amountCents ? `· ${(entry.amountCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : ""}
                    </div>
                  </div>
                  <div className={`font-medium ${entry.credits > 0 ? "text-green-500" : entry.credits < 0 ? "text-red-500" : "text-fg"}`}>
                    {entry.credits > 0 ? "+" : ""}{entry.credits}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Payment Dialog */}
      <dialog
        ref={paymentDialogRef}
        className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-2xl border border-border-subtle bg-elevated p-0 text-fg backdrop:bg-black/50"
        onClick={(event) => event.target === paymentDialogRef.current && paymentDialogRef.current?.close()}
      >
        <div className="p-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <h2 className="font-display text-2xl font-medium">Register Payment</h2>
            <button
              type="button"
              onClick={() => paymentDialogRef.current?.close()}
              className="-mt-1 -mr-2 flex size-10 shrink-0 items-center justify-center rounded-full text-fg-secondary hover:bg-secondary hover:text-fg"
            >
              <X className="size-5" />
            </button>
          </div>
          <form onSubmit={handlePaySubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-fg">Amount (BRL)</label>
              <input
                type="number"
                step="0.01"
                required
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="700.00"
                className="w-full rounded-xl border border-border-subtle bg-primary p-2.5 text-sm text-fg"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-fg">Credits to Add</label>
              <input
                type="number"
                required
                value={payCredits}
                onChange={(e) => setPayCredits(e.target.value)}
                placeholder="10"
                className="w-full rounded-xl border border-border-subtle bg-primary p-2.5 text-sm text-fg"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-fg">Payment Method</label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                className="w-full rounded-xl border border-border-subtle bg-primary p-2.5 text-sm text-fg"
              >
                <option value="Pix">Pix</option>
                <option value="Transferência">Transferência</option>
                <option value="Dinheiro">Dinheiro</option>
                <option value="Cartão">Cartão</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => paymentDialogRef.current?.close()}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-accent text-primary hover:bg-accent/90">
                Register Payment
              </Button>
            </div>
          </form>
        </div>
      </dialog>

      {/* Adjust Dialog */}
      <dialog
        ref={adjustDialogRef}
        className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-2xl border border-border-subtle bg-elevated p-0 text-fg backdrop:bg-black/50"
        onClick={(event) => event.target === adjustDialogRef.current && adjustDialogRef.current?.close()}
      >
        <div className="p-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <h2 className="font-display text-2xl font-medium">Adjust Credits</h2>
            <button
              type="button"
              onClick={() => adjustDialogRef.current?.close()}
              className="-mt-1 -mr-2 flex size-10 shrink-0 items-center justify-center rounded-full text-fg-secondary hover:bg-secondary hover:text-fg"
            >
              <X className="size-5" />
            </button>
          </div>
          <form onSubmit={handleAdjustSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-fg">Credits to Adjust (+ / -)</label>
              <input
                type="number"
                required
                value={adjCredits}
                onChange={(e) => setAdjCredits(e.target.value)}
                placeholder="e.g. 1 or -1"
                className="w-full rounded-xl border border-border-subtle bg-primary p-2.5 text-sm text-fg"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-fg">Reason (Required)</label>
              <input
                type="text"
                required
                value={adjReason}
                onChange={(e) => setAdjReason(e.target.value)}
                placeholder="e.g. Bonus lesson, Refund"
                className="w-full rounded-xl border border-border-subtle bg-primary p-2.5 text-sm text-fg"
              />
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => adjustDialogRef.current?.close()}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-accent text-primary hover:bg-accent/90">
                Save Adjustment
              </Button>
            </div>
          </form>
        </div>
      </dialog>
    </div>
  );
}
