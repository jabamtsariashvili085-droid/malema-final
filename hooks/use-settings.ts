"use client";

import { useSyncExternalStore } from "react";
import { settingsStore } from "@/lib/settings";

const subscribe = (callback: () => void) => settingsStore.subscribe(callback);
const getSnapshot = () => settingsStore.getSnapshot();
const getServerSnapshot = () => settingsStore.getSnapshot();

export function useSettings() {
  const settings = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return {
    ...settings,
    updateSettings: settingsStore.updateSettings.bind(settingsStore),
  };
}
