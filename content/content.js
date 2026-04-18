(function() {
  'use strict';

  class VirtualScrollRemote {
    constructor() {
      this.settings = null;
      this.shadowRoot = null;
      this.container = null;
      this.upButton = null;
      this.downButton = null;
      this.isScrolling = false;
      this.scrollInterval = null;
      this.init();
    }

    async init() {
      await this.loadSettings();
      if (await this.isExcluded()) return;
      this.createShadowDOM();
      this.createTriggerZones();
      this.createButtons();
      this.attachEventListeners();
    }

    async loadSettings() {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (settings) => {
          this.settings = settings || {
            scrollStep: 500,
            accelerationBase: 1,
            accelerationMax: 5,
            accelerationDuration: 3000,
            excludedDomains: []
          };
          resolve();
        });
      });
    }

    async isExcluded() {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { type: 'CHECK_EXCLUSION', url: window.location.href },
          (response) => resolve(response.isExcluded)
        );
      });
    }

    createShadowDOM() {
      this.container = document.createElement('div');
      this.container.id = 'virtual-scroll-remote';
      document.body.appendChild(this.container);
      this.shadowRoot = this.container.attachShadow({ mode: 'closed' });
    }

    createTriggerZones() {
      const style = document.createElement('style');
      style.textContent = `
        .trigger-zone {
          position: fixed;
          width: 80px;
          height: 150px;
          z-index: 2147483647;
          cursor: pointer;
          opacity: 0;
          transition: opacity 200ms ease-in;
        }
        .trigger-zone.visible {
          opacity: 1;
        }
        .trigger-zone.top-right {
          top: 0;
          right: 0;
        }
        .trigger-zone.bottom-right {
          bottom: 0;
          right: 0;
        }
        .scroll-button {
          position: fixed;
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          opacity: 0;
          transition: opacity 200ms ease-in, transform 150ms ease;
          z-index: 2147483647;
        }
        .scroll-button:hover {
          transform: scale(1.05);
        }
        .scroll-button:active {
          transform: scale(0.95);
        }
        .scroll-button.visible {
          opacity: 0.8;
        }
        .scroll-button.pulse {
          animation: pulse 1s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); }
          50% { box-shadow: 0 4px 20px rgba(59, 130, 246, 0.5); }
        }
        .scroll-button.up {
          top: 20px;
          right: 16px;
        }
        .scroll-button.down {
          bottom: 20px;
          right: 16px;
        }
        .scroll-button svg {
          width: 24px;
          height: 24px;
          stroke: #3B82F6;
          stroke-width: 2;
          fill: none;
        }
        @media (prefers-color-scheme: dark) {
          .scroll-button {
            background: rgba(30, 30, 30, 0.75);
            border: 1px solid rgba(255, 255, 255, 0.1);
          }
          .scroll-button svg {
            stroke: #60A5FA;
          }
        }
      `;
      this.shadowRoot.appendChild(style);

      this.topZone = document.createElement('div');
      this.topZone.className = 'trigger-zone top-right';
      this.shadowRoot.appendChild(this.topZone);

      this.bottomZone = document.createElement('div');
      this.bottomZone.className = 'trigger-zone bottom-right';
      this.shadowRoot.appendChild(this.bottomZone);
    }

    createButtons() {
      this.upButton = document.createElement('button');
      this.upButton.className = 'scroll-button up';
      this.upButton.innerHTML = `
        <svg viewBox="0 0 24 24">
          <polyline points="18,15 12,9 6,15"></polyline>
        </svg>
      `;
      this.shadowRoot.appendChild(this.upButton);

      this.downButton = document.createElement('button');
      this.downButton.className = 'scroll-button down';
      this.downButton.innerHTML = `
        <svg viewBox="0 0 24 24">
          <polyline points="6,9 12,15 18,9"></polyline>
        </svg>
      `;
      this.shadowRoot.appendChild(this.downButton);
    }

    attachEventListeners() {
      this.topZone.addEventListener('mouseenter', () => this.showButton(this.upButton));
      this.topZone.addEventListener('mouseleave', () => this.hideButton(this.upButton));
      this.bottomZone.addEventListener('mouseenter', () => this.showButton(this.downButton));
      this.bottomZone.addEventListener('mouseleave', () => this.hideButton(this.downButton));

      this.upButton.addEventListener('click', (e) => this.handleScroll(e, 'up'));
      this.downButton.addEventListener('click', (e) => this.handleScroll(e, 'down'));

      this.upButton.addEventListener('mousedown', () => this.startHoldScroll('up'));
      this.upButton.addEventListener('mouseup', () => this.stopHoldScroll());
      this.upButton.addEventListener('mouseleave', () => this.stopHoldScroll());

      this.downButton.addEventListener('mousedown', () => this.startHoldScroll('down'));
      this.downButton.addEventListener('mouseup', () => this.stopHoldScroll());
      this.downButton.addEventListener('mouseleave', () => this.stopHoldScroll());
    }

    showButton(button) {
      button.classList.add('visible');
    }

    hideButton(button) {
      button.classList.remove('visible');
      button.classList.remove('pulse');
    }

    handleScroll(event, direction) {
      event.preventDefault();
      this.scrollByDirection(direction, this.settings.scrollStep);
    }

    scrollByDirection(direction, amount) {
      const scrollAmount = direction === 'up' ? -amount : amount;
      window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
    }

    startHoldScroll(direction) {
      const button = direction === 'up' ? this.upButton : this.downButton;
      button.classList.add('pulse');

      let startTime = Date.now();
      let currentSpeed = this.settings.accelerationBase;

      this.scrollInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / this.settings.accelerationDuration, 1);
        currentSpeed = this.settings.accelerationBase + 
          (this.settings.accelerationMax - this.settings.accelerationBase) * progress;

        this.scrollByDirection(direction, this.settings.scrollStep * currentSpeed);
      }, 50);
    }

    stopHoldScroll() {
      if (this.scrollInterval) {
        clearInterval(this.scrollInterval);
        this.scrollInterval = null;
      }
      this.upButton?.classList.remove('pulse');
      this.downButton?.classList.remove('pulse');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new VirtualScrollRemote());
  } else {
    new VirtualScrollRemote();
  }
})();