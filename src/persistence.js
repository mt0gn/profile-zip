const DATABASE_NAME = "profile-zip-editor";
const STORE_NAME = "autosave";
const AUTOSAVE_ID = "current-project";

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new Error("IndexedDB is unavailable"));
      return;
    }
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open autosave storage"));
  });
}

async function withStore(mode, operation) {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode);
      const store = transaction.objectStore(STORE_NAME);
      const request = operation(store);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Autosave request failed"));
      transaction.onabort = () => reject(transaction.error || new Error("Autosave transaction aborted"));
    });
  } finally {
    database.close();
  }
}

export async function saveAutosave(snapshot, legacyKey) {
  try {
    await withStore("readwrite", (store) => store.put(snapshot, AUTOSAVE_ID));
    localStorage.removeItem(legacyKey);
  } catch (indexedDbError) {
    try {
      localStorage.setItem(legacyKey, JSON.stringify(snapshot));
    } catch (localStorageError) {
      throw new AggregateError([indexedDbError, localStorageError], "Autosave storage is full or unavailable");
    }
  }
}

export async function restoreAutosave(legacyKey) {
  try {
    const snapshot = await withStore("readonly", (store) => store.get(AUTOSAVE_ID));
    if (snapshot) return snapshot;
  } catch (error) {
    console.warn("IndexedDB autosave restore failed", error);
  }

  try {
    const legacySnapshot = JSON.parse(localStorage.getItem(legacyKey));
    if (legacySnapshot) {
      await saveAutosave(legacySnapshot, legacyKey);
      return legacySnapshot;
    }
  } catch (error) {
    console.warn("Legacy autosave restore failed", error);
  }
  return null;
}

export async function clearAutosave(legacyKey) {
  localStorage.removeItem(legacyKey);
  try {
    await withStore("readwrite", (store) => store.delete(AUTOSAVE_ID));
  } catch (error) {
    console.warn("IndexedDB autosave clear failed", error);
  }
}
