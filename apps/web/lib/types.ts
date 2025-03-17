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
  error?: string;
  isBook?: boolean;
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
  type:
    | "book-detected"
    | "book-title"
    | "book-type"
    | "book-description"
    | "error"
    | "completed";
  data: Partial<AnalysisResult>;
};
