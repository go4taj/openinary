"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Eye, Copy, Trash, Check } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export default function MediaLibraryPage() {
  const [files, setFiles] = useState<Array<{ url: string; type: string; name: string; size?: number }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

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

  const handleCopyUrl = useCallback((e: React.MouseEvent, url: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 1400);
    } catch (err) {
      // ignore
    }
  }, []);

  const handlePreview = useCallback((e: React.MouseEvent, href: string) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(href);
  }, [router]);

  const handleDelete = useCallback(async (e: React.MouseEvent, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "";
    try {
      const res = await fetch(`${apiBase}/media?name=${encodeURIComponent(name)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setFiles(prev => prev.filter(f => f.name !== name));
      } else {
        // optionally show error UI
        console.warn("Delete failed");
      }
    } catch (err) {
      console.warn("Delete error", err);
    }
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
          {files.map((file, index) => {
            const previewHref = `/media/preview?url=${encodeURIComponent(file.url)}&name=${encodeURIComponent(file.name)}`;
            if (file.type === 'image') {
              return (
                <Link key={index} href={previewHref} className="group relative bg-card border border-border rounded-lg overflow-hidden block">
                  <div className="w-full relative bg-gray-100">
                    <div style={{ paddingTop: "100%" }} />
                    <img src={file.url} alt={file.name} className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-3">
                      <div className="flex gap-2">
                        <button
                          onClick={(e)=>handlePreview(e, previewHref)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-md text-white/90 hover:text-white focus-visible:ring-[3px] focus-visible:ring-ring/50 outline-none"
                          aria-label="Preview"
                          title="Preview"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={(e)=>handleCopyUrl(e, file.url)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-md text-white/90 hover:text-white focus-visible:ring-[3px] focus-visible:ring-ring/50 outline-none"
                          aria-label={copiedUrl === file.url ? "Copied" : "Copy URL"}
                          title={copiedUrl === file.url ? "Copied" : "Copy URL"}
                        >
                          {copiedUrl === file.url ? (
                            <Check className="w-5 h-5" />
                          ) : (
                            <Copy className="w-5 h-5" />
                          )}
                        </button>
                        <button
                          onClick={(e)=>handleDelete(e, file.name)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-md text-red-700 hover:text-red-400 focus-visible:ring-[3px] focus-visible:ring-ring/50 outline-none"
                          aria-label="Delete"
                          title="Delete"
                        >
                          <Trash fill="lab(40.4273% 67.2623 53.7441)" className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="p-2">
                    <div className="text-sm font-medium truncate">{file.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {file.size ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : "-"} • {file.type}
                    </div>
                  </div>
                </Link>
              );
            }

            return (
              <Link key={index} href={previewHref} className="group relative bg-card border border-border rounded-lg overflow-hidden block">
                <div className="w-full relative bg-gray-100">
                  <div style={{ paddingTop: "100%" }} />
                  <video src={file.url} className="absolute inset-0 w-full h-full object-cover" muted playsInline />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-3">
                    <div className="flex gap-2">
                      <button
                        onClick={(e)=>handlePreview(e, previewHref)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-md text-white/90 hover:text-white focus-visible:ring-[3px] focus-visible:ring-ring/50 outline-none"
                        aria-label="Preview"
                        title="Preview"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={(e)=>handleCopyUrl(e, file.url)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-md text-white/90 hover:text-white focus-visible:ring-[3px] focus-visible:ring-ring/50 outline-none"
                        aria-label={copiedUrl === file.url ? "Copied" : "Copy URL"}
                        title={copiedUrl === file.url ? "Copied" : "Copy URL"}
                      >
                        {copiedUrl === file.url ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          <Copy className="w-5 h-5" />
                        )}
                      </button>
                      <button
                        onClick={(e)=>handleDelete(e, file.name)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-md text-red-700 hover:text-red-400 focus-visible:ring-[3px] focus-visible:ring-ring/50 outline-none"
                        aria-label="Delete"
                        title="Delete"
                      >
                        <Trash fill="lab(40.4273% 67.2623 53.7441)" className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="p-2">
                  <div className="text-sm font-medium truncate">{file.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {file.size ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : "-"} • {file.type}
                  </div>
                </div>
              </Link>
            );
          })}
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