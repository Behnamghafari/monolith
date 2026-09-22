import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development','test','production']).default('development'),
  PORT: z.coerce.number().default(3000),
  MONGODB_URI: z.string().default('mongodb://mongo:27017/modular?replicaSet=rs0'),
  JWT_ACCESS_SECRET: z.string().min(16).default('development-access-secret'),
  JWT_REFRESH_SECRET: z.string().min(16).default('development-refresh-secret'),
  BROWSER_WS_ENDPOINT: z.string().optional(),
});
export type AppEnv = z.infer<typeof schema>;
export const parseEnv = (input: NodeJS.ProcessEnv): AppEnv => schema.parse(input);
