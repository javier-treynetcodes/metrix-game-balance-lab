import { useCallback, useEffect, useState } from 'react';
import type { Channel, Mitigation } from '@metrix/core';
import { loadSavedCatalog, saveCatalog, type Catalog } from './catalog';

/** Editable channel settings. `minDamage: undefined` removes the floor. */
export interface ChannelPatch {
  label?: string;
  mitigation?: Mitigation;
  minDamage?: number | undefined;
}

/** Current catalog, persisted in this browser so a reload does not lose the work. */
export function useCatalog() {
  const [catalog, setCatalog] = useState<Catalog | null>(loadSavedCatalog);

  useEffect(() => {
    saveCatalog(catalog);
  }, [catalog]);

  const updateChannel = useCallback((key: string, patch: ChannelPatch) => {
    setCatalog((current) =>
      current
        ? {
            ...current,
            channels: current.channels.map((channel) =>
              channel.key === key ? mergeChannel(channel, patch) : channel,
            ),
          }
        : current,
    );
  }, []);

  const dismissWarnings = useCallback(() => {
    setCatalog((current) => (current ? { ...current, warnings: [] } : current));
  }, []);

  return { catalog, setCatalog, updateChannel, dismissWarnings };
}

function mergeChannel(channel: Channel, patch: ChannelPatch): Channel {
  const next: Channel = { ...channel };
  if (patch.label !== undefined) next.label = patch.label;
  if (patch.mitigation !== undefined) next.mitigation = patch.mitigation;
  if ('minDamage' in patch) {
    if (patch.minDamage === undefined) delete next.minDamage;
    else next.minDamage = patch.minDamage;
  }
  return next;
}
