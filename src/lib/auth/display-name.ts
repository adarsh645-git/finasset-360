// Google OAuth lands the profile's display name in user_metadata.full_name;
// falls back to email so the top strip never renders blank.
export function firstNameOrEmail(user: {
  email?: string;
  user_metadata: Record<string, unknown>;
}): string {
  const fullName = user.user_metadata.full_name;
  const trimmed = typeof fullName === "string" ? fullName.trim() : "";
  if (trimmed) return trimmed.split(/\s+/)[0];
  return user.email ?? "";
}
