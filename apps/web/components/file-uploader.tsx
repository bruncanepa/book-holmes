"use client";

import type React from "react";

import { useState, useEffect, useRef } from "react";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useHistoryStore } from "@/hooks/use-history-store";
import { HistoryPanel } from "./history-panel";
import { UploaderCard } from "./uploader-card";
import {
  AnalysisResult,
  BookDetectionEvent,
  HistoryItem,
  UploadState,
} from "@/lib/types";
import { loadFile } from "@/lib/file";
import { useBookDetectionEvents } from "@/hooks/use-book-detection-events";
import { useAuth } from "@/hooks/use-auth";
import { useUpdatableRef } from "@/hooks/use-updatable-ref";

export function FileUploader() {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [imagePreviewRef, updateImagePreviewRef] = useUpdatableRef<
    string | null
  >(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("upload");
  const { toast } = useToast();
  const { history, isLoading, error, addHistoryItem, removeHistoryItem } =
    useHistoryStore();
  const { apiKey } = useAuth();

  const isMobile =
    typeof window !== "undefined" ? window.innerWidth < 768 : false;

  const createHistoryItem = (data: BookDetectionEvent["data"]) => {
    const hasBookInfo = data.isBook && (data.title || data.type);
    const isComplete =
      !data.error && data.isBook && data.title && data.type && data.text;
    const isPartial = hasBookInfo && !isComplete;

    let state: "success" | "partial-success" | "error";
    if (isComplete) {
      state = "success";
    } else if (isPartial) {
      state = "partial-success";
    } else {
      state = "error";
    }

    const historyItem: HistoryItem = {
      id: Date.now().toString(),
      timestamp: new Date(),
      imageUrl: imagePreviewRef.current || "",
      state: state,
      result: hasBookInfo
        ? {
            title: data.title || "Unknown Title",
            text: data.text || "",
            type: (data.type as "fiction" | "non-fiction") || "non-fiction",
            description: data.description || "",
          }
        : undefined,
      error: data.error,
    };
    addHistoryItem(historyItem);

    setUploadState(state);

    if (isComplete) {
      toast({
        title: "Analysis complete",
        description: `Successfully analyzed "${data.title}"`,
      });
    } else if (isPartial) {
      toast({
        title: "Partial analysis",
        description: data.error || "Some information could not be retrieved",
      });
    } else {
      setErrorMessage(data.error || "Could not complete analysis");
      toast({
        variant: "destructive",
        title: "Analysis failed",
        description: data.error || "Could not complete analysis",
      });
    }
  };

  useEffect(() => {
    if (error) {
      console.error("History store error:", error);
      toast({
        variant: "destructive",
        title: "Storage Error",
        description:
          "There was an error accessing your history. Some items may not be available.",
      });
    }
  }, [error, toast]);

  const handleError = (error: Error | BookDetectionEvent) => {
    let errorMessage = "";
    if (error instanceof Error) {
      errorMessage = error.message || "An unexpected error occurred";
      createHistoryItem({ error: errorMessage });
    } else {
      const { data } = error;
      errorMessage = data.error || "An unexpected error occurred";
      createHistoryItem(data);
      // @ts-ignore
      setAnalysisResult((c) => ({ ...c, ...data }));
    }
  };

  const handleResponseEvent = (event: BookDetectionEvent) => {
    switch (event.type) {
      case "error":
        handleError(event);
        break;
      case "completed": {
        const { data } = event;
        // @ts-ignore
        setAnalysisResult((c) => ({ ...c, ...data }));
        createHistoryItem(data);
        // Switch to history tab on mobile after completion
        if (isMobile) {
          setTimeout(() => {
            setActiveTab("history");
          }, 1500);
        }
        break;
      }
      default:
        // @ts-ignore
        setAnalysisResult((c) => ({ ...c, ...event.data }));
        break;
    }
  };

  const { clientId } = useBookDetectionEvents(handleResponseEvent);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();

    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = async (files: FileList) => {
    if (!apiKey) {
      setErrorMessage("You need an API Key to use this platform");
      setUploadState("error");
      return;
    }

    setUploadState("uploading");
    setErrorMessage(null);

    const file = files[0];
    let previewUrl = null;
    if (file.type.startsWith("image/")) {
      previewUrl = await loadFile(file);
      updateImagePreviewRef(previewUrl);
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      // Simulate upload progress
      const uploadInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(uploadInterval);
            return 100;
          }
          return prev + 5;
        });
      }, 100);

      // When progress reaches 100%, switch to processing state
      setTimeout(() => {
        clearInterval(uploadInterval);
        setProgress(100);
        setUploadState("processing");

        // Make actual API request to backend
        fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/analyze?clientId=${clientId}`,
          {
            method: "POST",
            body: formData,
            headers: { Authorization: apiKey },
          }
        )
          .then(async (response) => {
            const data = await response.json();
            if (!response.ok) {
              throw new Error(data.error || "Failed to analyze image");
            } else {
              handleResponseEvent(data);
            }
          })
          .catch(handleError);
      }, 1000);
    } catch (error) {
      console.error("Error:", error);
      setUploadState("error");
      setErrorMessage("An unexpected error occurred");
    }
  };

  const resetUploader = () => {
    setUploadState("idle");
    setProgress(0);
    // Don't revoke the URL as it might be used in history
    updateImagePreviewRef(null);
    setAnalysisResult(null);
    setErrorMessage(null);
  };

  return (
    <div className="w-full h-full">
      {/* Mobile view with tabs */}
      <div className="md:hidden w-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="history">
              History
              {history.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {history.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="upload" className="mt-4">
            <UploaderCard
              uploadState={uploadState}
              dragActive={dragActive}
              handleDrag={handleDrag}
              handleDrop={handleDrop}
              handleChange={handleChange}
              imagePreview={imagePreviewRef.current}
              progress={progress}
              analysisResult={analysisResult}
              errorMessage={errorMessage}
              resetUploader={resetUploader}
            />
          </TabsContent>
          <TabsContent value="history" className="mt-4">
            <HistoryPanel
              history={history}
              isLoading={isLoading}
              removeHistoryItem={removeHistoryItem}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Desktop view with side-by-side layout */}
      <div className="hidden md:flex md:space-x-6 min-h-[40vh]">
        <div className="w-1/2">
          <UploaderCard
            uploadState={uploadState}
            dragActive={dragActive}
            handleDrag={handleDrag}
            handleDrop={handleDrop}
            handleChange={handleChange}
            imagePreview={imagePreviewRef.current}
            progress={progress}
            analysisResult={analysisResult}
            errorMessage={errorMessage}
            resetUploader={resetUploader}
          />
        </div>
        <div className="w-1/2">
          <HistoryPanel
            history={history}
            isLoading={isLoading}
            removeHistoryItem={removeHistoryItem}
          />
        </div>
      </div>
    </div>
  );
}
