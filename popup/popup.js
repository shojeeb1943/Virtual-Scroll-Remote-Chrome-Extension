(function() {
  'use strict';

  let isEnabled = true;
  let currentDomain = '';

  function init() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        const url = new URL(tabs[0].url);
        currentDomain = url.hostname.replace(/^www\./, '');
        checkExclusion();
      }
    });

    document.getElementById('toggle').addEventListener('click', toggleExtension);
    document.getElementById('openOptions').addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });
  }

  function checkExclusion() {
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (settings) => {
      const isExcluded = (settings.excludedDomains || []).some(domain => currentDomain.includes(domain));
      updateStatus(isExcluded);
    });
  }

  function updateStatus(isExcluded) {
    const statusEl = document.getElementById('pageStatus');
    if (isExcluded) {
      statusEl.textContent = `Disabled on ${currentDomain}`;
      statusEl.className = 'current-page excluded';
      isEnabled = false;
      document.getElementById('toggle').classList.remove('active');
    } else {
      statusEl.textContent = `Active on ${currentDomain}`;
      statusEl.className = 'current-page active';
      isEnabled = true;
      document.getElementById('toggle').classList.add('active');
    }
  }

  function toggleExtension() {
    isEnabled = !isEnabled;
    const toggle = document.getElementById('toggle');
    const statusEl = document.getElementById('pageStatus');

    if (isEnabled) {
      toggle.classList.add('active');
      statusEl.textContent = `Active on ${currentDomain}`;
      statusEl.className = 'current-page active';
    } else {
      toggle.classList.remove('active');
      statusEl.textContent = `Disabled on ${currentDomain}`;
      statusEl.className = 'current-page excluded';
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.reload(tabs[0].id);
        window.close();
      }
    });
  }

  init();
})();