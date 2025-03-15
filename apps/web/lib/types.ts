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
