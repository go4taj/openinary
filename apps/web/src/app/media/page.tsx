"use client";

import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useState } from "react";

export default function MediaLibraryPage() {
  const [files, setFiles] = useState<Array<{ url: string; type: string; name: string; size?: number }>>([]);
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = useCallback(async (file: File) => {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "";
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${apiBase}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const result = await res.json();
      return result;
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    }
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setIsUploading(true);
    try {
      const file = files[0];
      const result = await uploadFile(file);
      
      setFiles(prev => [...prev, {
        url: result.url,
        type: file.type.startsWith("image/") ? "image" : "video",
        name: file.name,
        size: file.size
      }]);
    } catch (error) {
      console.error("File upload error:", error);
    } finally {
      setIsUploading(false);
    }
  }, [uploadFile]);

  useEffect(() => {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "";
      (async () => {
        try {
          const res = await fetch(apiBase ? `${apiBase}/media` : `/media`);
          if (!res.ok) return;
          const data = await res.json();
          setFiles(data || []);
        } catch (err) {
          // ignore
        }
      })();
    }, []);
  return (
    <div className="p-6">
      <div className="">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Media Library</h1>
            <p className="text-sm text-muted-foreground">Upload and manage your media files</p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="file"
              id="fileInput"
              className="hidden"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              disabled={isUploading}
            />
            <Button
              onClick={() => document.getElementById("fileInput")?.click()}
              disabled={isUploading}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              {isUploading ? "Uploading..." : "Upload Media"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {files.map((file, index) => (
            <div key={index} className="group relative bg-card border border-border rounded-lg overflow-hidden">
              <div className="w-full relative bg-gray-100">
                <div style={{ paddingTop: "100%" }} />
                {file.type === "image" ? (
                  <img src={file.url} alt={file.name} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <video src={file.url} className="absolute inset-0 w-full h-full object-cover" controls muted playsInline />
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="text-white text-sm p-2 text-center">
                    <div className="font-medium truncate max-w-[100%]">{file.name}</div>
                    <div className="text-xs mt-1">
                      {file.size ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : "-"}
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-2">
                <div className="text-sm font-medium truncate">{file.name}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {file.size ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : "-"} • {file.type}
                </div>
              </div>
            </div>
          ))}
        </div>

        {files.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No media files yet. Upload some files to get started.
          </div>
        )}
      </div>
    </div>
  );
}