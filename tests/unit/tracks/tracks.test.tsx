import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AssignTrackModal } from "@/components/tracks/assign-track-modal";
import { ClassMatrixModal } from "@/components/tracks/class-matrix-modal";
import { TrackEditorModal } from "@/components/tracks/track-editor-modal";
import { StudentTracksTab } from "@/components/portal/student-tracks-tab";
import type { CatalogItem } from "@/lib/catalog/schema";
import type { Student, TeacherClass } from "@/lib/classes/types";
import type { LearningTrack } from "@/lib/tracks/types";
import * as tracksRepo from "@/lib/tracks/repository";

const mockCatalog: CatalogItem[] = [
  {
    id: "act-1",
    slug: "travel-quiz",
    title: "Travel Quiz",
    description: "At the airport quiz",
    category: "vocabulary",
    type: "quiz",
    levelMin: "beginner",
    levelMax: "intermediate",
    tags: ["travel"],
    thumbnail: { src: "/images/travel.jpg", alt: "Travel" },
    featured: true,
    createdAt: "2026-10-01T00:00:00Z",
  },
  {
    id: "act-2",
    slug: "hotel-flashcards",
    title: "Hotel Flashcards",
    description: "Hotel vocabulary",
    category: "vocabulary",
    type: "flashcards",
    levelMin: "beginner",
    levelMax: "beginner",
    tags: ["hotel"],
    thumbnail: { src: "/images/hotel.jpg", alt: "Hotel" },
    featured: false,
    createdAt: "2026-10-01T00:00:00Z",
  },
  {
    id: "act-3",
    slug: "restaurant-dialogue",
    title: "Restaurant Dialogue",
    description: "Ordering food",
    category: "speaking",
    type: "prompt-cards",
    levelMin: "intermediate",
    levelMax: "advanced",
    tags: ["food"],
    thumbnail: { src: "/images/food.jpg", alt: "Food" },
    featured: false,
    createdAt: "2026-10-01T00:00:00Z",
  },
  {
    id: "act-4",
    slug: "asking-directions",
    title: "Asking Directions",
    description: "Directions dialogue",
    category: "speaking",
    type: "prompt-cards",
    levelMin: "beginner",
    levelMax: "intermediate",
    tags: ["city"],
    thumbnail: { src: "/images/city.jpg", alt: "City" },
    featured: false,
    createdAt: "2026-10-01T00:00:00Z",
  },
  {
    id: "act-5",
    slug: "travel-jeopardy",
    title: "Travel Jeopardy",
    description: "Fun review jeopardy",
    category: "fun",
    type: "quiz-board",
    levelMin: "intermediate",
    levelMax: "advanced",
    tags: ["review"],
    thumbnail: { src: "/images/jeopardy.jpg", alt: "Jeopardy" },
    featured: false,
    createdAt: "2026-10-01T00:00:00Z",
  },
];

vi.mock("@/lib/catalog/use-catalog-index", () => ({
  useCatalogIndex: () => ({
    index: {
      schemaVersion: 1,
      updatedAt: "2026-10-01T00:00:00Z",
      items: mockCatalog,
    },
    loaded: true,
  }),
}));

const mockTrack: LearningTrack = {
  id: "track-travel",
  name: "Travel",
  description: "Complete travel module",
  level: "intermediate",
  activityIds: ["act-1", "act-2", "act-3", "act-4", "act-5"],
  countClassActivities: false,
  assignedClassIds: ["class-teens-b1"],
  assignedStudentIds: ["s-ana", "s-bruno"],
  createdAt: new Date("2026-10-01"),
  updatedAt: new Date("2026-10-01"),
};

const mockClasses: TeacherClass[] = [
  {
    id: "class-teens-b1",
    name: "Teens B1",
    studentIds: ["s-ana", "s-bruno"],
    archived: false,
    createdAt: new Date(),
  },
];

const mockStudents: Student[] = [
  {
    id: "s-ana",
    teacherUid: "teacher-1",
    name: "Ana Silva",
    classIds: ["class-teens-b1"],
    homeworkPin: "hash1",
    createdAt: new Date(),
  },
  {
    id: "s-bruno",
    teacherUid: "teacher-1",
    name: "Bruno Souza",
    classIds: ["class-teens-b1"],
    homeworkPin: "hash2",
    createdAt: new Date(),
  },
];

describe("Learning Tracks UI Components (spec 11)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("TrackEditorModal (RF01, RF02, CA02, CT02)", () => {
    it("renders existing track activities in order and reorders with Move up button (CA02)", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn().mockResolvedValue(undefined);

      render(
        <TrackEditorModal
          initialTrack={mockTrack}
          catalogItems={mockCatalog}
          isOpen={true}
          onClose={vi.fn()}
          onSave={onSave}
        />,
      );

      expect(screen.getByDisplayValue("Travel")).toBeInTheDocument();
      expect(screen.getByText("Travel Quiz")).toBeInTheDocument();
      expect(screen.getByText("Travel Jeopardy")).toBeInTheDocument();

      // Move Step 5 up 4 times to move it to position 1 (CA02)
      // Step 5 has move up button with label "Move up 5"
      const moveUpStep5 = screen.getByLabelText("Move up 5");
      await user.click(moveUpStep5); // now at pos 4
      const moveUpPos4 = screen.getByLabelText("Move up 4");
      await user.click(moveUpPos4); // now at pos 3
      const moveUpPos3 = screen.getByLabelText("Move up 3");
      await user.click(moveUpPos3); // now at pos 2
      const moveUpPos2 = screen.getByLabelText("Move up 2");
      await user.click(moveUpPos2); // now at pos 1!

      // Submit
      const saveBtn = screen.getByRole("button", { name: "Save" });
      await user.click(saveBtn);

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            name: "Travel",
            // act-5 was moved to position 1
            activityIds: ["act-5", "act-1", "act-2", "act-3", "act-4"],
          }),
        );
      });
    });

    it("prevents submitting with empty name or 0 activities", () => {
      const onSave = vi.fn().mockResolvedValue(undefined);

      render(
        <TrackEditorModal
          initialTrack={null}
          initialName=""
          initialActivityIds={[]}
          catalogItems={mockCatalog}
          isOpen={true}
          onClose={vi.fn()}
          onSave={onSave}
        />,
      );

      const saveBtn = screen.getByRole("button", { name: "Save" });
      expect(saveBtn).toBeDisabled();
    });
  });

  describe("AssignTrackModal (RF03, CA03, CT03)", () => {
    it("assigns track to class roster when class is selected (CA03)", async () => {
      const user = userEvent.setup();
      const onAssign = vi.fn().mockResolvedValue(undefined);

      render(
        <AssignTrackModal
          track={mockTrack}
          classes={mockClasses}
          students={mockStudents}
          isOpen={true}
          onClose={vi.fn()}
          onAssign={onAssign}
        />,
      );

      // Already selected or click to toggle
      const saveBtn = screen.getByRole("button", { name: "Save assignment" });
      await user.click(saveBtn);

      await waitFor(() => {
        expect(onAssign).toHaveBeenCalledWith(
          mockTrack,
          expect.arrayContaining(["s-ana", "s-bruno"]),
          expect.arrayContaining(["class-teens-b1"]),
        );
      });
    });
  });

  describe("ClassMatrixModal (RF07, CA06, CT06)", () => {
    it("renders class matrix with each student and progress percent (CA06)", async () => {
      vi.spyOn(tracksRepo, "getTrackClassMatrix").mockResolvedValue([
        {
          studentId: "s-ana",
          progress: {
            trackId: "track-travel",
            trackName: "Travel",
            activityIds: ["act-1", "act-2", "act-3", "act-4", "act-5"],
            completed: {
              "act-1": { at: "2026-10-01", source: "manual" },
              "act-2": { at: "2026-10-02", source: "homework" },
            },
            assignedAt: new Date(),
          },
        },
        {
          studentId: "s-bruno",
          progress: {
            trackId: "track-travel",
            trackName: "Travel",
            activityIds: ["act-1", "act-2", "act-3", "act-4", "act-5"],
            completed: {},
            assignedAt: new Date(),
          },
        },
      ]);

      render(
        <ClassMatrixModal
          track={mockTrack}
          classes={mockClasses}
          allStudents={mockStudents}
          catalogItems={mockCatalog}
          isOpen={true}
          onClose={vi.fn()}
        />,
      );

      // Ana with 2/5 -> 40%
      await waitFor(() => {
        expect(screen.getByText("Ana Silva")).toBeInTheDocument();
        expect(screen.getByText("40%")).toBeInTheDocument();
      });

      // Bruno with 0/5 -> 0%
      expect(screen.getByText("Bruno Souza")).toBeInTheDocument();
      expect(screen.getByText("0%")).toBeInTheDocument();
    });
  });

  describe("StudentTracksTab (RF04, RF09, CA04, CA08, CT04)", () => {
    it("renders student track progress percent and steps (CA04)", async () => {
      vi.spyOn(tracksRepo, "getStudentTracks").mockResolvedValue([
        {
          trackId: "track-travel",
          trackName: "Travel module",
          activityIds: ["act-1", "act-2", "act-3", "act-4", "act-5"],
          completed: {
            "act-1": { at: "2026-10-01", source: "manual" },
            "act-2": { at: "2026-10-02", source: "homework" },
          },
          assignedAt: new Date(),
        },
      ]);

      render(<StudentTracksTab studentId="s-ana" />);

      await waitFor(() => {
        expect(screen.getByText("Travel module")).toBeInTheDocument();
        // 2 of 5 = 40% (CA04)
        expect(screen.getByText("40%")).toBeInTheDocument();
      });

      expect(screen.getByText(/2 of 5 steps completed/i)).toBeInTheDocument();
    });

    it("displays 'No longer available' when an activity is removed from catalog (CA08)", async () => {
      vi.spyOn(tracksRepo, "getStudentTracks").mockResolvedValue([
        {
          trackId: "track-travel",
          trackName: "Travel module",
          // act-deleted is not in mockCatalog
          activityIds: ["act-1", "act-deleted", "act-2"],
          completed: {
            "act-1": { at: "2026-10-01", source: "manual" },
          },
          assignedAt: new Date(),
        },
      ]);

      render(<StudentTracksTab studentId="s-ana" />);

      await waitFor(() => {
        expect(screen.getByText("Travel module")).toBeInTheDocument();
      });

      // Shows 'No longer available' for act-deleted (CA08)
      expect(screen.getByText(/No longer available/i)).toBeInTheDocument();
    });
  });
});
