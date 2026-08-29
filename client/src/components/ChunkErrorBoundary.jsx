import React from 'react';
import { Button, Center, Stack, Text, Title } from '@mantine/core';

import { isChunkLoadError, reloadOnceForStaleChunk } from '../utils/chunkReload';

// Catches the "stale chunk after deploy" error thrown when a lazy route's chunk
// fails to load, and recovers by reloading once to the current build (guarded
// against reload loops). If we've already reloaded and it still fails (offline, or
// a broken deploy), it shows a static refresh prompt instead of looping. Any error
// that is NOT a chunk-load error is re-thrown so normal error handling still applies.
class ChunkErrorBoundary extends React.Component {
  constructor (props) {
    super(props);
    this.state = { error: null, gaveUp: false };
  }

  static getDerivedStateFromError (error) {
    return { error };
  }

  componentDidCatch (error) {
    if (isChunkLoadError(error)) {
      // reloadOnceForStaleChunk returns false if it declined to reload (already did
      // so recently) — in that case we've "given up" and render the fallback.
      this.setState({ gaveUp: !reloadOnceForStaleChunk() });
    }
  }

  render () {
    const { error, gaveUp } = this.state;
    if (!error) return this.props.children;

    // Not a stale-chunk error — let it propagate to normal error handling.
    if (!isChunkLoadError(error)) throw error;

    // A reload has been (or is about to be) triggered; show a neutral placeholder
    // until the navigation happens, rather than a scary error.
    if (!gaveUp) {
      return (
        <Center h='100vh'>
          <Text c='dimmed'>Updating to the latest version…</Text>
        </Center>
      );
    }

    // We already reloaded once and it still failed — offer a manual retry.
    return (
      <Center h='100vh' p='xl'>
        <Stack align='center' gap='sm' maw={360}>
          <Title order={4}>Couldn’t load this page</Title>
          <Text size='sm' c='dimmed' ta='center'>
            You may be offline, or a new version is being deployed. Please check your connection and try again.
          </Text>
          <Button radius='xl' onClick={() => window.location.reload()}>Refresh</Button>
        </Stack>
      </Center>
    );
  }
}

export default ChunkErrorBoundary;
