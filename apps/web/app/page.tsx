"use client";

import { FileUploader } from "@/components/file-uploader";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 bg-gray-50">
      <div className="text-center mb-8 mt-8">
        <h1 className="text-4xl font-bold text-gray-800">Book Holmes</h1>
        <p className="text-gray-600 mt-2">
          Your literary detective: Uncover the story behind every cover
        </p>
      </div>
      <div className="w-full max-w-6xl mx-auto">
        <FileUploader />
      </div>
    </main>
  );
}
