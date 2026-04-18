const DEFAULT_SETTINGS = {
  scrollStep: 500,
  accelerationBase: 1,
  accelerationMax: 5,
  accelerationDuration: 3000,
  triggerZones: {
    topRight: { x: 50, y: 100 },
    bottomRight: { x: 50, y: -100 }
  },
  excludedDomains: []
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['settings'], (result) => {
    if (!result.settings) {
      chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
    }
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_SETTINGS') {
    chrome.storage.local.get(['settings'], (result) => {
      sendResponse(result.settings || DEFAULT_SETTINGS);
    });
    return true;
  }

  if (message.type === 'SAVE_SETTINGS') {
    chrome.storage.local.set({ settings: message.settings }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'CHECK_EXCLUSION') {
    const url = message.url;
    chrome.storage.local.get(['settings'], (result) => {
      const settings = result.settings || DEFAULT_SETTINGS;
      const isExcluded = settings.excludedDomains.some(domain => url.includes(domain));
      sendResponse({ isExcluded });
    });
    return true;
  }
});