import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ContactForm } from "@/components/pages/contact-form";
import { FaqAccordion } from "@/components/pages/faq-accordion";
import { validateContact } from "@/lib/contact/contact";

describe("FaqAccordion (CA02)", () => {
  it("expands and collapses with aria-expanded", async () => {
    render(
      <FaqAccordion
        questions={[
          { question: "Is it free?", html: "<p>Yes.</p>" },
          { question: "Do I need an account?", html: "<p>No.</p>" },
        ]}
      />,
    );
    const button = screen.getByRole("button", { name: "Is it free?" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("region", { name: "Is it free?" })).not.toBeInTheDocument();

    await userEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("region", { name: "Is it free?" })).toHaveTextContent("Yes.");
    expect(button).toHaveAttribute("aria-controls", screen.getByRole("region").id);

    await userEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "false");
  });
});

const valid = {
  name: "Ana",
  email: "ana@example.com",
  subject: "Idea",
  message: "A quiz about phrasal verbs, please!",
};

describe("validateContact", () => {
  it("accepts a valid message and trims it", () => {
    expect(validateContact({ ...valid, name: "  Ana " })).toEqual({
      ok: true,
      data: { ...valid, name: "Ana" },
    });
  });

  it("explains each problem", () => {
    const result = validateContact({
      name: "",
      email: "abc",
      subject: "",
      message: "x".repeat(2001),
    });
    expect(result).toEqual({
      ok: false,
      errors: {
        name: "Please enter your name",
        email: "Please enter a valid email",
        subject: "Please enter a subject",
        message: "Please keep it under 2,000 characters",
      },
    });
  });
});

async function fill(values: Partial<typeof valid> = {}) {
  const v = { ...valid, ...values };
  for (const [label, value] of [
    ["Name", v.name],
    ["Email", v.email],
    ["Subject", v.subject],
    ["Message", v.message],
  ] as const) {
    if (value) await userEvent.type(screen.getByLabelText(label), value);
  }
}

describe("ContactForm", () => {
  it("sends a valid message and thanks the sender (CA03)", async () => {
    const send = vi.fn(async () => {});
    render(<ContactForm send={send} />);
    await fill();
    await userEvent.click(screen.getByRole("button", { name: "Send message" }));

    expect(send).toHaveBeenCalledWith(valid);
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Thanks! We'll get back to you soon.",
    );
  });

  it("blocks an invalid email and points to the field (CA07)", async () => {
    const send = vi.fn(async () => {});
    render(<ContactForm send={send} />);
    await fill({ email: "abc" });
    await userEvent.click(screen.getByRole("button", { name: "Send message" }));

    const email = screen.getByLabelText("Email");
    expect(send).not.toHaveBeenCalled();
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAccessibleDescription("Please enter a valid email");
    expect(email).toHaveFocus();
  });

  it("silently drops messages from bots that fill the honeypot (CA06)", async () => {
    const send = vi.fn(async () => {});
    const { container } = render(<ContactForm send={send} />);
    await fill();
    await userEvent.type(container.querySelector<HTMLInputElement>('[name="website"]')!, "spam");
    await userEvent.click(screen.getByRole("button", { name: "Send message" }));

    expect(send).not.toHaveBeenCalled();
    expect(await screen.findByRole("status")).toHaveTextContent("Thanks!");
  });

  it("keeps the message and explains when sending fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<ContactForm send={vi.fn(async () => Promise.reject(new Error("offline")))} />);
    await fill();
    await userEvent.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't send your message");
    expect(screen.getByLabelText("Message")).toHaveValue(valid.message);
    warn.mockRestore();
  });

  it("counts characters toward the limit", async () => {
    render(<ContactForm send={vi.fn()} />);
    await userEvent.type(screen.getByLabelText("Message"), "Hello");
    const message = screen.getByLabelText("Message");
    expect(within(message.parentElement!).getByText("5 / 2,000")).toBeInTheDocument();
  });
});
