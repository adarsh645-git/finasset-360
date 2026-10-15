import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

// SignOutButton calls useRouter(), which needs the App Router context; this
// suite renders the view in isolation, so stub only that hook and keep the
// real redirect().
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: () => {}, refresh: () => {}, replace: () => {} }),
}));

const { InterimHome } = await import("@/components/InterimHome");
const { requireSignedInUser } = await import("@/lib/auth/require-signed-in-user");

function sessionOf(user: { email?: string; user_metadata: Record<string, unknown> } | null) {
  return { auth: { getUser: async () => ({ data: { user } }) } };
}

describe("the interim home page", () => {
  it("CI-01 a signed-in User sees the interim page with their name and Sign out, and no figures", async () => {
    const user = await requireSignedInUser(
      sessionOf({ email: "adarsh@example.test", user_metadata: { full_name: "Adarsh Reddy" } }),
    );
    const html = renderToStaticMarkup(<InterimHome user={user} />);

    expect(html).toContain("being rebuilt");
    expect(html).toContain("Adarsh");
    expect(html).not.toContain("Reddy");
    expect(html).toContain("Sign out");
    expect(html).not.toMatch(/Net Worth|Holding|Liabilit|[$₹]\s?\d/i);
  });

  it("CI-02 a signed-out visitor is redirected to the sign-in page", async () => {
    const error = await requireSignedInUser(sessionOf(null)).then(
      () => null,
      (thrown: unknown) => thrown as { digest?: string },
    );

    expect(error?.digest).toMatch(/^NEXT_REDIRECT;[a-z]+;\/login;/);
  });
});
