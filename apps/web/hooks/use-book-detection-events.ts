import { v4 as uuid } from "uuid";
import { useEffect, useState } from "react";
import { BookDetectionEvent } from "@/lib/types";

type EventCallback = (event: BookDetectionEvent) => void;

export function useBookDetectionEvents(onEvent: EventCallback) {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientId] = useState<string>(() => uuid());

  useEffect(() => {
    const eventSource = new EventSource(
      `${process.env.NEXT_PUBLIC_API_URL}/events/${clientId}`
    );

    eventSource.onopen = () => {
      setConnected(true);
      setError(null);
    };

    eventSource.onerror = (error) => {
      setConnected(false);
      setError("Failed to connect to event stream");
      console.error("SSE error:", error);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as BookDetectionEvent;
        onEvent(data);
      } catch (error) {
        console.error("Failed to parse event data:", error);
      }
    };

    return () => {
      eventSource.close();
      setConnected(false);
    };
  }, [clientId]);

  return { connected, error, clientId };
}
