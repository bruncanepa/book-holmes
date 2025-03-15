"use client";

import { HistoryItem } from "@/lib/types";
import { Card, CardContent } from "./ui/card";
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
  X,
} from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { Alert, AlertDescription } from "./ui/alert";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

export function HistoryPanel({
  history,
  isLoading,
  removeHistoryItem,
}: {
  history: HistoryItem[];
  isLoading: boolean;
  removeHistoryItem: (id: string, e: React.MouseEvent) => void;
}) {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    const item = history.find((item) => item.id === id);
    if (!item || !item.result?.text) return;
    if (expandedItem === id) {
      setExpandedItem(null);
    } else {
      setExpandedItem(id);
    }
  };

  const handleRemoveHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeHistoryItem(id, e);
    if (expandedItem === id) {
      setExpandedItem(null);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Display loading state
  if (isLoading) {
    return (
      <Card className="w-full h-full flex items-center justify-center">
        <CardContent className="p-6 flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 text-gray-400 animate-spin mb-2" />
          <p className="text-gray-500 text-center">Loading history...</p>
        </CardContent>
      </Card>
    );
  }

  // Display empty state
  if (history.length === 0) {
    return (
      <Card className="w-full h-full flex items-center justify-center">
        <CardContent className="p-6 flex flex-col items-center justify-center">
          <p className="text-gray-500 text-center">No books analyzed yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-lg">Analysis History</h3>
          <Badge variant="outline">{history.length} items</Badge>
        </div>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-3">
            {history.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "border rounded-lg overflow-hidden transition-all duration-200",
                  expandedItem === item.id
                    ? "shadow-md"
                    : "hover:bg-gray-50 cursor-pointer"
                )}
              >
                <div
                  className="flex items-center p-3"
                  onClick={() => toggleExpand(item.id)}
                >
                  <div className="h-16 w-16 rounded overflow-hidden flex-shrink-0 bg-gray-100">
                    <img
                      src={item.imageUrl || "/placeholder.svg"}
                      alt="Book cover"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg";
                      }}
                    />
                  </div>
                  <div className="ml-3 flex-grow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Badge
                          variant={
                            item.state === "success"
                              ? "default"
                              : item.state === "partial-success"
                                ? "partial"
                                : "destructive"
                          }
                          className="mr-2"
                        >
                          {item.state === "success"
                            ? "Success"
                            : item.state === "partial-success"
                              ? "Partial"
                              : "Error"}
                        </Badge>
                        <span className="text-xs text-gray-500 flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatTime(item.timestamp)}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <button
                          onClick={(e) => handleRemoveHistoryItem(item.id, e)}
                          className="p-1 rounded-full hover:bg-gray-200 text-gray-500"
                          aria-label="Remove item"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        {item.result?.text &&
                          (expandedItem === item.id ? (
                            <ChevronUp className="h-5 w-5 text-gray-500 ml-1" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-500 ml-1" />
                          ))}
                      </div>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <div className="mt-1">
                        {item.result?.title && (
                          <p className="font-medium break-words">
                            {item.result.title}
                          </p>
                        )}
                        {item.error && (
                          <p className="text-red-600 font-medium truncate">
                            {item.error}
                          </p>
                        )}
                      </div>
                      {item.result?.type && (
                        <Badge
                          variant={
                            item.result.type === "fiction"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {item.result.type}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {expandedItem === item.id &&
                  item.state === "success" &&
                  item.result?.text && (
                    <div className="px-4 pb-4 pt-1 border-t">
                      <p className="text-sm text-gray-600">
                        {item.result.text}
                      </p>
                    </div>
                  )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
