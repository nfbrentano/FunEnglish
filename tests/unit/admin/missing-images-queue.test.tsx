import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MissingImagesView } from "@/components/admin/missing-images-view";
import * as activitiesAdmin from "@/lib/admin/activities-admin";
import * as github from "@/lib/admin/github";
import * as imageProcessing from "@/lib/admin/image-processing";
import {
  clearQueuedImages,
  getAllQueuedImages,
  _resetMemoryStoreForTesting,
} from "@/lib/admin/image-queue-storage";
import type { Activity } from "@/lib/activities/schema/activity";

const mockActivities: Activity[] = [
  {
    schemaVersion: 1,
    id: "act-1",
    slug: "reading-science-news",
    title: "Reading Science News",
    description: "Read science news and answer questions.",
    category: "reading",
    levelMin: "intermediate",
    levelMax: "intermediate",
    tags: ["science", "reading"],
    featured: false,
    origin: "ai",
    reviewStatus: "pending",
    searchTokens: [],
    status: "published",
    type: "quiz",
    createdAt: new Date(),
    updatedAt: new Date(),
    content: {
      questions: [
        {
          prompt: "Q1",
          explanation: "Because A",
          options: [
            { text: "A", correct: true },
            { text: "B", correct: false },
          ],
        },
      ],
    },
    thumbnail: {
      src: "/images/activities/reading-science-news/thumb.webp",
      alt: "Reading science news thumbnail",
      source: "ai",
    },
  },
  {
    schemaVersion: 1,
    id: "act-2",
    slug: "travel-stories",
    title: "Travel Stories",
    description: "Travel vocabulary and comprehension.",
    category: "vocabulary",
    levelMin: "beginner",
    levelMax: "beginner",
    tags: ["travel", "words"],
    featured: false,
    origin: "ai",
    reviewStatus: "pending",
    searchTokens: [],
    status: "published",
    type: "quiz",
    createdAt: new Date(),
    updatedAt: new Date(),
    content: {
      questions: [
        {
          prompt: "Q2",
          explanation: "Because A",
          options: [
            { text: "A", correct: true },
            { text: "B", correct: false },
          ],
        },
      ],
    },
    thumbnail: {
      src: "/images/activities/travel-stories/thumb.webp",
      alt: "Travel stories thumbnail",
      source: "ai",
    },
  },
];

describe("MissingImagesView Image Queue (spec: fila de imagens no painel, RF01-RF07, CA01, CA02, CA04, CA06, CA07, CA11)", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    _resetMemoryStoreForTesting();
    await clearQueuedImages();

    // Mock URL.createObjectURL and revokeObjectURL
    globalThis.URL.createObjectURL = vi.fn((blob: Blob) => `blob:mock-url-${blob.size}`);
    globalThis.URL.revokeObjectURL = vi.fn();

    vi.spyOn(activitiesAdmin, "listActivities").mockResolvedValue(mockActivities);
    vi.spyOn(imageProcessing, "toWebp").mockImplementation(async (file) => {
      return new Blob(["webp-data"], { type: "image/webp" });
    });
  });

  it("attaches an image to local queue without committing to GitHub (RF01, CA01, CT01)", async () => {
    const commitFilesSpy = vi.spyOn(github, "commitFiles");

    render(<MissingImagesView imagePaths={[]} style="Flat style" />);

    // Wait for list to load
    expect(await screen.findByText("Reading Science News")).toBeInTheDocument();

    const attachButtons = screen.getAllByRole("button", { name: /Attach:/i });
    expect(attachButtons.length).toBeGreaterThan(0);

    // Initial queue summary bar
    expect(screen.getByText(/0 images queued · 0 KB/i)).toBeInTheDocument();

    // Trigger file input for act-1
    const fileInputs = screen.getAllByLabelText(/Attach reading-science-news--thumb.png/i);
    const testFile = new File(["test-png"], "test.png", { type: "image/png" });
    await userEvent.upload(fileInputs[0], testFile);

    // After attaching: badge "Queued" appears, summary updates
    await waitFor(() => {
      expect(screen.getByText(/1 image queued/i)).toBeInTheDocument();
    });

    expect(screen.getByText("Queued")).toBeInTheDocument();

    // Button changed to "Replace"
    expect(screen.getByRole("button", { name: /Replace.*reading-science-news--thumb\.png/i })).toBeInTheDocument();

    // Action "Remove" appears
    expect(screen.getByRole("button", { name: /Remove: reading-science-news--thumb.png/i })).toBeInTheDocument();

    // Crucially: NO call was made to GitHub (CA01)
    expect(commitFilesSpy).not.toHaveBeenCalled();
  });

  it("replaces and removes an item from the queue (RF02, CA04, CT04)", async () => {
    render(<MissingImagesView imagePaths={[]} style="Flat style" />);

    expect(await screen.findByText("Reading Science News")).toBeInTheDocument();

    const fileInput = screen.getAllByLabelText(/Attach reading-science-news--thumb.png/i)[0];
    const file1 = new File(["v1"], "v1.png", { type: "image/png" });
    await userEvent.upload(fileInput, file1);

    await waitFor(() => {
      expect(screen.getByText(/1 image queued/i)).toBeInTheDocument();
    });

    // Replace with new file
    const replaceInput = fileInput.closest("li")!.querySelector<HTMLInputElement>("input[type=file]")!;
    const file2 = new File(["v2-longer"], "v2.png", { type: "image/png" });
    await userEvent.upload(replaceInput, file2);

    // Still exactly 1 item in queue (CA04)
    await waitFor(() => {
      expect(screen.getByText(/1 image queued/i)).toBeInTheDocument();
    });

    // Click Remove
    const removeBtn = screen.getByRole("button", { name: /Remove: reading-science-news--thumb.png/i });
    await userEvent.click(removeBtn);

    // Queue returns to 0
    await waitFor(() => {
      expect(screen.getByText(/0 images queued/i)).toBeInTheDocument();
    });
    expect(screen.queryByText("Queued")).not.toBeInTheDocument();
  });

  it("shows warning if attempting to Send All without GitHub token and keeps queue intact (CA11, CT11)", async () => {
    vi.spyOn(github, "readToken").mockReturnValue(null);
    const commitFilesSpy = vi.spyOn(github, "commitFiles");

    render(<MissingImagesView imagePaths={[]} style="Flat style" />);

    expect(await screen.findByText("Reading Science News")).toBeInTheDocument();

    const fileInput = screen.getAllByLabelText(/Attach reading-science-news--thumb.png/i)[0];
    await userEvent.upload(fileInput, new File(["data"], "data.png", { type: "image/png" }));

    await waitFor(() => {
      expect(screen.getByText(/1 image queued/i)).toBeInTheDocument();
    });

    const sendAllBtn = screen.getByRole("button", { name: /Send all \(1\)/i });
    await userEvent.click(sendAllBtn);

    // Shows warning to connect GitHub
    await waitFor(() => {
      expect(screen.getByText(/Connect GitHub to upload images/i)).toBeInTheDocument();
    });

    // Queue remains intact (CA11)
    expect(screen.getByText(/1 image queued/i)).toBeInTheDocument();
    expect(commitFilesSpy).not.toHaveBeenCalled();
  });

  it("commits all queued images in ONE commit and empties the queue (RF04, RF06, CA02, CT02)", async () => {
    vi.spyOn(github, "readToken").mockReturnValue("valid-token");
    const commitSpy = vi.spyOn(github, "commitFiles").mockResolvedValue("https://github.com/commit/new-123");

    render(<MissingImagesView imagePaths={[]} style="Flat style" />);

    expect(await screen.findByText("Reading Science News")).toBeInTheDocument();

    // Attach act-1
    const input1 = screen.getAllByLabelText(/Attach reading-science-news--thumb.png/i)[0];
    await userEvent.upload(input1, new File(["file-1"], "f1.png", { type: "image/png" }));

    // Attach act-2
    const input2 = screen.getAllByLabelText(/Attach travel-stories--thumb.png/i)[0];
    await userEvent.upload(input2, new File(["file-2"], "f2.png", { type: "image/png" }));

    await waitFor(() => {
      expect(screen.getByText(/2 images queued/i)).toBeInTheDocument();
    });

    const sendAllBtn = screen.getByRole("button", { name: /Send all \(2\)/i });
    await userEvent.click(sendAllBtn);

    // Verified: exactly ONE commit on main (RF04, CA02)
    await waitFor(() => {
      expect(commitSpy).toHaveBeenCalledTimes(1);
    });

    const commitMessage = commitSpy.mock.calls[0][2];
    expect(commitMessage).toMatch(/content\(images\): 2 images \(.*reading-science-news.*travel-stories.*\) \(via admin panel\)/);

    // Queue is emptied (RF06, CA02)
    await waitFor(() => {
      expect(screen.getByText(/0 images queued · 0 KB/i)).toBeInTheDocument();
    });

    // Uploaded badge appears
    expect(screen.getAllByText(/Uploaded — live after the deploy/i).length).toBeGreaterThan(0);
    expect((await getAllQueuedImages()).items).toHaveLength(0);
  });

  it("displays 'Already on the site' and excludes it from Send All (RF09, CA06, CT06)", async () => {
    const existingPath = "/images/activities/reading-science-news/thumb.webp";

    // Pre-populate queue with this item (as if queued prior to deploy)
    const { saveQueuedImage } = await import("@/lib/admin/image-queue-storage");
    await saveQueuedImage({
      src: existingPath,
      blob: new Blob(["old-queued-data"]),
      size: 15,
      addedAt: Date.now(),
      fileName: "reading-science-news--thumb.png",
      title: "Reading Science News",
    });

    render(<MissingImagesView imagePaths={[existingPath]} style="Flat style" />);

    // Wait for view to load
    expect(await screen.findByText("Reading Science News")).toBeInTheDocument();

    // Shows "Already on the site" badge (CA06)
    expect(screen.getByText("Already on the site")).toBeInTheDocument();

    // Does NOT have "Attach" button since it is already on site
    expect(screen.queryByRole("button", { name: /Attach: reading-science-news--thumb.png/i })).not.toBeInTheDocument();

    // Does have "Remove" button so user can clean up
    expect(screen.getByRole("button", { name: /Remove: reading-science-news--thumb.png/i })).toBeInTheDocument();
  });

  it("adds matching files from 'Upload several' to the queue and reports unknown files in skipped (RF10, CA07, CT07)", async () => {
    const commitFilesSpy = vi.spyOn(github, "commitFiles");

    render(<MissingImagesView imagePaths={[]} style="Flat style" />);

    expect(await screen.findByText("Reading Science News")).toBeInTheDocument();

    const severalInput = screen.getByLabelText(/Upload several/i);
    const validFile = new File(["valid1"], "reading-science-news--thumb.png", { type: "image/png" });
    const unknownFile = new File(["unknown"], "unknown-random-file.png", { type: "image/png" });

    await userEvent.upload(severalInput, [validFile, unknownFile]);

    // Valid file added to queue without committing
    await waitFor(() => {
      expect(screen.getByText(/1 image queued/i)).toBeInTheDocument();
    });

    // Unknown file reported in skipped
    expect(screen.getByText(/Skipped.*unknown-random-file\.png/i)).toBeInTheDocument();
    expect(commitFilesSpy).not.toHaveBeenCalled();
  });

  it("clears the queue when Clear queue button is confirmed (RF03)", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<MissingImagesView imagePaths={[]} style="Flat style" />);

    expect(await screen.findByText("Reading Science News")).toBeInTheDocument();

    const fileInput = screen.getAllByLabelText(/Attach reading-science-news--thumb.png/i)[0];
    await userEvent.upload(fileInput, new File(["data"], "data.png", { type: "image/png" }));

    await waitFor(() => {
      expect(screen.getByText(/1 image queued/i)).toBeInTheDocument();
    });

    const clearBtn = screen.getByRole("button", { name: /Clear queue/i });
    await userEvent.click(clearBtn);

    await waitFor(() => {
      expect(screen.getByText(/0 images queued · 0 KB/i)).toBeInTheDocument();
    });
  });
});
