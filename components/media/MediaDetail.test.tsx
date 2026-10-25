import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { MediaDetail } from "./MediaDetail"

// Server actions must not run in the test environment: they require a real
// Next request scope (auth, Firebase). The component only needs the shortcut
// check to resolve so its effect completes.
vi.mock("@/lib/actions/shortcuts", () => ({
  isShortcut: vi.fn().mockResolvedValue(false),
  addShortcut: vi.fn().mockResolvedValue(undefined),
  removeShortcut: vi.fn().mockResolvedValue(undefined),
}))

describe("MediaDetail", () => {
  it("shows only the title and actions for a storage", () => {
    render(
      <MediaDetail
        media={{
          id: "storage-1",
          title: "Mi storage",
          provider: "cloudflare-r2",
          allowedUsers: [{ email: "user@example.com", role: "owner" }],
          memberEmails: ["user@example.com"],
          config: {
            accountId: "account-123",
            accessKeyId: "key-123",
            bucket: "mi-bucket",
            secretEnc: "encrypted-secret",
          },
          createdAt: { seconds: 1, nanoseconds: 0 },
          updatedAt: { seconds: 2, nanoseconds: 0 },
        }}
        userEmail="user@example.com"
      />,
    )

    expect(
      screen.getByRole("heading", { name: "Mi storage" }),
    ).toBeInTheDocument()

    expect(screen.queryByText("Cloudflare R2")).not.toBeInTheDocument()
    expect(screen.queryByText("mi-bucket")).not.toBeInTheDocument()
    expect(screen.queryByText("Account ID")).not.toBeInTheDocument()
    expect(screen.queryByText("Access Key ID")).not.toBeInTheDocument()
    expect(screen.queryByText("Secret Access Key")).not.toBeInTheDocument()
  })
})
