import { useEffect, useState } from "react";

const storageKey = "book-holmes-apiKey";

export const useAuth = () => {
  const [apiKey, setApiKey] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash;
    const apiKeyMatch = hash.match(/apiKey=([^&]+)/);
    if (apiKeyMatch) {
      setApiKey(apiKeyMatch[1]);
      sessionStorage.setItem(storageKey, apiKeyMatch[1]);
      window.history.replaceState(null, "", "/");
      return;
    }

    const storedApiKey = sessionStorage.getItem(storageKey);
    if (storedApiKey) setApiKey(storedApiKey);
  }, []);

  return { apiKey };
};
