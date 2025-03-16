import { AnalysisResult } from "@/lib/types";
import React from "react";

export const showBookContent = (result?: AnalysisResult) =>
  Boolean(result?.text || result?.description);

export const BookContent = ({ result }: { result: AnalysisResult }) => {
  if (!showBookContent(result)) return null;
  return (
    <div className="w-full overflow-y-auto max-h-[250px] pr-2 mb-4">
      {!!result.description && (
        <div>
          <h4 className="font-semibold text-lg">Description</h4>
          <p className="text-sm text-gray-600">{result.description}</p>
        </div>
      )}
      {!!result.text && (
        <div>
          <h4 className="font-semibold text-lg">
            {result.type === "fiction" ? "Second" : "First"} page content
          </h4>
          <p className="text-sm text-gray-600">{result.text}</p>
        </div>
      )}
    </div>
  );
};
