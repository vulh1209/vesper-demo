// src/config/llm.ts
import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import { createFallback } from 'ai-fallback';

/**
 * Supported LLM providers
 */
export type LLMProvider = 'openai' | 'gemini';

/**
 * LLM configuration with provider and model information
 */
export interface LLMConfig {
  provider: LLMProvider;
  model: ReturnType<typeof openai> | ReturnType<typeof google>;
  modelId: string;
}

/**
 * Provider status for health checks and monitoring
 */
export interface ProviderStatus {
  primary: LLMProvider | null;
  fallback: LLMProvider | null;
  hasFallback: boolean;
}

/**
 * Get LLM configuration based on environment variables
 *
 * Priority:
 * 1. LLM_PROVIDER env var (explicit selection)
 * 2. GOOGLE_GENERATIVE_AI_API_KEY presence (prefer Gemini if configured - cheaper)
 * 3. OPENAI_API_KEY (fallback to OpenAI)
 *
 * @returns LLM configuration with provider and model
 * @throws Error if no LLM provider is configured
 *
 * @example
 * const config = getLLMConfig();
 * console.log(config.provider); // 'gemini' or 'openai'
 */
export function getLLMConfig(): LLMConfig {
  const explicitProvider = process.env.LLM_PROVIDER as LLMProvider | undefined;
  const hasGemini = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;

  if (!hasGemini && !hasOpenAI) {
    throw new Error(
      'No LLM provider configured. Set OPENAI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY.'
    );
  }

  // Explicit provider selection via LLM_PROVIDER env var
  if (explicitProvider === 'gemini') {
    if (!hasGemini) {
      throw new Error('LLM_PROVIDER=gemini but GOOGLE_GENERATIVE_AI_API_KEY is not set.');
    }
    return {
      provider: 'gemini',
      model: google('gemini-2.0-flash'),
      modelId: 'gemini-2.0-flash',
    };
  }

  if (explicitProvider === 'openai') {
    if (!hasOpenAI) {
      throw new Error('LLM_PROVIDER=openai but OPENAI_API_KEY is not set.');
    }
    return {
      provider: 'openai',
      model: openai('gpt-4o-mini'),
      modelId: 'gpt-4o-mini',
    };
  }

  // Auto-detection: prefer Gemini if configured (cheaper)
  if (hasGemini) {
    return {
      provider: 'gemini',
      model: google('gemini-2.0-flash'),
      modelId: 'gemini-2.0-flash',
    };
  }

  // Fallback to OpenAI
  return {
    provider: 'openai',
    model: openai('gpt-4o-mini'),
    modelId: 'gpt-4o-mini',
  };
}

/**
 * Create model with automatic failover between providers
 *
 * If both providers are configured, uses ai-fallback for automatic
 * failover on rate limits, timeouts, or errors.
 *
 * Primary: Gemini (cheaper at ~$0.00005/query vs $0.00015/query)
 * Fallback: OpenAI
 *
 * @returns Model instance (with fallback if both configured)
 * @throws Error if no LLM provider is configured
 *
 * @example
 * const model = getModelWithFallback();
 * const result = await generateObject({ model, schema, prompt });
 */
export function getModelWithFallback() {
  const hasGemini = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;

  if (hasGemini && hasOpenAI) {
    // Both available: use fallback for resilience
    return createFallback({
      models: [
        google('gemini-2.0-flash'),  // Primary: cheaper
        openai('gpt-4o-mini'),        // Fallback
      ],
      onError: (error, modelId) => {
        console.warn(`LLM error with ${modelId}:`, error.message);
      },
      // Retry primary after 5 minutes of using fallback
      modelResetInterval: 5 * 60 * 1000,
    });
  }

  // Single provider mode
  if (hasGemini) {
    return google('gemini-2.0-flash');
  }

  if (hasOpenAI) {
    return openai('gpt-4o-mini');
  }

  throw new Error(
    'No LLM provider configured. Set OPENAI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY.'
  );
}

/**
 * Get provider status for health checks and monitoring
 *
 * @returns Status object with primary provider, fallback, and availability
 *
 * @example
 * const status = getProviderStatus();
 * console.log(status);
 * // { primary: 'gemini', fallback: 'openai', hasFallback: true }
 */
export function getProviderStatus(): ProviderStatus {
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasGemini = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const explicit = process.env.LLM_PROVIDER as LLMProvider | undefined;

  if (!hasOpenAI && !hasGemini) {
    return { primary: null, fallback: null, hasFallback: false };
  }

  // Explicit provider selection
  if (explicit === 'openai') {
    return {
      primary: 'openai',
      fallback: hasGemini ? 'gemini' : null,
      hasFallback: hasGemini,
    };
  }

  if (explicit === 'gemini') {
    return {
      primary: 'gemini',
      fallback: hasOpenAI ? 'openai' : null,
      hasFallback: hasOpenAI,
    };
  }

  // Auto-detection: prefer Gemini (cheaper)
  if (hasGemini) {
    return {
      primary: 'gemini',
      fallback: hasOpenAI ? 'openai' : null,
      hasFallback: hasOpenAI,
    };
  }

  return {
    primary: 'openai',
    fallback: null,
    hasFallback: false,
  };
}

/**
 * Check if fallback provider is available
 *
 * @returns true if both API keys are configured
 *
 * @example
 * if (hasFallbackAvailable()) {
 *   console.log('Fallback provider ready');
 * }
 */
export function hasFallbackAvailable(): boolean {
  return !!(process.env.OPENAI_API_KEY && process.env.GOOGLE_GENERATIVE_AI_API_KEY);
}
