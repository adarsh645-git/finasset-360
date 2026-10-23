import { describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser } }),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));

const { default: AppLayout } = await import("@/app/(app)/layout");

describe("(app) layout", () => {
  it("SH-01 a signed-out visitor is redirected to the login page", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const error = await AppLayout({ children: null }).then(
      () => null,
      (thrown: unknown) => thrown as { digest?: string },
    );
    expect(error?.digest).toMatch(/^NEXT_REDIRECT;[a-z]+;\/login;/);
  });
});
