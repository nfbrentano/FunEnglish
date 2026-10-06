"use client";

import {
  Copy,
  Maximize2,
  RefreshCw,
  RotateCcw,
  SkipForward,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ClassroomPickerProps } from "@/lib/picker/types";
import { usePicker } from "@/lib/picker/use-picker";
import { strings } from "@/lib/strings";

// Vibrant curated wheel slices palette using design tokens from theme.css
const WHEEL_COLORS = [
  "var(--cat-fun)",
  "var(--cat-grammar)",
  "var(--cat-listening)",
  "var(--cat-pictures)",
  "var(--cat-reading)",
  "var(--cat-speaking)",
  "var(--cat-videos)",
  "var(--cat-vocabulary)",
  "var(--cat-writing)",
  "var(--accent)",
  "var(--success)",
  "var(--cat-fun)",
];

function truncateName(name: string, maxLen = 14): string {
  if (name.length <= maxLen) return name;
  return `${name.slice(0, maxLen - 1)}…`;
}

/**
 * Visual classroom student picker (Wheel of Fortune) & random group maker
 * (SDD/2026-10-03_06-sorteador-de-alunos-e-grupos.md).
 */
export function ClassroomPicker({
  students,
  hasActiveSession = false,
  className = "",
}: ClassroomPickerProps) {
  const [activeTab, setActiveTab] = useState<"wheel" | "groups" | "names">("wheel");
  const noRepeatId = useId();

  const picker = usePicker({ students, hasActiveSession });

  const {
    activeNames,
    customNamesRaw,
    setCustomNames,
    useCustomNames,
    setUseCustomNames,
    hasRoster,
    noRepeat,
    setNoRepeat,
    cyclePickedNames,
    eligibleNames,
    resetCycle,
    notice,
    winner,
    isSpinning,
    wheelRotation,
    spin,
    skip,
    isBigScreen,
    setIsBigScreen,
    history,
    clearHistory,
    groupMode,
    setGroupMode,
    groupCount,
    setGroupCount,
    groupSize,
    setGroupSize,
    groups,
    groupError,
    generateGroups,
    copyGroups,
    copiedGroups,
  } = picker;

  // Handle Escape key for Big Screen mode (CA05)
  useEffect(() => {
    if (!isBigScreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsBigScreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isBigScreen, setIsBigScreen]);

  // Names displayed on the wheel
  const wheelSlices = useMemo(() => {
    if (noRepeat) {
      return eligibleNames.length > 0 ? eligibleNames : activeNames;
    }
    return activeNames;
  }, [noRepeat, eligibleNames, activeNames]);

  const totalSlices = wheelSlices.length;
  const sliceAngle = totalSlices > 0 ? 360 / totalSlices : 360;

  const canSpin = activeNames.length >= 2;

  return (
    <Card className={`relative overflow-hidden p-4 sm:p-6 space-y-5 ${className}`}>
      {/* Header with Title and Mode Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-accent-muted p-1.5 text-accent">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-fg">
              {strings.classroomPicker.title}
            </h2>
            <p className="text-xs text-fg-secondary">
              {strings.classroomPicker.studentsCount(activeNames.length)}
              {noRepeat &&
                ` · ${strings.classroomPicker.remainingCount(
                  eligibleNames.length,
                  activeNames.length
                )}`}
            </p>
          </div>
        </div>

        {/* Tab navigation */}
        <div role="tablist" className="flex rounded-lg bg-secondary p-1 text-xs">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "wheel"}
            onClick={() => setActiveTab("wheel")}
            className={`rounded-md px-3 py-1 font-medium transition-colors ${
              activeTab === "wheel"
                ? "bg-elevated text-fg shadow-sm"
                : "text-fg-secondary hover:text-fg"
            }`}
          >
            {strings.classroomPicker.wheelTab}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "groups"}
            onClick={() => {
              setActiveTab("groups");
              if (groups.length === 0 && activeNames.length >= 2) {
                generateGroups();
              }
            }}
            className={`rounded-md px-3 py-1 font-medium transition-colors ${
              activeTab === "groups"
                ? "bg-elevated text-fg shadow-sm"
                : "text-fg-secondary hover:text-fg"
            }`}
          >
            {strings.classroomPicker.groupsTab}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "names"}
            onClick={() => setActiveTab("names")}
            className={`rounded-md px-3 py-1 font-medium transition-colors ${
              activeTab === "names"
                ? "bg-elevated text-fg shadow-sm"
                : "text-fg-secondary hover:text-fg"
            }`}
          >
            {strings.classroomPicker.namesTab} ({activeNames.length})
          </button>
        </div>
      </div>

      {/* Notice Banner (CA02) */}
      {notice && (
        <div
          role="status"
          className="rounded-lg border border-accent bg-accent-muted px-3.5 py-2 text-sm font-medium text-accent"
        >
          {notice}
        </div>
      )}

      {/* TAB 1: WHEEL OF FORTUNE */}
      {activeTab === "wheel" && (
        <div className="space-y-6">
          {/* Wheel Graphic Container */}
          <div className="relative mx-auto flex flex-col items-center justify-center">
            {/* Top Pointer Ticker (at 12 o'clock, pointing down into the wheel) */}
            <div className="z-10 -mb-2">
              <svg width="28" height="24" viewBox="0 0 28 24">
                <polygon
                  points="2,2 26,2 14,22"
                  className="fill-accent stroke-elevated stroke-2 drop-shadow-md"
                />
              </svg>
            </div>

            {/* SVG Wheel */}
            <div className="relative h-70 w-70 sm:h-80 sm:w-[320px]">
              <svg
                viewBox="0 0 320 320"
                className="h-full w-full drop-shadow-lg"
              >
                {/* Rotating wheel group */}
                <g
                  style={{
                    transform: `rotate(${wheelRotation}deg)`,
                    transformOrigin: "160px 160px",
                    transition: isSpinning
                      ? "transform 2.5s cubic-bezier(0.15, 0.9, 0.2, 1)"
                      : "none",
                  }}
                >
                  {/* Wheel Outer Border */}
                  <circle
                    cx="160"
                    cy="160"
                    r="148"
                    className="fill-none stroke-border-strong"
                    strokeWidth="4"
                  />

                  {totalSlices >= 2 ? (
                    wheelSlices.map((name, idx) => {
                      const startAngle = idx * sliceAngle;
                      const endAngle = (idx + 1) * sliceAngle;
                      const midAngle = (startAngle + endAngle) / 2;

                      // Trigonometric coordinates
                      const radStart = (startAngle * Math.PI) / 180;
                      const radEnd = (endAngle * Math.PI) / 180;

                      const x1 = 160 + 144 * Math.cos(radStart);
                      const y1 = 160 + 144 * Math.sin(radStart);
                      const x2 = 160 + 144 * Math.cos(radEnd);
                      const y2 = 160 + 144 * Math.sin(radEnd);

                      const largeArc = sliceAngle > 180 ? 1 : 0;
                      const pathData = `M 160 160 L ${x1} ${y1} A 144 144 0 ${largeArc} 1 ${x2} ${y2} Z`;

                      const fillColor = WHEEL_COLORS[idx % WHEEL_COLORS.length];

                      return (
                        <g key={`${name}-${idx}`}>
                          {/* Sector Slice */}
                          <path
                            d={pathData}
                            fill={fillColor}
                            stroke="var(--bg-elevated)"
                            strokeWidth="1.5"
                          />
                          {/* Sector Text along ray (RNF04) */}
                          <g transform={`rotate(${midAngle} 160 160)`}>
                            <text
                              x="250"
                              y="160"
                              fill="var(--text-primary)"
                              fontSize={totalSlices > 24 ? "9" : totalSlices > 14 ? "11" : "13"}
                              fontWeight="bold"
                              textAnchor="end"
                              dominantBaseline="central"
                              className="select-none pointer-events-none drop-shadow-sm"
                            >
                              {truncateName(name, totalSlices > 20 ? 10 : 14)}
                            </text>
                          </g>
                        </g>
                      );
                    })
                  ) : (
                    // Fallback when fewer than 2 names
                    <circle cx="160" cy="160" r="144" className="fill-secondary stroke-border-subtle" />
                  )}
                </g>

                {/* Center Hub */}
                <circle
                  cx="160"
                  cy="160"
                  r="24"
                  className="fill-elevated stroke-border-strong shadow-md"
                  strokeWidth="3"
                />
                <circle cx="160" cy="160" r="14" className="fill-accent" />
              </svg>
            </div>
          </div>

          {/* Winner Announcement Banner (RF01, RNF03, CA01) */}
          {winner && (
            <div
              role="region"
              aria-live="polite"
              className="rounded-xl border-2 border-accent bg-accent-muted p-4 text-center space-y-3"
            >
              <div className="text-xs font-semibold uppercase tracking-wider text-accent">
                {strings.classroomPicker.winnerHeading}
              </div>
              <div className="font-display text-3xl sm:text-4xl font-black text-fg tracking-tight">
                {winner}
              </div>
              <p className="text-xs text-fg-secondary">
                {strings.classroomPicker.winnerSubtitle}
              </p>

              {/* Action Buttons for Winner: Skip, Big screen, Spin again */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <Button
                  variant="secondary"
                  onClick={() => setIsBigScreen(true)}
                  className="min-h-9 px-3 py-1 text-xs flex items-center gap-1.5"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  {strings.classroomPicker.bigScreen}
                </Button>

                <Button
                  variant="secondary"
                  onClick={skip}
                  className="min-h-9 px-3 py-1 text-xs flex items-center gap-1.5"
                >
                  <SkipForward className="h-3.5 w-3.5" />
                  {strings.classroomPicker.skip}
                </Button>

                <Button
                  variant="primary"
                  onClick={() => spin()}
                  disabled={isSpinning || !canSpin}
                  className="min-h-9 px-3 py-1 text-xs flex items-center gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {strings.classroomPicker.spinAgain}
                </Button>
              </div>
            </div>
          )}

          {/* Controls: Spin Button & Options */}
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-2">
              <Button
                variant="primary"
                onClick={() => spin()}
                disabled={isSpinning || !canSpin}
                className="w-full max-w-xs font-display text-base font-bold shadow-md"
              >
                {isSpinning ? strings.classroomPicker.spinning : strings.classroomPicker.spin}
              </Button>

              {/* CA09: Add at least 2 names message when < 2 students */}
              {!canSpin && (
                <p className="text-xs font-medium text-error">
                  {strings.classroomPicker.addAtLeast2Names}
                </p>
              )}
            </div>

            {/* "Don't repeat" checkbox & Reset Cycle button (RF02, CA02) */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-secondary p-3 text-sm">
              <label
                htmlFor={noRepeatId}
                className="flex items-center gap-2 text-xs sm:text-sm font-medium text-fg cursor-pointer select-none"
              >
                <input
                  id={noRepeatId}
                  type="checkbox"
                  checked={noRepeat}
                  onChange={(e) => setNoRepeat(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                />
                {strings.classroomPicker.noRepeatLabel}
              </label>

              {noRepeat && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-fg-secondary">
                    {cyclePickedNames.length}/{activeNames.length}
                  </span>
                  <Button
                    variant="ghost"
                    onClick={resetCycle}
                    disabled={cyclePickedNames.length === 0}
                    className="min-h-7 px-2.5 py-0.5 text-xs flex items-center gap-1"
                  >
                    <RotateCcw className="h-3 w-3" />
                    {strings.classroomPicker.resetCycle}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* History of recent picks (RF06) */}
          {history.length > 0 && (
            <div className="border-t border-border pt-3 space-y-2">
              <div className="flex items-center justify-between text-xs text-fg-secondary">
                <span className="font-semibold">{strings.classroomPicker.recentPicks} ({history.length})</span>
                <button
                  type="button"
                  onClick={clearHistory}
                  className="hover:text-fg underline cursor-pointer"
                >
                  {strings.classroomPicker.clearHistory}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {history.map((item) => (
                  <Badge key={item.id}>
                    {item.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: GROUP MAKER (RF04, RF05, CA04, CA09) */}
      {activeTab === "groups" && (
        <div className="space-y-5">
          <div className="rounded-lg bg-surface-sunken p-4 space-y-4">
            {/* Split Mode Selector: By group count vs By size */}
            <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="group-mode"
                  checked={groupMode === "count"}
                  onChange={() => setGroupMode("count")}
                  className="text-accent focus:ring-accent"
                />
                {strings.classroomPicker.splitByGroups}
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="group-mode"
                  checked={groupMode === "size"}
                  onChange={() => setGroupMode("size")}
                  className="text-accent focus:ring-accent"
                />
                {strings.classroomPicker.splitBySize}
              </label>
            </div>

            {/* Stepper / Input */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-fg-secondary">
                {groupMode === "count"
                  ? strings.classroomPicker.groupCountLabel
                  : strings.classroomPicker.groupSizeLabel}
                :
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (groupMode === "count") {
                      setGroupCount((c) => Math.max(1, c - 1));
                    } else {
                      setGroupSize((s) => Math.max(1, s - 1));
                    }
                  }}
                  className="h-8 w-8 min-h-8 p-0"
                >
                  -
                </Button>
                <span className="w-8 text-center text-sm font-bold text-fg">
                  {groupMode === "count" ? groupCount : groupSize}
                </span>
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (groupMode === "count") {
                      setGroupCount((c) => c + 1);
                    } else {
                      setGroupSize((s) => s + 1);
                    }
                  }}
                  className="h-8 w-8 min-h-8 p-0"
                >
                  +
                </Button>
              </div>

              <Button
                variant="primary"
                onClick={generateGroups}
                className="ml-auto min-h-8 px-3 py-1 text-xs"
              >
                {groups.length > 0
                  ? strings.classroomPicker.shuffleAgain
                  : strings.classroomPicker.generateGroups}
              </Button>
            </div>

            {/* Error Message (CA09) */}
            {groupError && (
              <p className="text-xs font-medium text-error">{groupError}</p>
            )}
          </div>

          {/* Groups Display (CA04) */}
          {groups.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-fg-secondary">
                  {groups.length} {groups.length === 1 ? "group" : "groups"} generated
                </span>
                <Button
                  variant="secondary"
                  onClick={copyGroups}
                  className="min-h-8 px-3 py-1 text-xs flex items-center gap-1.5"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copiedGroups
                    ? strings.classroomPicker.copied
                    : strings.classroomPicker.copyGroups}
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {groups.map((group, idx) => (
                  <div
                    key={`group-${idx}`}
                    className="rounded-lg border border-border-subtle bg-elevated p-3 space-y-2 shadow-sm"
                  >
                    <div className="flex items-center justify-between border-b border-border-subtle pb-1.5">
                      <span className="font-display text-xs font-bold text-accent">
                        Group {idx + 1}
                      </span>
                      <span className="text-[11px] text-fg-secondary font-medium">
                        {group.length} students
                      </span>
                    </div>
                    <ul className="space-y-1 text-xs text-fg">
                      {group.map((name) => (
                        <li key={name} className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                          <span>{name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: NAMES MANAGEMENT (RF03, CA03) */}
      {activeTab === "names" && (
        <div className="space-y-4">
          {/* If class roster is available, allow switching */}
          {hasRoster && (
            <div className="flex gap-2">
              <Button
                variant={!useCustomNames ? "primary" : "secondary"}
                onClick={() => setUseCustomNames(false)}
                className="min-h-8 px-3 py-1 text-xs"
              >
                {strings.classroomPicker.rosterTab} ({students?.length ?? 0})
              </Button>
              <Button
                variant={useCustomNames ? "primary" : "secondary"}
                onClick={() => setUseCustomNames(true)}
                className="min-h-8 px-3 py-1 text-xs"
              >
                {strings.classroomPicker.customTab}
              </Button>
            </div>
          )}

          {/* Custom list textarea */}
          {(!hasRoster || useCustomNames) && (
            <div className="space-y-2">
              <label
                htmlFor="picker-custom-names"
                className="block text-xs font-medium text-fg-secondary"
              >
                {strings.classroomPicker.customTab} ({strings.classroomPicker.customNamesHint})
              </label>
              <textarea
                id="picker-custom-names"
                rows={8}
                value={customNamesRaw}
                onChange={(e) => setCustomNames(e.target.value)}
                placeholder={strings.classroomPicker.customNamesPlaceholder}
                className="w-full rounded-md border border-border-strong bg-elevated p-2.5 text-xs text-fg font-mono focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          )}

          {/* Current roster display */}
          {hasRoster && !useCustomNames && (
            <div className="space-y-2">
              <p className="text-xs text-fg-secondary">
                Using students from active class session:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {activeNames.map((name) => (
                  <Badge key={name}>
                    {name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* BIG SCREEN OVERLAY (RF07, CA05) */}
      {isBigScreen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={strings.classroomPicker.bigScreen}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black p-6 backdrop-blur-md text-white animate-fade-in select-none"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => setIsBigScreen(false)}
            aria-label={strings.classroomPicker.closeBigScreen}
            className="absolute top-6 right-6 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition-colors cursor-pointer"
          >
            <X className="h-8 w-8" />
          </button>

          {/* Winner in extra large font */}
          <div className="flex flex-col items-center text-center space-y-6">
            <span className="text-sm sm:text-base font-semibold uppercase tracking-widest text-accent">
              {strings.classroomPicker.winnerHeading}
            </span>
            <div className="font-display text-6xl sm:text-8xl md:text-9xl font-black text-accent drop-shadow-lg">
              {winner}
            </div>
            <p className="text-lg text-white/70">
              {strings.classroomPicker.winnerSubtitle}
            </p>
          </div>

          <div className="absolute bottom-8 flex gap-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsBigScreen(false);
                skip();
              }}
              className="bg-white/10 text-white hover:bg-white/20 border-white/20"
            >
              <SkipForward className="h-4 w-4 mr-2" />
              {strings.classroomPicker.skip}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setIsBigScreen(false);
                spin();
              }}
              className="font-bold"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {strings.classroomPicker.spinAgain}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
