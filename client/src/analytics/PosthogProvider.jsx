import { useEffect, useRef } from 'react';

import { useAuthContext } from '@/AuthContext';
import { useStaticContext } from '@/StaticContext';

const DEFAULT_API_HOST = 'https://app.posthog.com';

function PosthogProvider () {
  const staticContext = useStaticContext();
  const { user } = useAuthContext();
  const posthogRef = useRef(null);
  const env = staticContext?.env ?? {};
  const apiKey = env?.VITE_POSTHOG_KEY ?? import.meta?.env?.VITE_POSTHOG_KEY;
  const apiHost = env?.VITE_POSTHOG_HOST ?? import.meta?.env?.VITE_POSTHOG_HOST ?? DEFAULT_API_HOST;
  const gitSha = env?.VITE_GIT_SHA ?? import.meta?.env?.VITE_GIT_SHA ?? null;

  useEffect(() => {
    if (!apiKey) {
      if (typeof window !== 'undefined' && window.posthog) {
        delete window.posthog;
      }
      return undefined;
    }

    let isMounted = true;

    async function initialize () {
      const { default: posthog } = await import('posthog-js');
      if (!isMounted) return;

      posthog.init(apiKey, {
        api_host: apiHost || DEFAULT_API_HOST,
        capture_pageview: true,
        // We can't store ANY PII of people brought to a facility (not of the app users themselves) for >72 hrs,
        // Disable Posthog session recording entirely until we have a way to anonymize or wipe it within the time limit.
        disable_session_recording: true,
      });
      if (gitSha) {
        posthog.register({ $git_commit: gitSha, release: gitSha });
      }
      posthogRef.current = posthog;

      if (user) {
        identifyUser(posthog, user);
      } else {
        posthog.reset();
      }

      if (typeof window !== 'undefined') {
        window.posthog = posthogRef.current;
      }
    }

    initialize();

    return () => {
      isMounted = false;
      if (posthogRef.current) {
        posthogRef.current.shutdown?.();
        posthogRef.current = null;
      }
      if (typeof window !== 'undefined' && window.posthog) {
        delete window.posthog;
      }
    };
  }, [apiKey, apiHost, gitSha]);

  useEffect(() => {
    if (!posthogRef.current) {
      return;
    }

    if (user) {
      identifyUser(posthogRef.current, user);
    } else {
      posthogRef.current.reset();
    }
  }, [user]);

  return null;
}

function identifyUser (posthog, user) {
  const distinctId = user?.id ?? user?.email;
  if (!distinctId) return;

  posthog.identify(distinctId, {
    email: user.email ?? null,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    isAdmin: user.isAdmin ?? false,
  });
}

export default PosthogProvider;
