import { DEFAULT_PREFERENCES, Preferences } from '../types/index.js';

/**
 * Background service worker for BGA TM Advisor.
 * Handles preference storage and extension icon state.
 */

// Initialize default preferences on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get('tmAdvisorPrefs', (result) => {
    if (!result.tmAdvisorPrefs) {
      chrome.storage.sync.set({ tmAdvisorPrefs: DEFAULT_PREFERENCES });
      console.log('[TM-Advisor] Default preferences initialized');
    }
  });
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case 'GET_PREFS':
      chrome.storage.sync.get('tmAdvisorPrefs', (result) => {
        sendResponse(result.tmAdvisorPrefs ?? DEFAULT_PREFERENCES);
      });
      return true; // async response

    case 'SET_PREFS':
      chrome.storage.sync.set({ tmAdvisorPrefs: message.prefs }, () => {
        sendResponse({ success: true });
      });
      return true;

    case 'TOGGLE_ENABLED':
      chrome.storage.sync.get('tmAdvisorPrefs', (result) => {
        const prefs: Preferences = (result.tmAdvisorPrefs as Preferences | undefined) ?? DEFAULT_PREFERENCES;
        prefs.enabled = !prefs.enabled;
        chrome.storage.sync.set({ tmAdvisorPrefs: prefs }, () => {
          updateIcon(prefs.enabled);
          sendResponse({ enabled: prefs.enabled });
        });
      });
      return true;
  }
});

function updateIcon(enabled: boolean): void {
  // Could update icon badge to show enabled/disabled state
  if (enabled) {
    chrome.action.setBadgeText({ text: '' });
  } else {
    chrome.action.setBadgeText({ text: 'OFF' });
    chrome.action.setBadgeBackgroundColor({ color: '#666' });
  }
}
