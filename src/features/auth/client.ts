"use client";

import {createAuthClient} from "better-auth/react";
import {inferAdditionalFields} from "better-auth/client/plugins";
import type {auth} from "@/features/auth/server";

export const authClient = createAuthClient({plugins: [inferAdditionalFields<typeof auth>()]});
