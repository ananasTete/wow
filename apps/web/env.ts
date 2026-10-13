import { createEnv } from "@t3-oss/env-core";
import { sharedServerSchema } from "@wow/shared";
import { z } from "zod";

export const env = createEnv({
  server: {
    ...sharedServerSchema,
    API_SECRET: z.string().min(1),
  },
  clientPrefix: "PUBLIC_",
  client: {},
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    API_SECRET: process.env.API_SECRET,
  },
});
