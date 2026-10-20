import assert from "node:assert/strict";
import test from "node:test";

import {userMutationGuard} from "../src/features/admin/user-policy.ts";
import {adminUserDeleteSchema, adminUserStatusSchema} from "../src/features/admin/validation.ts";

test("only ordinary user targets can be managed", () => {
  assert.equal(userMutationGuard("admin", {id: "member", role: "USER"}), "ALLOWED");
  assert.equal(userMutationGuard("admin", {id: "admin", role: "ADMIN"}), "SELF_PROTECTED");
  assert.equal(userMutationGuard("admin", {id: "other-admin", role: "ADMIN"}), "ADMIN_PROTECTED");
  assert.equal(userMutationGuard("admin", undefined), "NOT_FOUND");
});

test("permanent deletion requires the exact DELETE confirmation", () => {
  assert.equal(adminUserDeleteSchema.safeParse({confirmation: "DELETE"}).success, true);
  assert.equal(adminUserDeleteSchema.safeParse({confirmation: "delete"}).success, false);
  assert.equal(adminUserDeleteSchema.safeParse({confirmation: " DELETE "}).success, false);
});

test("account status updates accept only supported lifecycle values", () => {
  assert.equal(adminUserStatusSchema.safeParse({status: "ACTIVE"}).success, true);
  assert.equal(adminUserStatusSchema.safeParse({status: "INACTIVE"}).success, true);
  assert.equal(adminUserStatusSchema.safeParse({status: "DELETED"}).success, false);
});
