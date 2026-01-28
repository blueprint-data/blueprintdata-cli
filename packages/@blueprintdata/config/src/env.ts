import { z } from 'zod';
import { config } from 'dotenv';

config();

const envSchema = z.object({
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),

  UI_PORT: z.coerce.number().min(1).max(65535).default(3000),
  GATEWAY_PORT: z.coerce.number().min(1).max(65535).default(8080),

  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  ENABLE_LLM_ENRICHMENT: z
    .string()
    .default('true')
    .transform((val) => val === 'true' || val === '1'),

  WAREHOUSE_CONNECTION_TIMEOUT: z.coerce.number().positive().optional(),
  WAREHOUSE_QUERY_TIMEOUT: z.coerce.number().positive().optional(),

  PROFILING_MAX_SAMPLE_SIZE: z.coerce.number().positive().optional(),
  PROFILING_TIMEOUT_SECONDS: z.coerce.number().positive().optional(),
  PROFILING_INCLUDE_ROW_COUNTS: z
    .string()
    .transform((val) => val === 'true' || val === '1')
    .pipe(z.boolean())
    .optional(),
});

export type Env = z.infer<typeof envSchema>;

let parsedEnv: Env;

try {
  parsedEnv = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Environment variable validation failed:');
    error.errors.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    process.exit(1);
  }
  throw error;
}

export const env = parsedEnv;
