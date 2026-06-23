/**
 * RLS (Row-Level Security) isolation tests.
 *
 * These tests verify that one user cannot read or modify another user's data.
 * They sign in as TWO real test users via the anon key and assert that
 * cross-user access is denied by the database policies.
 *
 * --- HOW TO RUN LOCALLY ---
 * Add these env vars to your local .env.test (DO NOT commit):
 *   VITE_SUPABASE_URL=...           (already in .env)
 *   VITE_SUPABASE_PUBLISHABLE_KEY=... (already in .env)
 *   RLS_TEST_USER_A_EMAIL=...        (an approved test user)
 *   RLS_TEST_USER_A_PASSWORD=...
 *   RLS_TEST_USER_B_EMAIL=...        (another approved test user)
 *   RLS_TEST_USER_B_PASSWORD=...
 *
 * Then run:  npx vitest run src/test/rls
 *
 * If the user env vars are absent, every test in this file is skipped (not
 * failed) so CI doesn't break for contributors without test accounts.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as
  | string
  | undefined;
const USER_A_EMAIL = import.meta.env.RLS_TEST_USER_A_EMAIL as string | undefined;
const USER_A_PASS = import.meta.env.RLS_TEST_USER_A_PASSWORD as
  | string
  | undefined;
const USER_B_EMAIL = import.meta.env.RLS_TEST_USER_B_EMAIL as string | undefined;
const USER_B_PASS = import.meta.env.RLS_TEST_USER_B_PASSWORD as
  | string
  | undefined;

const canRun =
  !!SUPABASE_URL &&
  !!SUPABASE_KEY &&
  !!USER_A_EMAIL &&
  !!USER_A_PASS &&
  !!USER_B_EMAIL &&
  !!USER_B_PASS;

const d = canRun ? describe : describe.skip;

async function signedInClient(
  email: string,
  password: string,
): Promise<{ client: SupabaseClient; userId: string }> {
  const client = createClient(SUPABASE_URL!, SUPABASE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.user) {
    throw new Error(`Falha ao logar como ${email}: ${error?.message}`);
  }
  return { client, userId: data.user.id };
}

d("RLS isolation between users", () => {
  let userA: { client: SupabaseClient; userId: string };
  let userB: { client: SupabaseClient; userId: string };

  beforeAll(async () => {
    userA = await signedInClient(USER_A_EMAIL!, USER_A_PASS!);
    userB = await signedInClient(USER_B_EMAIL!, USER_B_PASS!);
  });

  it("user A cannot read user B's notifications", async () => {
    const { data, error } = await userA.client
      .from("notifications")
      .select("id, user_id")
      .eq("user_id", userB.userId);
    expect(error).toBeNull();
    // Empty array == RLS filtered everything (expected).
    expect(data).toEqual([]);
  });

  it("user A cannot read user B's push subscriptions", async () => {
    const { data, error } = await userA.client
      .from("push_subscriptions")
      .select("id")
      .eq("user_id", userB.userId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("user A cannot update user B's profile (role/category/approval are locked)", async () => {
    const { data, error } = await userA.client
      .from("profiles")
      .update({ full_name: "HACKED" })
      .eq("id", userB.userId)
      .select();
    // Either an explicit RLS error OR an empty result with no rows affected.
    if (error) {
      expect(error.message).toBeTruthy();
    } else {
      expect(data).toEqual([]);
    }
  });

  it("user A cannot directly insert into system_logs (admin-only)", async () => {
    const { error } = await userA.client.from("system_logs").insert({
      action: "rls_test",
      entity_type: "test",
      entity_id: userA.userId,
      user_id: userA.userId,
      user_name: "test",
      details: {},
    });
    expect(error).toBeTruthy();
  });

  it("user A cannot read user B's tool_checkouts", async () => {
    const { data, error } = await userA.client
      .from("tool_checkouts")
      .select("id, user_id")
      .eq("user_id", userB.userId);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("user A cannot read the rate_limits table (locked to service_role)", async () => {
    const { data, error } = await userA.client.from("rate_limits").select("*");
    // RLS with no policy -> empty result (or explicit error if grants missing).
    if (!error) expect(data).toEqual([]);
  });
});
