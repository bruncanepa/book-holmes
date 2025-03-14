"use client";

import { useEffect, useState } from "react";
import { HistoryItem } from "@/lib/types";

// IndexedDB configuration
const DB_NAME = "book-detector";
const DB_VERSION = 1;
const STORE_NAME = "history";

// Hook for managing history with IndexedDB
export function useHistoryStore() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize the database
  useEffect(() => {
    let db: IDBDatabase | null = null;

    const openRequest = indexedDB.open(DB_NAME, DB_VERSION);

    openRequest.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create the history object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }
    };

    openRequest.onsuccess = (event) => {
      db = (event.target as IDBOpenDBRequest).result;
      console.log("IndexedDB connection opened successfully");

      // Load initial data
      loadHistory();
    };

    openRequest.onerror = (event) => {
      const error = (event.target as IDBOpenDBRequest).error;
      console.error("IndexedDB error:", error);
      setError(`Failed to open database: ${error?.message || "Unknown error"}`);
      setIsLoading(false);
    };

    // Load all history items from the database
    const loadHistory = () => {
      if (!db) return;

      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index("timestamp");
      const request = index.openCursor(null, "prev"); // Sort by timestamp, newest first

      const items: HistoryItem[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;

        if (cursor) {
          // Convert stored date string back to Date object
          const item = cursor.value as HistoryItem;
          if (typeof item.timestamp === "string") {
            item.timestamp = new Date(item.timestamp);
          }

          items.push(item);
          cursor.continue();
        } else {
          // All items have been collected
          setHistory(items);
          setIsLoading(false);
        }
      };

      request.onerror = (event) => {
        const error = (event.target as IDBRequest).error;
        console.error("Error loading history:", error);
        setError(
          `Failed to load history: ${error?.message || "Unknown error"}`
        );
        setIsLoading(false);
      };
    };

    // Cleanup function
    return () => {
      if (db) {
        db.close();
        console.log("IndexedDB connection closed");
      }
    };
  }, []);

  // Add a new history item
  const addHistoryItem = (item: HistoryItem) => {
    const openRequest = indexedDB.open(DB_NAME, DB_VERSION);

    openRequest.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      // Store the item
      const request = store.add(item);

      request.onsuccess = () => {
        console.log("History item added successfully:", item);
        // Update the local state
        setHistory((prev) => [item, ...prev]);
      };

      request.onerror = (event) => {
        const error = (event.target as IDBRequest).error;
        console.error("Error adding history item:", error);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    };

    openRequest.onerror = (event) => {
      const error = (event.target as IDBOpenDBRequest).error;
      console.error("IndexedDB error:", error);
    };
  };

  // Remove a history item
  const removeHistoryItem = (id: string) => {
    const openRequest = indexedDB.open(DB_NAME, DB_VERSION);

    openRequest.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      // Delete the item
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log("History item removed successfully:", id);
        // Update the local state
        setHistory((prev) => prev.filter((item) => item.id !== id));
      };

      request.onerror = (event) => {
        const error = (event.target as IDBRequest).error;
        console.error("Error removing history item:", error);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    };

    openRequest.onerror = (event) => {
      const error = (event.target as IDBOpenDBRequest).error;
      console.error("IndexedDB error:", error);
    };
  };

  // Clear all history
  const clearHistory = () => {
    const openRequest = indexedDB.open(DB_NAME, DB_VERSION);

    openRequest.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      // Clear the store
      const request = store.clear();

      request.onsuccess = () => {
        console.log("History cleared successfully");
        // Update the local state
        setHistory([]);
      };

      request.onerror = (event) => {
        const error = (event.target as IDBRequest).error;
        console.error("Error clearing history:", error);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    };

    openRequest.onerror = (event) => {
      const error = (event.target as IDBOpenDBRequest).error;
      console.error("IndexedDB error:", error);
    };
  };

  return {
    history,
    isLoading,
    error,
    addHistoryItem,
    removeHistoryItem,
    clearHistory,
  };
}
