import { Preferences, DEFAULT_PREFERENCES, Tier } from '../types/index.js';

const PREF_FIELDS = ['enabled', 'showBadges', 'showTooltips', 'dimLowTier'] as const;

async function loadPrefs(): Promise<Preferences> {
  return new Promise((resolve) => {
    chrome.storage.sync.get('tmAdvisorPrefs', (result) => {
      resolve({ ...DEFAULT_PREFERENCES, ...(result.tmAdvisorPrefs as Partial<Preferences> | undefined) });
    });
  });
}

async function savePrefs(prefs: Preferences): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ tmAdvisorPrefs: prefs }, resolve);
  });
}

async function init(): Promise<void> {
  const prefs = await loadPrefs();

  // Set initial values
  for (const field of PREF_FIELDS) {
    const el = document.getElementById(field) as HTMLInputElement;
    if (el) el.checked = prefs[field] as boolean;
  }

  const minTierSelect = document.getElementById('minTierToShow') as HTMLSelectElement;
  if (minTierSelect) minTierSelect.value = prefs.minTierToShow;

  // Add change listeners
  for (const field of PREF_FIELDS) {
    const el = document.getElementById(field) as HTMLInputElement;
    if (el) {
      el.addEventListener('change', async () => {
        const current = await loadPrefs();
        current[field] = el.checked;
        await savePrefs(current);
      });
    }
  }

  if (minTierSelect) {
    minTierSelect.addEventListener('change', async () => {
      const current = await loadPrefs();
      current.minTierToShow = minTierSelect.value as Tier;
      await savePrefs(current);
    });
  }
}

init();
