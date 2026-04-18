(function() {
  'use strict';

  let settings = {};

  function loadSettings() {
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (result) => {
      settings = result || {};
      initializeUI();
    });
  }

  function initializeUI() {
    document.getElementById('scrollStep').value = settings.scrollStep || 500;
    document.getElementById('scrollStepValue').textContent = (settings.scrollStep || 500) + 'px';

    document.getElementById('accelDuration').value = settings.accelerationDuration || 3000;
    document.getElementById('accelDurationValue').textContent = ((settings.accelerationDuration || 3000) / 1000) + ' seconds';

    document.getElementById('opacity').value = 0.8;
    document.getElementById('opacityValue').textContent = '0.8';

    renderExclusionList();
  }

  function renderExclusionList() {
    const list = document.getElementById('exclusionList');
    const domains = settings.excludedDomains || [];
    list.innerHTML = domains.length === 0 ? '<p style="color: #999; padding: 8px;">No exclusions</p>' : '';

    domains.forEach((domain, index) => {
      const item = document.createElement('div');
      item.className = 'exclusion-item';
      item.innerHTML = `
        <span>${domain}</span>
        <button data-index="${index}">Remove</button>
      `;
      list.appendChild(item);
    });
  }

  function saveSettings() {
    settings.scrollStep = parseInt(document.getElementById('scrollStep').value);
    settings.accelerationDuration = parseInt(document.getElementById('accelDuration').value);

    chrome.runtime.sendMessage({ type: 'SAVE_SETTINGS', settings }, () => {
      console.log('Settings saved');
    });
  }

  document.getElementById('scrollStep').addEventListener('input', (e) => {
    document.getElementById('scrollStepValue').textContent = e.target.value + 'px';
  });
  document.getElementById('scrollStep').addEventListener('change', saveSettings);

  document.getElementById('accelDuration').addEventListener('input', (e) => {
    document.getElementById('accelDurationValue').textContent = (e.target.value / 1000) + ' seconds';
  });
  document.getElementById('accelDuration').addEventListener('change', saveSettings);

  document.getElementById('opacity').addEventListener('input', (e) => {
    document.getElementById('opacityValue').textContent = e.target.value;
  });

  document.getElementById('addDomain').addEventListener('click', () => {
    const input = document.getElementById('newDomain');
    const domain = input.value.trim();
    if (domain) {
      if (!settings.excludedDomains) settings.excludedDomains = [];
      settings.excludedDomains.push(domain);
      input.value = '';
      renderExclusionList();
      saveSettings();
    }
  });

  document.getElementById('exclusionList').addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
      const index = parseInt(e.target.dataset.index);
      settings.excludedDomains.splice(index, 1);
      renderExclusionList();
      saveSettings();
    }
  });

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      item.classList.add('active');
      document.getElementById(item.dataset.section).classList.add('active');
    });
  });

  loadSettings();
})();