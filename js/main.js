import { Algorithms } from './algorithms.js';
import { Storage } from './storage.js';
import { Charts } from './charts.js';
import { App } from './app.js';

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}

// Apply saved or system theme
(function initTheme() {
  try {
    const saved = localStorage.getItem('bayes.theme');
    const root = document.documentElement;
    if (saved === 'dark') root.classList.add('dark');
    if (saved === 'light') root.classList.add('light');
  } catch {}
})();

// Start application
App.start({ Algorithms, Storage, Charts });
