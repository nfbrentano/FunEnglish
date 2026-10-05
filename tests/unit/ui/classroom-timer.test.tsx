import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClassroomTimer, MiniTimer } from "@/components/ui/classroom-timer";
import * as audioModule from "@/lib/timer/audio";
import { TimerProvider } from "@/lib/timer/timer-context";
import { parseCustomTime } from "@/lib/timer/use-timer";

describe("ClassroomTimer (SDD/2026-10-03_05-cronometro-visual.md)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // CT01 / CA01: Predefinição de 2 min
  it("CT01 / CA01: starts 2 min preset at 02:00 and decreases every second", () => {
    render(<ClassroomTimer />);

    const preset2Min = screen.getByRole("button", { name: "2 min" });
    fireEvent.click(preset2Min);

    expect(screen.getByText("02:00")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText("01:59")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText("01:58")).toBeInTheDocument();
  });

  // CT02 / CA02: Stopwatch pausa e retomada
  it("CT02 / CA02: stopwatch pauses at 00:15, waits, and resumes from 00:15", () => {
    render(<ClassroomTimer />);

    // Switch to stopwatch mode
    const stopwatchTab = screen.getByRole("tab", { name: /stopwatch/i });
    fireEvent.click(stopwatchTab);

    // Initial state
    expect(screen.getByText("00:00")).toBeInTheDocument();

    // Start stopwatch
    const startBtn = screen.getByRole("button", { name: /^start$/i });
    fireEvent.click(startBtn);

    // Advance 15 seconds
    act(() => {
      vi.advanceTimersByTime(15000);
    });
    expect(screen.getByText("00:15")).toBeInTheDocument();

    // Pause
    const pauseBtn = screen.getByRole("button", { name: /^pause$/i });
    fireEvent.click(pauseBtn);

    // Wait 10 seconds while paused
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(screen.getByText("00:15")).toBeInTheDocument();

    // Resume
    const resumeBtn = screen.getByRole("button", { name: /^resume$/i });
    fireEvent.click(resumeBtn);

    // Immediately at 00:15
    expect(screen.getByText("00:15")).toBeInTheDocument();

    // Advances to 00:16 after 1 more second
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText("00:16")).toBeInTheDocument();
  });

  // CT03 / CA03: Ajuste rápido +30 s e -30 s durante a contagem
  it("CT03 / CA03: adds 30 s to a 00:40 countdown becoming 01:10 without restarting", () => {
    render(<ClassroomTimer />);

    // Start with 1 min (01:00)
    const preset1Min = screen.getByRole("button", { name: "1 min" });
    fireEvent.click(preset1Min);

    // Let it count down 20 seconds -> 00:40
    act(() => {
      vi.advanceTimersByTime(20000);
    });
    expect(screen.getByText("00:40")).toBeInTheDocument();

    // Click +30 s
    const plus30Btn = screen.getByRole("button", { name: /add 30 seconds|\+30 s/i });
    fireEvent.click(plus30Btn);

    // Should immediately show 01:10
    expect(screen.getByText("01:10")).toBeInTheDocument();

    // Keeps counting down smoothly from 01:10 -> 01:09
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByText("01:09")).toBeInTheDocument();

    // Click -30 s
    const minus30Btn = screen.getByRole("button", { name: /subtract 30 seconds|−30 s|-30 s/i });
    fireEvent.click(minus30Btn);

    expect(screen.getByText("00:39")).toBeInTheDocument();
  });

  // CT04 / CA04: Fim da contagem e som com mudo
  it("CT04 / CA04: shows 'Time's up!' and plays sound; mute silences audio", () => {
    const playAlarmSpy = vi.spyOn(audioModule, "playAlarmSound");

    render(<ClassroomTimer />);

    // Custom countdown of 3 seconds
    const input = screen.getByPlaceholderText("mm:ss");
    fireEvent.change(input, { target: { value: "00:03" } });

    expect(screen.getByText("00:03")).toBeInTheDocument();

    const startBtn = screen.getByRole("button", { name: /^start$/i });
    fireEvent.click(startBtn);

    // Advance 3 seconds to reach zero
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText("Time's up!")).toBeInTheDocument();
    expect(playAlarmSpy).toHaveBeenCalledWith(false);

    // Reset
    const resetBtn = screen.getByRole("button", { name: /reset/i });
    fireEvent.click(resetBtn);

    // Turn mute on
    const muteBtn = screen.getByRole("button", { name: /mute sound/i });
    fireEvent.click(muteBtn);

    playAlarmSpy.mockClear();

    // Start 3 seconds again
    fireEvent.change(input, { target: { value: "00:03" } });
    const startAgainBtn = screen.getByRole("button", { name: /^start$/i });
    fireEvent.click(startAgainBtn);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText("Time's up!")).toBeInTheDocument();
    // Sound should be called with isMuted = true
    expect(playAlarmSpy).toHaveBeenCalledWith(true);
  });

  // CT05 / CA05: Big screen overlay e fechamento com Esc
  it("CT05 / CA05: opens big screen overlay and closes on Esc without stopping countdown", () => {
    render(<ClassroomTimer />);

    // Start 2 min countdown
    const preset2Min = screen.getByRole("button", { name: "2 min" });
    fireEvent.click(preset2Min);

    // Open Big Screen
    const bigScreenBtn = screen.getByRole("button", { name: /big screen/i });
    fireEvent.click(bigScreenBtn);

    // Big screen overlay should be visible
    const dialog = screen.getByRole("dialog", { name: /big screen timer/i });
    expect(dialog).toBeInTheDocument();

    // Advance 5 seconds while in big screen
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(within(dialog).getByText("01:55")).toBeInTheDocument();

    // Press Escape
    fireEvent.keyDown(window, { key: "Escape" });

    // Overlay is closed
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Countdown is still running!
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText("01:53")).toBeInTheDocument();
  });

  // CT06 / CA06: Minitimer visível entre abas
  it("CT06 / CA06: minitimer remains visible and synced when switching sidebar tabs", () => {
    function SimulatedSidebar() {
      const [activeTab, setActiveTab] = useState<"timer" | "board">("timer");
      return (
        <TimerProvider>
          <header data-testid="sidebar-header">
            <MiniTimer />
            <button onClick={() => setActiveTab("timer")}>Tab Timer</button>
            <button onClick={() => setActiveTab("board")}>Tab Board</button>
          </header>
          <main>
            {activeTab === "timer" ? <ClassroomTimer /> : <div data-testid="board-tab">Board content</div>}
          </main>
        </TimerProvider>
      );
    }

    render(<SimulatedSidebar />);

    // Start 1 min timer in timer tab
    const preset1Min = screen.getByRole("button", { name: "1 min" });
    fireEvent.click(preset1Min);

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    // Switch to Board tab
    const boardTabBtn = screen.getByRole("button", { name: "Tab Board" });
    fireEvent.click(boardTabBtn);

    expect(screen.getByTestId("board-tab")).toBeInTheDocument();

    // MiniTimer in header is still visible and displays remaining time 00:50
    const header = screen.getByTestId("sidebar-header");
    expect(header).toHaveTextContent("00:50");

    // Advance 5 seconds while on board tab
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(header).toHaveTextContent("00:45");
  });

  // CT07 / CA07: Segundo plano (Date.now drift-free calculation)
  it("CT07 / CA07: maintains exact remaining time after 5 minutes in background", () => {
    render(<ClassroomTimer />);

    // Start 10 min preset (600 seconds)
    const preset10Min = screen.getByRole("button", { name: "10 min" });
    fireEvent.click(preset10Min);

    expect(screen.getByText("10:00")).toBeInTheDocument();

    // Advance time by 5 min (300,000 ms)
    act(() => {
      vi.advanceTimersByTime(300000);
    });

    // Trigger visibility change event
    fireEvent(document, new Event("visibilitychange"));

    // Remaining should be exactly 05:00
    expect(screen.getByText("05:00")).toBeInTheDocument();
  });

  // CT08 / CA08: Validação de tempo personalizado
  it("CT08 / CA08: disables start button and shows error for invalid inputs '120:00' and 'abc'", () => {
    render(<ClassroomTimer />);

    const input = screen.getByPlaceholderText("mm:ss");
    const submitBtn = screen.getByRole("button", { name: /^start$/i });

    // Test "120:00" (> 99 min)
    fireEvent.change(input, { target: { value: "120:00" } });
    expect(submitBtn).toBeDisabled();
    expect(screen.getByText("Enter a time up to 99:59")).toBeInTheDocument();

    // Test "abc"
    fireEvent.change(input, { target: { value: "abc" } });
    expect(submitBtn).toBeDisabled();
    expect(screen.getByText("Enter a time up to 99:59")).toBeInTheDocument();

    // Test "99:59" (valid boundary)
    fireEvent.change(input, { target: { value: "99:59" } });
    expect(submitBtn).not.toBeDisabled();
    expect(screen.queryByText("Enter a time up to 99:59")).not.toBeInTheDocument();
  });

  // Unit tests for parseCustomTime helper
  describe("parseCustomTime helper", () => {
    it("parses valid mm:ss inputs", () => {
      expect(parseCustomTime("00:30")).toEqual({ valid: true, seconds: 30 });
      expect(parseCustomTime("02:00")).toEqual({ valid: true, seconds: 120 });
      expect(parseCustomTime("10:15")).toEqual({ valid: true, seconds: 615 });
      expect(parseCustomTime("99:59")).toEqual({ valid: true, seconds: 5999 });
    });

    it("rejects invalid inputs", () => {
      expect(parseCustomTime("120:00").valid).toBe(false);
      expect(parseCustomTime("abc").valid).toBe(false);
      expect(parseCustomTime("00:00").valid).toBe(false);
      expect(parseCustomTime("01:60").valid).toBe(false);
      expect(parseCustomTime("").valid).toBe(false);
    });
  });
});
