"use client";

import type React from "react";

import { useState, useEffect } from "react";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useHistoryStore } from "@/hooks/use-history-store";
import { HistoryPanel } from "./history-panel";
import { UploaderCard } from "./uploader-card";
import { AnalysisResult, HistoryItem, UploadState } from "@/lib/types";
import { loadFile } from "@/lib/file";

export function FileUploader() {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("upload");
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

    // Create image preview
    const file = files[0];
    let previewUrl = null;
    if (file.type.startsWith("image/")) {
      previewUrl = await loadFile(file);
      setImagePreview(previewUrl);
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
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/analyze`, {
          method: "POST",
          body: formData,
        })
          .then(async (response) => {
            const data = await response.json();

            // Check if the response contains isBook field
            if (data.isBook !== undefined) {
              // This is a valid API response, even if there's an error
              return data;
            } else if (!response.ok) {
              // This is a server error with no valid API response
              throw new Error(data.error || "Failed to analyze image");
            }

            return data;
          })
          .then((result) => {
            console.log("API response:", result);

            // Set the error message if present
            if (result.error) {
              setErrorMessage(result.error);
            }

            // Set the analysis result
            setAnalysisResult(result);

            // Determine if this is a success, partial success, or error
            const hasBookInfo = result.isBook && (result.title || result.type);
            const isComplete =
              !result.error &&
              result.isBook &&
              result.title &&
              result.type &&
              result.text;
            const isPartial = hasBookInfo && !isComplete;

            // Set appropriate state
            let state: "success" | "partial-success" | "error";
            if (isComplete) {
              state = "success";
            } else if (isPartial) {
              state = "partial-success";
            } else {
              state = "error";
            }

            // Add to history - using the captured previewUrl
            if (previewUrl) {
              const historyItem: HistoryItem = {
                id: Date.now().toString(),
                timestamp: new Date(),
                imageUrl: previewUrl,
                state: state,
                result: hasBookInfo
                  ? {
                      title: result.title || "Unknown Title",
                      text: result.text || "",
                      type:
                        (result.type as "fiction" | "non-fiction") ||
                        "non-fiction",
                    }
                  : undefined,
                error: result.error,
              };

              // Add to IndexedDB history store
              addHistoryItem(historyItem);
            }

            // Change state based on result
            setUploadState(state);

            // Show appropriate toast notification
            if (isComplete) {
              toast({
                title: "Analysis complete",
                description: `Successfully analyzed "${result.title}"`,
              });
            } else if (isPartial) {
              toast({
                title: "Partial analysis",
                description:
                  result.error || "Some information could not be retrieved",
              });
            } else {
              toast({
                variant: "destructive",
                title: "Analysis failed",
                description: result.error || "Could not complete analysis",
              });
            }

            // Switch to history tab on mobile after completion
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
              removeHistoryItem={removeHistoryItem}
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
            removeHistoryItem={removeHistoryItem}
          />
        </div>
      </div>
    </div>
  );
}
