import { useEffect, useState } from "react";
import { BookDetectionEvent } from "@/lib/types";

type EventCallback = (event: BookDetectionEvent) => void;

export function useBookDetectionEvents(onEvent: EventCallback) {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const eventSource = new EventSource(
      `${process.env.NEXT_PUBLIC_API_URL}/events`
    );

    eventSource.onopen = () => {
      setConnected(true);
      setError(null);
      console.log("event source opened");
    };

    eventSource.onerror = (error) => {
      setConnected(false);
      setError("Failed to connect to event stream");
      console.error("SSE error:", error);
    };

    eventSource.onmessage = (event) => {
      try {
        console.log("received event", event.data);
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
  }, []);

  return { connected, error };
}
