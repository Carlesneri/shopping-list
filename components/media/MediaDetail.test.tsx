import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { MediaDetail } from "./MediaDetail"

describe("MediaDetail", () => {
  it("shows only the title, provider, and bucket for a storage", () => {
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

    expect(screen.getByRole("heading", { name: "Mi storage" })).toBeInTheDocument()
    expect(screen.getByText("Cloudflare R2")).toBeInTheDocument()
    expect(screen.getByText("mi-bucket")).toBeInTheDocument()

    expect(screen.queryByText("Account ID")).not.toBeInTheDocument()
    expect(screen.queryByText("Access Key ID")).not.toBeInTheDocument()
    expect(screen.queryByText("Secret Access Key")).not.toBeInTheDocument()
  })
})
