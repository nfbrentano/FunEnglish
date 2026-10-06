"use client";

import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  GraduationCap,
  ListChecks,
  Milestone,
  Package,
  Printer,
  Sparkles,
  Target,
} from "lucide-react";
import type { ProgressReportSnapshot, ReportLanguage } from "@/lib/reports/types";

export interface PrintableReportViewProps {
  report: ProgressReportSnapshot;
  onPrint?: () => void;
  showPrintButton?: boolean;
}

const STRINGS = {
  en: {
    title: "Student Progress Report",
    teacher: "Teacher",
    student: "Student",
    level: "Level",
    goal: "Goal",
    period: "Period",
    keyMetrics: "Performance Summary",
    lessons: "Lessons & Attendance",
    homework: "Homework & Practice",
    vocabulary: "Vocabulary Expansion",
    notes: "Feedback & Notes",
    strengths: "Key Strengths",
    recurringErrors: "Targeted Corrections & Recurring Errors",
    resolved: "Mastered / Resolved",
    workingOn: "Currently Practicing",
    summaries: "Lesson Highlights & Focus",
    tracks: "Learning Tracks Progress",
    package: "Package Balance",
    creditsUsed: "Used",
    creditsRemaining: "Remaining",
    teacherFeedback: "Teacher's Evaluation",
    nextGoals: "Next Goals & Action Steps",
    printReport: "Print / Save as PDF",
    noData: "No entries in this period",
    completed: "Completed",
    averageScore: "Average Score",
    attendanceRate: "Attendance Rate",
    wordsLearned: "New Words",
  },
  pt: {
    title: "Relatório de Progresso do Aluno",
    teacher: "Professor(a)",
    student: "Aluno(a)",
    level: "Nível",
    goal: "Objetivo",
    period: "Período",
    keyMetrics: "Resumo de Desempenho",
    lessons: "Aulas e Presença",
    homework: "Tarefas de Casa",
    vocabulary: "Expansão de Vocabulário",
    notes: "Anotações e Feedback",
    strengths: "Pontos Fortes",
    recurringErrors: "Correções Focadas e Erros Recorrentes",
    resolved: "Superados / Resolvidos",
    workingOn: "Em Prática",
    summaries: "Destaques das Aulas e Foco",
    tracks: "Progresso nas Trilhas",
    package: "Saldo de Pacote",
    creditsUsed: "Utilizadas",
    creditsRemaining: "Restantes",
    teacherFeedback: "Avaliação do Professor",
    nextGoals: "Próximas Metas e Passos",
    printReport: "Imprimir / Salvar em PDF",
    noData: "Sem registros no período",
    completed: "Concluídas",
    averageScore: "Nota Média",
    attendanceRate: "Taxa de Presença",
    wordsLearned: "Novas Palavras",
  },
};

export function PrintableReportView({
  report,
  onPrint,
  showPrintButton = true,
}: PrintableReportViewProps) {
  const lang: ReportLanguage = report.language || "en";
  const s = STRINGS[lang] || STRINGS.en;
  const m = report.metrics;

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="report-container w-full max-w-4xl mx-auto space-y-6">
      {/* Top action bar (hidden during print) */}
      {showPrintButton && (
        <div className="flex items-center justify-between no-print bg-elevated border border-border-subtle p-3 rounded-2xl">
          <span className="text-xs text-muted">
            {lang === "pt" ? "Versão pronta para impressão A4" : "Ready for A4 print & PDF export"}
          </span>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-primary hover:bg-accent/90 transition-colors shadow-xs"
          >
            <Printer className="size-4" />
            <span>{s.printReport}</span>
          </button>
        </div>
      )}

      {/* Main Printable A4 Page Card */}
      <div
        id="printable-report"
        className="print-page bg-elevated border border-border-subtle rounded-3xl p-6 sm:p-10 space-y-8 text-fg shadow-sm"
      >
        {/* Document Header */}
        <header className="border-b border-border-subtle pb-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-accent">
                  Fun English
                </span>
                <span className="text-xs text-muted">·</span>
                <span className="text-xs font-medium text-muted">{s.title}</span>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-semibold text-fg mt-1">
                {report.studentFirstName}
              </h1>
            </div>

            <div className="text-right">
              <span className="text-xs text-muted block uppercase font-medium">{s.period}</span>
              <span className="text-sm font-semibold text-fg">{report.period.label}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-fg-secondary">
            <div>
              <span className="text-muted">{s.teacher}: </span>
              <span className="font-semibold text-fg">{report.teacherName}</span>
            </div>

            {report.studentLevel && (
              <div>
                <span className="text-muted">{s.level}: </span>
                <span className="font-semibold text-accent">{report.studentLevel}</span>
              </div>
            )}

            {report.studentGoal && (
              <div>
                <span className="text-muted">{s.goal}: </span>
                <span className="font-semibold text-fg">{report.studentGoal}</span>
              </div>
            )}
          </div>
        </header>

        {/* Performance Highlights Bar (CA02) */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
            {s.keyMetrics}
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {report.enabledSections.lessons && m.lessons && (
              <div className="rounded-2xl border border-border-subtle bg-primary/40 p-4 space-y-1">
                <span className="text-xs text-muted block">{s.lessons}</span>
                <span className="font-display text-xl font-semibold text-fg block">
                  {m.lessons.displayString}
                </span>
                <span className="text-[11px] text-muted">
                  {m.lessons.attendancePct}% {s.attendanceRate}
                </span>
              </div>
            )}

            {report.enabledSections.homework && m.homework && (
              <div className="rounded-2xl border border-border-subtle bg-primary/40 p-4 space-y-1">
                <span className="text-xs text-muted block">{s.homework}</span>
                <span className="font-display text-xl font-semibold text-fg block">
                  {m.homework.displayString}
                </span>
                <span className="text-[11px] text-muted">
                  {m.homework.completedCount} {s.completed}
                  {m.homework.lateCount > 0 && ` (${m.homework.lateCount} late)`}
                </span>
              </div>
            )}

            {report.enabledSections.vocabulary && m.vocabulary && (
              <div className="rounded-2xl border border-border-subtle bg-primary/40 p-4 space-y-1">
                <span className="text-xs text-muted block">{s.vocabulary}</span>
                <span className="font-display text-xl font-semibold text-fg block">
                  {m.vocabulary.displayString}
                </span>
                <span className="text-[11px] text-muted">
                  {m.vocabulary.masteredWordsCount} mastered
                </span>
              </div>
            )}

            {report.enabledSections.package && m.package && (
              <div className="rounded-2xl border border-border-subtle bg-primary/40 p-4 space-y-1">
                <span className="text-xs text-muted block">{s.package}</span>
                <span className="font-display text-xl font-semibold text-accent block">
                  {m.package.remainingCredits} lessons left
                </span>
                <span className="text-[11px] text-muted">
                  {m.package.usedCredits} used this period
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Lesson Summaries & Highlights (CA10) */}
        {report.enabledSections.summaries && m.summaries && m.summaries.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
              <Calendar className="size-3.5 text-accent" />
              <span>{s.summaries}</span>
            </h2>

            <div className="space-y-2.5">
              {m.summaries.map((sum, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-border-subtle bg-primary/20 p-3.5 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between text-muted text-[11px]">
                    <span className="font-medium text-fg">{sum.date}</span>
                  </div>
                  <p className="text-fg-secondary leading-relaxed">{sum.summary}</p>
                  {sum.nextFocus && (
                    <div className="pt-1 text-[11px] text-accent">
                      <span className="font-semibold text-muted">Next focus: </span>
                      <span>{sum.nextFocus}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Vocabulary Expansion */}
        {report.enabledSections.vocabulary && m.vocabulary && m.vocabulary.sampleWords && m.vocabulary.sampleWords.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
              <BookOpen className="size-3.5 text-accent" />
              <span>{s.vocabulary}</span>
            </h2>

            <div className="flex flex-wrap gap-1.5">
              {m.vocabulary.sampleWords.map((word) => (
                <span
                  key={word}
                  className="rounded-full border border-border-subtle bg-primary/50 px-3 py-1 text-xs font-medium text-fg-secondary"
                >
                  {word}
                </span>
              ))}
              {m.vocabulary.newWordsCount > m.vocabulary.sampleWords.length && (
                <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                  +{m.vocabulary.newWordsCount - m.vocabulary.sampleWords.length} more
                </span>
              )}
            </div>
          </section>
        )}

        {/* Feedback, Strengths & Corrections (CA04) */}
        {report.enabledSections.notes && m.notes && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-accent" />
              <span>{s.notes}</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Strengths */}
              {m.notes.sharedStrengths.length > 0 && (
                <div className="rounded-2xl border border-success/20 bg-success/5 p-4 space-y-2">
                  <h3 className="text-xs font-semibold text-success flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5" />
                    <span>{s.strengths}</span>
                  </h3>
                  <ul className="space-y-1 text-xs text-fg-secondary list-disc pl-4">
                    {m.notes.sharedStrengths.map((str, idx) => (
                      <li key={idx}>{str.text}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recurring Corrections */}
              {(m.notes.recurringErrorsResolved.length > 0 || m.notes.recurringErrorsOpen.length > 0) && (
                <div className="rounded-2xl border border-border-subtle bg-primary/30 p-4 space-y-2">
                  <h3 className="text-xs font-semibold text-fg flex items-center gap-1.5">
                    <Target className="size-3.5 text-accent" />
                    <span>{s.recurringErrors}</span>
                  </h3>

                  {m.notes.recurringErrorsResolved.length > 0 && (
                    <div className="space-y-1 text-xs">
                      <span className="text-[11px] font-semibold text-success uppercase block">
                        ✓ {s.resolved}
                      </span>
                      <ul className="space-y-0.5 text-fg-secondary pl-3">
                        {m.notes.recurringErrorsResolved.map((err, idx) => (
                          <li key={idx} className="line-through text-muted">
                            {err.text} {err.correction && `→ ${err.correction}`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {m.notes.recurringErrorsOpen.length > 0 && (
                    <div className="space-y-1 text-xs pt-1">
                      <span className="text-[11px] font-semibold text-accent uppercase block">
                        • {s.workingOn}
                      </span>
                      <ul className="space-y-0.5 text-fg-secondary pl-3">
                        {m.notes.recurringErrorsOpen.map((err, idx) => (
                          <li key={idx}>
                            <span className="font-medium text-fg">{err.text}</span>
                            {err.correction && (
                              <span className="text-accent font-medium"> → {err.correction}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Learning Tracks Progress */}
        {report.enabledSections.tracks && m.tracks && m.tracks.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
              <Milestone className="size-3.5 text-accent" />
              <span>{s.tracks}</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {m.tracks.map((track) => (
                <div
                  key={track.trackId}
                  className="rounded-2xl border border-border-subtle bg-primary/30 p-3.5 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-fg">{track.name}</span>
                    <span className="font-mono text-accent font-semibold">{track.currentPct}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-border-subtle">
                    <div
                      className="h-full bg-accent transition-all duration-300"
                      style={{ width: `${track.currentPct}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-muted block">
                    {track.completedActivities} of {track.totalActivities} completed
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Teacher Evaluation & Next Goals (CA03) */}
        {(report.teacherComment || (report.nextGoals && report.nextGoals.length > 0)) && (
          <footer className="border-t border-border-subtle pt-6 space-y-4">
            {report.teacherComment && (
              <div className="space-y-1.5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                  {s.teacherFeedback}
                </h3>
                <p className="text-xs text-fg-secondary leading-relaxed whitespace-pre-line rounded-2xl border border-border-subtle bg-primary/20 p-4">
                  {report.teacherComment}
                </p>
              </div>
            )}

            {report.nextGoals && report.nextGoals.length > 0 && (
              <div className="space-y-1.5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-accent flex items-center gap-1">
                  <Target className="size-3.5" />
                  <span>{s.nextGoals}</span>
                </h3>
                <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {report.nextGoals.map((goal, idx) => (
                    <li
                      key={idx}
                      className="rounded-xl border border-accent/20 bg-accent/5 p-3 text-xs text-fg font-medium flex items-center gap-2"
                    >
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent/20 text-[10px] font-bold text-accent">
                        {idx + 1}
                      </span>
                      <span>{goal}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </footer>
        )}
      </div>

      {/* Print Specific CSS styling (A4 formatting, clean print, no margins spill) */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          nav,
          header.site-header,
          footer.site-footer,
          .no-print {
            display: none !important;
          }
          .report-container {
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-page {
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
            padding: 10mm !important;
            color: var(--fg) !important;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
