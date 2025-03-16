import React from "react";

export const BookContent = ({ content }: { content: string }) => {
  if (!content) return null;
  return (
    <div className="w-full overflow-y-auto max-h-[250px] pr-2 mb-4">
      <p className="text-sm text-gray-600">{content}</p>
    </div>
  );
};
