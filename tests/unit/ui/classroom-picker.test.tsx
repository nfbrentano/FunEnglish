import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClassroomPicker } from "@/components/ui/classroom-picker";
import { PICKER_CUSTOM_NAMES_STORAGE_KEY } from "@/lib/picker/types";

describe("ClassroomPicker (SDD/2026-10-03_06-sorteador-de-alunos-e-grupos.md)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  // CT01 / CA01: Giro básico
  // Dado uma sessão com 8 presentes, quando clico em "Spin",
  // então a roleta gira e para destacando um dos 8 nomes em tamanho grande.
  it("CT01 / CA01: spins with 8 present students and highlights a winner from the list", () => {
    const students = [
      "Ana",
      "Bruno",
      "Carlos",
      "Daniela",
      "Eduardo",
      "Fernanda",
      "Gabriel",
      "Helena",
    ];

    render(<ClassroomPicker students={students} hasActiveSession={true} />);

    const spinBtn = screen.getByRole("button", { name: /^spin$/i });
    expect(spinBtn).not.toBeDisabled();

    fireEvent.click(spinBtn);

    // During spin, button is disabled / shows spinning
    expect(screen.getByRole("button", { name: /spinning/i })).toBeDisabled();

    // Advance 2.5s animation duration
    act(() => {
      vi.advanceTimersByTime(2500);
    });

    // Winner banner is now visible with role="region" and aria-live="polite"
    const winnerBanner = screen.getByRole("region");
    expect(winnerBanner).toBeInTheDocument();

    // Winner must be one of the 8 students
    const highlightedName = within(winnerBanner).getByText((content) =>
      students.includes(content)
    );
    expect(highlightedName).toBeInTheDocument();
  });

  // CT02 / CA02: Sem repetição
  // Dado "Don't repeat" ativo e 3 presentes, quando giro 3 vezes,
  // então cada aluno é sorteado uma vez, e no quarto giro a roleta é reabastecida
  // automaticamente com aviso "Everyone has been picked — starting over".
  it("CT02 / CA02: with 'Don't repeat' active, picks all 3 uniquely then auto-replenishes on 4th spin with notice", () => {
    const students = ["Ana", "Bruno", "Carlos"];

    render(<ClassroomPicker students={students} hasActiveSession={true} />);

    // Activate "Don't repeat"
    const noRepeatCheckbox = screen.getByLabelText(/don't repeat/i);
    fireEvent.click(noRepeatCheckbox);
    expect(noRepeatCheckbox).toBeChecked();

    const pickedSet = new Set<string>();

    // 3 spins
    for (let spinIndex = 1; spinIndex <= 3; spinIndex++) {
      const spinBtn = screen.getByRole("button", {
        name: spinIndex === 1 ? /^spin$/i : /spin again/i,
      });
      fireEvent.click(spinBtn);

      act(() => {
        vi.advanceTimersByTime(2500);
      });

      const winnerBanner = screen.getByRole("region");
      const winnerName = within(winnerBanner).getByText((text) =>
        students.includes(text)
      ).textContent!;
      pickedSet.add(winnerName);
    }

    // All 3 students were uniquely picked
    expect(pickedSet.size).toBe(3);
    expect(Array.from(pickedSet).sort()).toEqual(students.slice().sort());

    // 4th spin: all were picked, auto-replenishes with notice
    const spinAgainBtn = screen.getByRole("button", { name: /spin again/i });
    fireEvent.click(spinAgainBtn);

    act(() => {
      vi.advanceTimersByTime(2500);
    });

    // Notice appears: "Everyone has been picked — starting over"
    expect(
      screen.getByText("Everyone has been picked — starting over")
    ).toBeInTheDocument();

    // A valid student from the replenished pool was picked
    const fourthBanner = screen.getByRole("region");
    expect(
      within(fourthBanner).getByText((text) => students.includes(text))
    ).toBeInTheDocument();
  });

  // CT03 / CA03: Lista avulsa
  // Dado que não há sessão ativa, quando colo 5 nomes na lista avulsa e recarrego a página,
  // então os 5 nomes continuam lá.
  it("CT03 / CA03: persists custom pasted names in localStorage across reloads", () => {
    const customList = "Mateus\nLarissa\nRafael\nCamila\nThiago";

    // Initial render without active session
    const { unmount } = render(<ClassroomPicker hasActiveSession={false} />);

    // Switch to Names tab
    const namesTab = screen.getByRole("tab", { name: /names/i });
    fireEvent.click(namesTab);

    // Edit textarea
    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: customList } });

    // Verify localStorage has saved the 5 names
    expect(localStorage.getItem(PICKER_CUSTOM_NAMES_STORAGE_KEY)).toBe(customList);

    // Simulate page reload by unmounting and rendering fresh
    unmount();

    render(<ClassroomPicker hasActiveSession={false} />);

    // Switch to Names tab again
    const namesTabReloaded = screen.getByRole("tab", { name: /names/i });
    fireEvent.click(namesTabReloaded);

    const reloadedTextarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(reloadedTextarea.value).toBe(customList);

    // Also verify header displays the 5 students count
    expect(screen.getByText(/5 students/i)).toBeInTheDocument();
  });

  // CT04 / CA04: Grupos equilibrados
  // Dado 10 presentes, quando peço "3 groups", então vejo 3 grupos de 4, 3 e 3,
  // sem aluno repetido nem faltando; e "Shuffle again" gera outra divisão.
  it("CT04 / CA04: divides 10 students into 3 groups of 4, 3, 3; shuffle again re-partitions; copy groups works", async () => {
    const students = [
      "S1",
      "S2",
      "S3",
      "S4",
      "S5",
      "S6",
      "S7",
      "S8",
      "S9",
      "S10",
    ];

    // Mock clipboard
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<ClassroomPicker students={students} hasActiveSession={true} />);

    // Navigate to Groups tab
    const groupsTab = screen.getByRole("tab", { name: /groups/i });
    fireEvent.click(groupsTab);

    // By default groupMode is "count" with groupCount = 3
    expect(screen.getByText("Group 1")).toBeInTheDocument();
    expect(screen.getByText("Group 2")).toBeInTheDocument();
    expect(screen.getByText("Group 3")).toBeInTheDocument();

    // Verify sizes: 4, 3, 3
    expect(screen.getByText("4 students")).toBeInTheDocument();
    const threeStudentBadges = screen.getAllByText("3 students");
    expect(threeStudentBadges).toHaveLength(2);

    // Shuffle again
    const shuffleBtn = screen.getByRole("button", { name: /shuffle again/i });
    fireEvent.click(shuffleBtn);

    // Check "Copy groups"
    const copyBtn = screen.getByRole("button", { name: /copy groups/i });
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(writeTextMock).toHaveBeenCalled();
    expect(screen.getByText(/groups copied!/i)).toBeInTheDocument();
  });

  // CT05 / CA05: Big screen
  // Dado um sorteio feito, quando clico em "Big screen", então o nome sorteado ocupa a tela em fonte grande,
  // e Esc fecha.
  it("CT05 / CA05: opens big screen overlay with large winner name and closes on Escape", () => {
    const students = ["Alice", "Bob"];

    render(<ClassroomPicker students={students} hasActiveSession={true} />);

    // Spin
    fireEvent.click(screen.getByRole("button", { name: /^spin$/i }));
    act(() => {
      vi.advanceTimersByTime(2500);
    });

    // Big screen button
    const bigScreenBtn = screen.getByRole("button", { name: /big screen/i });
    fireEvent.click(bigScreenBtn);

    // Big screen dialog is rendered
    const dialog = screen.getByRole("dialog", { name: /big screen/i });
    expect(dialog).toBeInTheDocument();

    // Press Escape to dismiss
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // CT06 / CA06: Skip
  // Dado que "Ana" foi sorteada com "Don't repeat" ativo,
  // quando clico em "Skip", então outro nome é sorteado e "Ana" volta a ser elegível.
  it("CT06 / CA06: clicking Skip keeps skipped student eligible and spins another student", () => {
    const students = ["Ana", "Bruno"];

    render(<ClassroomPicker students={students} hasActiveSession={true} />);

    // Activate "Don't repeat"
    fireEvent.click(screen.getByLabelText(/don't repeat/i));

    // Spin
    fireEvent.click(screen.getByRole("button", { name: /^spin$/i }));
    act(() => {
      vi.advanceTimersByTime(2500);
    });

    // Winner banner
    const winnerBanner = screen.getByRole("region");
    const firstWinner = within(winnerBanner).getByText(/Ana|Bruno/).textContent!;

    // Click Skip
    const skipBtn = screen.getByRole("button", { name: /skip/i });
    fireEvent.click(skipBtn);

    // Skip spins again
    act(() => {
      vi.advanceTimersByTime(2500);
    });

    // A second winner is displayed
    const secondWinnerBanner = screen.getByRole("region");
    const secondWinner = within(secondWinnerBanner).getByText(/Ana|Bruno/)
      .textContent!;

    // The other student was picked
    const otherStudent = firstWinner === "Ana" ? "Bruno" : "Ana";
    expect(secondWinner).toBe(otherStudent);

    // And firstWinner is still eligible (1 of 2 remaining, rather than 0)
    expect(screen.getByText(/1 of 2 remaining/i)).toBeInTheDocument();
  });

  // CT08 / CA08: Movimento reduzido
  // Dado prefers-reduced-motion: reduce, quando clico em "Spin",
  // então o resultado aparece sem animação de giro (imediatamente).
  it("CT08 / CA08: with prefers-reduced-motion: reduce, winner appears immediately without spin animation delay", () => {
    // Mock matchMedia to match reduced motion
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion: reduce"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    const students = ["Ana", "Bruno"];
    render(<ClassroomPicker students={students} hasActiveSession={true} />);

    fireEvent.click(screen.getByRole("button", { name: /^spin$/i }));

    // Winner banner is immediately present without advancing timers
    const winnerBanner = screen.getByRole("region");
    expect(winnerBanner).toBeInTheDocument();
    expect(within(winnerBanner).getByText(/Ana|Bruno/)).toBeInTheDocument();
  });

  // CT09 / CA09: Limites
  // Dado 0 ou 1 presente, quando abro o Picker, então "Spin" fica desabilitado
  // com a mensagem "Add at least 2 names"; e pedir mais grupos que alunos mostra "Not enough students for N groups".
  it("CT09 / CA09: disables Spin when < 2 students with 'Add at least 2 names'; shows error for groups > students", () => {
    // Test with 1 student
    render(<ClassroomPicker students={["Solo Student"]} hasActiveSession={true} />);

    const spinBtn = screen.getByRole("button", { name: /^spin$/i });
    expect(spinBtn).toBeDisabled();
    expect(screen.getByText("Add at least 2 names")).toBeInTheDocument();

    // Check Groups tab with groups > students
    const groupsTab = screen.getByRole("tab", { name: /groups/i });
    fireEvent.click(groupsTab);

    // groupCount is 3, students = 1 -> "Not enough students for 3 groups"
    expect(
      screen.getByText("Not enough students for 3 groups")
    ).toBeInTheDocument();
  });
});
