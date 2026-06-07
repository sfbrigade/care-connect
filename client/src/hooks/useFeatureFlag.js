import { useEffect, useState } from 'react';

/**
 * Returns the boolean value of a PostHog feature flag, with two escape hatches:
 *
 *  1. If VITE_POSTHOG_KEY is not set (most dev environments), PostHog never
 *     initialises and window.posthog is absent. In that case the hook returns
 *     `defaultValue` immediately, so the feature behaves as if the flag were
 *     set to that value — no PostHog account needed for local work.
 *
 *  2. Each flag can be overridden per-environment via a matching VITE_ env var,
 *     e.g. VITE_FLAG_PUSH_NOTIFICATIONS=true overrides the 'push-notifications'
 *     flag. The env var takes precedence over both PostHog and defaultValue.
 *     Set it in server/.env (the dev script copies this to client/.env).
 *
 * Return values:
 *   true  — flag is on
 *   false — flag is off
 *   null  — PostHog is configured but flags haven't loaded yet (treat as off)
 */
export function useFeatureFlag (flagName, { defaultValue = false } = {}) {
  const envVarName = 'VITE_FLAG_' + flagName.toUpperCase().replace(/-/g, '_');
  const envOverride = import.meta.env[envVarName];

  // Env var override takes precedence over everything.
  if (envOverride !== undefined) {
    return envOverride === 'true' || envOverride === true;
  }

  const posthogConfigured = Boolean(import.meta.env.VITE_POSTHOG_KEY);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [value, setValue] = useState(() => {
    if (!posthogConfigured) return defaultValue;
    const ph = typeof window !== 'undefined' ? window.posthog : null;
    return ph ? (ph.isFeatureEnabled(flagName) ?? null) : null;
  });

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (!posthogConfigured) {
      setValue(defaultValue);
      return;
    }

    function sync () {
      const ph = window.posthog;
      setValue(ph ? (ph.isFeatureEnabled(flagName) ?? false) : false);
    }

    // onFeatureFlags fires when flags first load and after each identify() call.
    const unsubscribe = window.posthog?.onFeatureFlags(sync);
    sync();

    return () => unsubscribe?.();
  }, [flagName, posthogConfigured, defaultValue]);

  return value;
}
