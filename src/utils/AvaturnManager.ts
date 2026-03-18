import { AvaturnSDK } from '@avaturn/sdk';

export interface SavedAvatar {
  id: string;
  name: string;
  glbBlob: Blob;
  createdAt: number;
}

const DB_NAME = 'crazy-taxi-avatars';
const STORE_NAME = 'avatars';
const DB_VERSION = 1;

/**
 * Manages Avaturn SDK integration: iframe creation, avatar export,
 * and IndexedDB persistence of user-created avatars.
 */
export class AvaturnManager {
  private sdk: AvaturnSDK | null = null;

  /** Open (or create) the IndexedDB database. */
  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /** List all saved avatars from IndexedDB. */
  async listSavedAvatars(): Promise<SavedAvatar[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result as SavedAvatar[]);
      req.onerror = () => reject(req.error);
    });
  }

  /** Save an avatar GLB blob to IndexedDB. */
  async saveAvatar(avatar: SavedAvatar): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(avatar);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /** Delete a saved avatar from IndexedDB. */
  async deleteAvatar(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /** Get a saved avatar's GLB as a Blob URL for loading. */
  async getAvatarBlobURL(id: string): Promise<string | null> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => {
        const avatar = req.result as SavedAvatar | undefined;
        if (avatar) {
          resolve(URL.createObjectURL(avatar.glbBlob));
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Open the Avaturn editor in a modal overlay.
   * Requires a session URL from your backend (Avaturn /sessions/new API).
   * Returns the exported GLB as a Blob, or null if cancelled.
   */
  async openEditor(sessionUrl: string): Promise<{ blob: Blob; avatarId: string } | null> {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.id = 'avaturn-overlay';
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.85); z-index: 2000;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
    `;

    const container = document.createElement('div');
    container.style.cssText = `
      width: 90vw; height: 80vh; border-radius: 12px; overflow: hidden;
      background: #1a1a2e;
    `;

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Cancel';
    closeBtn.style.cssText = `
      margin-top: 16px; padding: 10px 30px; background: #ff4444; color: white;
      border: none; border-radius: 8px; font-size: 1rem; cursor: pointer;
    `;

    overlay.appendChild(container);
    overlay.appendChild(closeBtn);
    document.body.appendChild(overlay);

    return new Promise<{ blob: Blob; avatarId: string } | null>((resolve) => {
      let resolved = false;

      closeBtn.addEventListener('click', () => {
        if (!resolved) {
          resolved = true;
          this.cleanup(overlay);
          resolve(null);
        }
      });

      this.sdk = new AvaturnSDK();

      this.sdk.init(container, { url: sessionUrl }).then(() => {
        this.sdk!.on('export', async (result) => {
          if (resolved) return;
          resolved = true;

          let blob: Blob;
          if (result.urlType === 'dataURL') {
            const resp = await fetch(result.url);
            blob = await resp.blob();
          } else {
            const resp = await fetch(result.url);
            blob = await resp.blob();
          }

          this.cleanup(overlay);
          resolve({ blob, avatarId: result.avatarId });
        });
      }).catch((err) => {
        console.error('Avaturn SDK init failed:', err);
        if (!resolved) {
          resolved = true;
          this.cleanup(overlay);
          resolve(null);
        }
      });
    });
  }

  private cleanup(overlay: HTMLElement): void {
    if (this.sdk) {
      this.sdk.destroy();
      this.sdk = null;
    }
    overlay.remove();
  }
}
