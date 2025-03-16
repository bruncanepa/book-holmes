export type UploadState =
  | "idle"
  | "uploading"
  | "processing"
  | "success"
  | "partial-success"
  | "error";

export type AnalysisResult = {
  title: string;
  text: string;
  description: string;
  type: "fiction" | "non-fiction";
};

export type HistoryItem = {
  id: string;
  timestamp: Date;
  imageUrl: string;
  state: "success" | "partial-success" | "error";
  result?: AnalysisResult;
  error?: string;
};

export type ErrorResponse = {
  error: string;
};

export type BookDetectionEvent = {
  type: "book-detected" | "title-extracted" | "book-info";
  data: Partial<AnalysisResult>;
};
