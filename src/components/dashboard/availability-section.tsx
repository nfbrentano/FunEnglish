"use client";

import { useEffect, useState } from "react";
import { Clock, Calendar, Settings, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/use-auth";
import { getAvailabilitySettings, saveAvailabilitySettings } from "@/lib/schedule/repository";
import type { AvailabilitySettings, AvailabilityWindow, AvailabilityBlock } from "@/lib/schedule/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function AvailabilitySection() {
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AvailabilitySettings>({
    windows: [],
    blocks: [],
    bufferMin: 0,
    minNoticeHours: 12,
    horizonDays: 30,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  useEffect(() => {
    if (!user) return;
    let active = true;
    getAvailabilitySettings(user.uid).then((data) => {
      if (!active) return;
      if (data) setSettings(data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await saveAvailabilitySettings(user.uid, settings);
      toast("Availability settings saved!");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error saving");
    } finally {
      setSaving(false);
    }
  };

  const addWindow = () => {
    setSettings(s => ({
      ...s,
      windows: [...s.windows, { weekday: 1, start: "09:00", end: "17:00" }]
    }));
  };

  const removeWindow = (idx: number) => {
    setSettings(s => ({
      ...s,
      windows: s.windows.filter((_, i) => i !== idx)
    }));
  };

  const updateWindow = (idx: number, field: keyof AvailabilityWindow, value: any) => {
    setSettings(s => {
      const newWindows = [...s.windows];
      newWindows[idx] = { ...newWindows[idx], [field]: value };
      return { ...s, windows: newWindows };
    });
  };

  const addBlock = () => {
    const today = new Date();
    setSettings(s => ({
      ...s,
      blocks: [...s.blocks, { from: today, to: today, reason: "" }]
    }));
  };

  const removeBlock = (idx: number) => {
    setSettings(s => ({
      ...s,
      blocks: s.blocks.filter((_, i) => i !== idx)
    }));
  };

  const updateBlock = (idx: number, field: keyof AvailabilityBlock, value: any) => {
    setSettings(s => {
      const newBlocks = [...s.blocks];
      newBlocks[idx] = { ...newBlocks[idx], [field]: value };
      return { ...s, blocks: newBlocks };
    });
  };

  if (loading) return <Skeleton className="h-64 w-full rounded-2xl" />;

  return (
    <section id="availability" aria-labelledby="availability-title" className="scroll-mt-24 space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h2 id="availability-title" className="flex items-center gap-3 font-display text-3xl font-medium">
          <span className="flex size-9 items-center justify-center rounded-full bg-accent-muted text-accent">
            <Clock aria-hidden="true" className="size-5" />
          </span>
          Availability Settings
        </h2>
        <Button onClick={handleSave} disabled={saving} className="bg-accent text-primary hover:bg-accent/90">
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border-subtle bg-elevated p-6 space-y-4 shadow-sm md:col-span-2">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-lg flex items-center gap-2">
              <Calendar className="size-4 text-accent" /> Weekly Pattern
            </h3>
            <Button variant="secondary" size="sm" onClick={addWindow}>
              <Plus className="size-4 mr-1" /> Add
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {settings.windows.length === 0 ? (
              <p className="text-sm text-fg-secondary italic col-span-full">No availability windows defined. Students cannot book.</p>
            ) : (
              settings.windows.map((win, idx) => (
                <div key={idx} className="flex flex-wrap items-center gap-3 p-3 border border-border-subtle rounded-xl bg-primary">
                  <select
                    value={win.weekday}
                    onChange={(e) => updateWindow(idx, "weekday", parseInt(e.target.value))}
                    className="flex-1 min-w-30 rounded-lg bg-elevated border border-border-strong px-2 py-1.5 text-sm"
                  >
                    {WEEKDAYS.map((day, i) => (
                      <option key={i} value={i}>{day}</option>
                    ))}
                  </select>
                  <input
                    type="time"
                    value={win.start}
                    onChange={(e) => updateWindow(idx, "start", e.target.value)}
                    className="rounded-lg bg-elevated border border-border-strong px-2 py-1.5 text-sm w-24"
                  />
                  <span className="text-sm text-fg-secondary">to</span>
                  <input
                    type="time"
                    value={win.end}
                    onChange={(e) => updateWindow(idx, "end", e.target.value)}
                    className="rounded-lg bg-elevated border border-border-strong px-2 py-1.5 text-sm w-24"
                  />
                  <Button variant="ghost" onClick={() => removeWindow(idx)} className="ml-auto text-red-500 hover:text-red-600 hover:bg-red-500/10 p-2 h-auto">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border-subtle bg-elevated p-6 space-y-4 shadow-sm">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-lg flex items-center gap-2">
              <Calendar className="size-4 text-accent" /> Specific Blocked Dates
            </h3>
            <Button variant="secondary" size="sm" onClick={addBlock}>
              <Plus className="size-4 mr-1" /> Add
            </Button>
          </div>
          <p className="text-sm text-fg-secondary">Block your calendar for holidays, vacations, or sick days.</p>
          
          <div className="space-y-3">
            {settings.blocks.length === 0 ? (
              <p className="text-sm text-fg-secondary italic">No blocked dates.</p>
            ) : (
              settings.blocks.map((block, idx) => {
                // Formatting for input[type="date"]
                const fromStr = block.from instanceof Date && !isNaN(block.from.getTime()) ? block.from.toISOString().split("T")[0] : "";
                const toStr = block.to instanceof Date && !isNaN(block.to.getTime()) ? block.to.toISOString().split("T")[0] : "";
                
                return (
                  <div key={idx} className="flex flex-col gap-2 p-3 border border-border-subtle rounded-xl bg-primary">
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={fromStr}
                        onChange={(e) => updateBlock(idx, "from", new Date(e.target.value))}
                        className="flex-1 rounded-lg bg-elevated border border-border-strong px-2 py-1.5 text-sm"
                      />
                      <span className="text-sm text-fg-secondary">to</span>
                      <input
                        type="date"
                        value={toStr}
                        min={fromStr}
                        onChange={(e) => updateBlock(idx, "to", new Date(e.target.value))}
                        className="flex-1 rounded-lg bg-elevated border border-border-strong px-2 py-1.5 text-sm"
                      />
                      <Button variant="ghost" onClick={() => removeBlock(idx)} className="text-red-500 hover:text-red-600 hover:bg-red-500/10 p-2 h-auto">
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    <input
                      type="text"
                      placeholder="Reason (e.g. Holiday, Vacation)"
                      value={block.reason || ""}
                      onChange={(e) => updateBlock(idx, "reason", e.target.value)}
                      className="w-full rounded-lg bg-elevated border border-border-strong px-2 py-1.5 text-sm"
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border-subtle bg-elevated p-6 space-y-4 shadow-sm">
          <h3 className="font-medium text-lg flex items-center gap-2">
            <Settings className="size-4 text-accent" /> Booking Rules
          </h3>
          
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold">Minimum Notice (hours)</label>
              <input
                type="number"
                min={0}
                value={settings.minNoticeHours}
                onChange={(e) => setSettings(s => ({ ...s, minNoticeHours: parseInt(e.target.value) || 0 }))}
                className="w-full rounded-xl border border-border-subtle bg-primary p-2.5 text-sm text-fg"
              />
              <span className="text-xs text-fg-secondary">How far in advance students must book or cancel.</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold">Booking Horizon (days)</label>
              <input
                type="number"
                min={1}
                value={settings.horizonDays}
                onChange={(e) => setSettings(s => ({ ...s, horizonDays: parseInt(e.target.value) || 1 }))}
                className="w-full rounded-xl border border-border-subtle bg-primary p-2.5 text-sm text-fg"
              />
              <span className="text-xs text-fg-secondary">How far into the future students can book.</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold">Buffer Between Lessons (minutes)</label>
              <input
                type="number"
                min={0}
                value={settings.bufferMin}
                onChange={(e) => setSettings(s => ({ ...s, bufferMin: parseInt(e.target.value) || 0 }))}
                className="w-full rounded-xl border border-border-subtle bg-primary p-2.5 text-sm text-fg"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
