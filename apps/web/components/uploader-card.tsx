"use client";

import { Upload, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AnalysisResult, UploadState } from "@/lib/types";
import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";
import { BookContent } from "./book-content";

export function UploaderCard({
  uploadState,
  dragActive,
  handleDrag,
  handleDrop,
  handleChange,
  imagePreview,
  progress,
  analysisResult,
  errorMessage,
  resetUploader,
}: {
  uploadState: UploadState;
  dragActive: boolean;
  handleDrag: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  imagePreview: string | null;
  progress: number;
  analysisResult: AnalysisResult | null;
  errorMessage: string | null;
  resetUploader: () => void;
}) {
  return (
    <Card
      className={`w-full h-full transition-all ${dragActive ? "border-green-500 shadow-lg" : ""}`}
    >
      <CardContent className="p-6 h-full">
        <div
          className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg border-gray-300 bg-white h-full"
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {uploadState === "idle" && (
            <>
              <Upload className="w-10 h-10 mb-4 text-gray-500" />
              <p className="mb-2 text-center text-gray-600">
                Drag and Drop Files Here
              </p>
              <p className="text-xs text-gray-500 text-center">
                or click to browse
              </p>
              <input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleChange}
                accept="image/*"
              />
            </>
          )}

          {uploadState === "uploading" && (
            <>
              {imagePreview ? (
                <div className="mb-4 w-full">
                  <img
                    src={imagePreview || "/placeholder.svg"}
                    alt="Upload preview"
                    className="mx-auto max-h-48 max-w-full object-contain rounded-md"
                  />
                </div>
              ) : (
                <Loader2 className="w-10 h-10 mb-4 text-green-500 animate-spin" />
              )}
              <p className="mb-4 text-center text-gray-600">Uploading...</p>
              <div className="w-full mt-2">
                <Progress value={progress} className="h-2 bg-gray-200" />
              </div>
            </>
          )}

          {(uploadState === "success" || uploadState === "processing") && (
            <>
              {imagePreview ? (
                <div className="mb-4 w-full">
                  <img
                    src={imagePreview || "/placeholder.svg"}
                    alt="Processing preview"
                    className="mx-auto max-h-48 max-w-full object-contain rounded-md opacity-70"
                  />
                </div>
              ) : (
                <Loader2 className="w-10 h-10 mb-4 text-blue-500 animate-spin" />
              )}

              {uploadState === "processing" && (
                <>
                  <Loader2 className="w-10 h-10 mb-4 text-blue-500 animate-spin" />
                  <p className="mb-2 text-center text-gray-600">
                    Processing Image...
                  </p>
                </>
              )}

              <div className="w-full">
                <div className="flex items-center justify-between mb-2">
                  {analysisResult?.title && (
                    <h3 className="font-semibold text-lg">
                      {analysisResult.title}
                    </h3>
                  )}
                  {analysisResult?.type && (
                    <Badge variant="secondary">{analysisResult.type}</Badge>
                  )}
                </div>
                {analysisResult && <BookContent result={analysisResult} />}
                {uploadState === "success" && (
                  <div className="flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                    <span className="text-green-600 font-medium">
                      Analysis Complete
                    </span>
                  </div>
                )}
              </div>
            </>
          )}

          {uploadState === "partial-success" && analysisResult && (
            <>
              <div className="mb-4 w-full">
                <img
                  src={imagePreview || "/placeholder.svg"}
                  alt="Partially processed image"
                  className="mx-auto max-h-48 max-w-full object-contain rounded-md"
                />
              </div>
              <div className="w-full">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-lg">
                    {analysisResult.title || "Unknown Title"}
                  </h3>
                  {analysisResult.type && (
                    <Badge
                      variant={
                        analysisResult.type === "fiction"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {analysisResult.type}
                    </Badge>
                  )}
                </div>
                <BookContent result={analysisResult} />
                <Alert className="mb-4 border-yellow-500 bg-yellow-50 text-yellow-800">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription>
                    {errorMessage || "Some information could not be retrieved"}
                  </AlertDescription>
                </Alert>
                <div className="flex items-center justify-center">
                  <span className="text-yellow-600 font-medium">
                    Partial Analysis Complete
                  </span>
                </div>
              </div>
            </>
          )}

          {uploadState === "error" && errorMessage && (
            <>
              <div className="mb-4 w-full">
                <img
                  src={imagePreview || "/placeholder.svg"}
                  alt="Error preview"
                  className="mx-auto max-h-48 max-w-full object-contain rounded-md opacity-80"
                />
              </div>
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            </>
          )}

          {Boolean(
            ["success", "partial-success", "error"].includes(uploadState)
          ) && (
            <button
              onClick={resetUploader}
              className="mt-4 w-full py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium transition-colors"
            >
              Upload Another Image
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
