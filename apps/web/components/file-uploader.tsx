"use client";

import type React from "react";

import { useState, useEffect } from "react";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useHistoryStore } from "@/hooks/use-history-store";
import { HistoryPanel } from "./history-panel";
import { UploaderCard } from "./uploader-card";
import {
  AnalysisResult,
  ErrorResponse,
  HistoryItem,
  UploadState,
} from "@/lib/types";

export function FileUploader() {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("upload");
  const [counter, setCounter] = useState(0);
  const { toast } = useToast();
  const { history, isLoading, error, addHistoryItem, removeHistoryItem } =
    useHistoryStore();

  // Check if we're on mobile
  const isMobile =
    typeof window !== "undefined" ? window.innerWidth < 768 : false;

  // Log any errors from the history store
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
    setUploadState("uploading");
    setErrorMessage(null);

    // Increment request counter
    setCounter((prev) => prev + 1);

    // Reset counter if it gets too large
    if (counter > 999) {
      setCounter(1);
    }

    // Log current request number
    console.log(`Request #${counter}`);

    // Create image preview
    const file = files[0];
    let previewUrl = null;
    if (file.type.startsWith("image/")) {
      previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
      console.log("Created image preview URL:", previewUrl);
    }

    const formData = new FormData();
    formData.append("file", files[0]);

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
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/analyze`, {
          method: "POST",
          body: formData,
        })
          .then(async (response) => {
            if (!response.ok) {
              const errorData: ErrorResponse = await response.json();
              throw new Error(errorData.error || "Failed to analyze image");
            }
            return response.json();
          })
          .then((result: AnalysisResult) => {
            console.log("API success response:", result);

            // Set the analysis result
            setAnalysisResult(result);

            // Add to history - using the captured previewUrl
            if (previewUrl) {
              const historyItem: HistoryItem = {
                id: Date.now().toString(),
                timestamp: new Date(),
                imageUrl: previewUrl,
                state: "success",
                result: { ...result }, // Create a copy of the result
              };

              // Add to IndexedDB history store
              addHistoryItem(historyItem);
            }

            // Change to success state
            setUploadState("success");

            // Show toast notification
            toast({
              title: "Analysis complete",
              description: `Successfully analyzed "${result.title}"`,
            });

            // Switch to history tab on mobile after success
            if (isMobile) {
              setTimeout(() => {
                setActiveTab("history");
              }, 1500);
            }
          })
          .catch((error) => {
            console.error("Error:", error);

            // Extract error message
            const errorMessage =
              error.message || "An unexpected error occurred";

            // Set the error message
            setErrorMessage(errorMessage);

            // Add to history - using the captured previewUrl
            if (previewUrl) {
              const historyItem: HistoryItem = {
                id: Date.now().toString(),
                timestamp: new Date(),
                imageUrl: previewUrl,
                state: "error",
                error: errorMessage,
              };

              // Add to IndexedDB history store
              addHistoryItem(historyItem);
            }

            // Change to error state
            setUploadState("error");

            // Show toast notification
            toast({
              variant: "destructive",
              title: "Analysis failed",
              description: errorMessage,
            });
          });
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
    setImagePreview(null);
    setAnalysisResult(null);
    setErrorMessage(null);
  };

  const toggleExpand = (id: string) => {
    if (expandedItem === id) {
      setExpandedItem(null);
    } else {
      setExpandedItem(id);
    }
  };

  const handleRemoveHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeHistoryItem(id);
    if (expandedItem === id) {
      setExpandedItem(null);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="w-full">
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
              imagePreview={imagePreview}
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
              expandedItem={expandedItem}
              toggleExpand={toggleExpand}
              removeHistoryItem={handleRemoveHistoryItem}
              formatTime={formatTime}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Desktop view with side-by-side layout */}
      <div className="hidden md:flex md:space-x-6">
        <div className="w-1/2">
          <UploaderCard
            uploadState={uploadState}
            dragActive={dragActive}
            handleDrag={handleDrag}
            handleDrop={handleDrop}
            handleChange={handleChange}
            imagePreview={imagePreview}
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
            expandedItem={expandedItem}
            toggleExpand={toggleExpand}
            removeHistoryItem={handleRemoveHistoryItem}
            formatTime={formatTime}
          />
        </div>
      </div>
    </div>
  );
}
