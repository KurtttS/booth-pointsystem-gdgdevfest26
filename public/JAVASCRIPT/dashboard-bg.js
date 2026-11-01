// public/JAVASCRIPT/dashboard-bg.js
// Client-side local storage management for custom dashboard background image
// Uses IndexedDB as high-capacity persistent store with localStorage cache

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DashboardBG = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const STORAGE_KEY = 'devfest_dashboard_custom_bg';
  const DB_NAME = 'DevFestLocalDB';
  const STORE_NAME = 'settings';
  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB limit
  const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

  let dbPromise = null;

  function getDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return resolve(null);
      }
      try {
        const req = window.indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = function (e) {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };
        req.onsuccess = function (e) {
          resolve(e.target.result);
        };
        req.onerror = function (e) {
          console.warn('[DashboardBG] IndexedDB unavailable:', e);
          resolve(null);
        };
      } catch (err) {
        console.warn('[DashboardBG] IndexedDB initialization error:', err);
        resolve(null);
      }
    });
    return dbPromise;
  }

  /**
   * Retrieve the stored custom background image (data URL).
   * Checks localStorage first (synchronous cache) then IndexedDB.
   */
  async function getStoredBg() {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached && typeof cached === 'string' && cached.startsWith('data:image/')) {
        return cached;
      }
    } catch (e) {
      // localStorage may be disabled or restricted in private mode
    }

    try {
      const db = await getDB();
      if (!db) return null;
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(STORAGE_KEY);
        req.onsuccess = function () {
          const result = req.result || null;
          // Synchronize back to localStorage cache if possible
          if (result && typeof result === 'string') {
            try {
              localStorage.setItem(STORAGE_KEY, result);
            } catch (e) {}
          }
          resolve(result);
        };
        req.onerror = function () {
          resolve(null);
        };
      });
    } catch (e) {
      console.warn('[DashboardBG] Error reading background:', e);
      return null;
    }
  }

  /**
   * Save the image data URL locally in both IndexedDB and localStorage.
   */
  async function saveStoredBg(dataUrl) {
    if (!dataUrl || typeof dataUrl !== 'string') {
      throw new Error('Invalid image data');
    }

    // 1. Save to IndexedDB (reliable large storage)
    let savedToIdb = false;
    try {
      const db = await getDB();
      if (db) {
        await new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.put(dataUrl, STORAGE_KEY);
          req.onsuccess = () => {
            savedToIdb = true;
            resolve();
          };
          req.onerror = (err) => reject(err);
        });
      }
    } catch (err) {
      console.warn('[DashboardBG] Could not write to IndexedDB:', err);
    }

    // 2. Save to localStorage (fast sync path)
    let savedToLocal = false;
    try {
      localStorage.setItem(STORAGE_KEY, dataUrl);
      savedToLocal = true;
    } catch (err) {
      console.warn('[DashboardBG] localStorage quota exceeded, relying on IndexedDB:', err);
    }

    if (!savedToIdb && !savedToLocal) {
      throw new Error('Storage quota exceeded. Could not save image locally.');
    }

    // Trigger storage event for same-window subscribers
    try {
      window.dispatchEvent(
        new CustomEvent('dashboard_bg_changed', { detail: { dataUrl } })
      );
    } catch (e) {}

    return true;
  }

  /**
   * Remove the custom background, reverting to the default.
   */
  async function clearStoredBg() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}

    try {
      const db = await getDB();
      if (db) {
        await new Promise((resolve) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const req = store.delete(STORAGE_KEY);
          req.onsuccess = () => resolve();
          req.onerror = () => resolve();
        });
      }
    } catch (e) {}

    try {
      window.dispatchEvent(
        new CustomEvent('dashboard_bg_changed', { detail: { dataUrl: null } })
      );
    } catch (e) {}

    return true;
  }

  /**
   * Validate uploaded file format and size constraints.
   */
  function validateFile(file) {
    if (!file) {
      return { valid: false, error: 'No file selected.' };
    }

    const ext = (file.name || '').split('.').pop().toLowerCase();
    const mime = (file.type || '').toLowerCase();

    const isAllowedExt = ALLOWED_EXTENSIONS.includes(ext);
    const isAllowedMime = ALLOWED_MIME_TYPES.includes(mime) || (mime.startsWith('image/') && isAllowedExt);

    if (!isAllowedExt && !isAllowedMime) {
      return {
        valid: false,
        error: 'Unsupported file format. Please upload a JPG, PNG, or WebP image.'
      };
    }

    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return {
        valid: false,
        error: `Image size (${sizeMB}MB) exceeds the 2MB limit. Please choose a smaller image.`
      };
    }

    return { valid: true };
  }

  /**
   * Apply the stored background image to the target Dashboard hero card img.
   */
  async function applyToDashboard(targetImgId) {
    const img = document.getElementById(targetImgId || 'heroStationImg');
    if (!img) return;

    // Apply fast cached version first
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        img.src = cached;
      }
    } catch (e) {}

    // Verify / load from persistent store
    const bg = await getStoredBg();
    if (bg) {
      img.src = bg;
    }

    // Subscribe to storage changes across tabs
    window.addEventListener('storage', function (e) {
      if (e.key === STORAGE_KEY) {
        if (e.newValue) {
          img.src = e.newValue;
        } else {
          img.src = img.dataset.defaultSrc || '/IMG/booth-banner.jpg';
        }
      }
    });

    // Subscribe to same-window changes
    window.addEventListener('dashboard_bg_changed', function (e) {
      if (e.detail && e.detail.dataUrl) {
        img.src = e.detail.dataUrl;
      } else {
        img.src = img.dataset.defaultSrc || '/IMG/booth-banner.jpg';
      }
    });
  }

  return {
    STORAGE_KEY,
    MAX_FILE_SIZE,
    getStoredBg,
    saveStoredBg,
    clearStoredBg,
    validateFile,
    applyToDashboard
  };
});
