"use client";

import { useCallback, useId, useRef, useState } from "react";
import Link from "next/link";
import { AppNav } from "@/components/app-nav";
import {
  isAllowedFile,
  getRejectMessage,
  uploadFile,
  type UploadedFile,
} from "@/lib/api";
import { useUploadedFiles } from "@/lib/uploaded-files-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadPage() {
  const { files, addFile, updateFile, removeFile } = useUploadedFiles();
  const [dragActive, setDragActive] = useState(false);
  const [rejectError, setRejectError] = useState<string | null>(null);
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList?.length) return;
      setRejectError(null);
      const toAdd: UploadedFile[] = [];
      const rejected: string[] = [];
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        if (!isAllowedFile(file)) {
          rejected.push(file.name);
          continue;
        }
        const id = `file-${Date.now()}-${i}-${file.name}`;
        toAdd.push({
          id,
          name: file.name,
          type: file.type,
          size: file.size,
          status: "pending",
        });
      }
      if (rejected.length) {
        setRejectError(
          `${getRejectMessage()} Rejected: ${rejected.join(", ")}`
        );
      }
      toAdd.forEach(addFile);
      for (const f of toAdd) {
        const file = Array.from(fileList).find((x) => x.name === f.name && x.size === f.size);
        if (!file) continue;
        updateFile(f.id, { status: "uploading" });
        try {
          const { id } = await uploadFile(file);
          updateFile(f.id, { status: "success", id });
        } catch (err) {
          updateFile(f.id, {
            status: "error",
            error: err instanceof Error ? err.message : "Upload failed",
          });
        }
      }
    },
    [addFile, updateFile]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      processFiles(e.dataTransfer.files);
    },
    [processFiles]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <AppNav />

      <main className="flex-1 max-w-2xl mx-auto w-full p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Upload documents</h1>
        <p className="text-sm text-muted-foreground">
          PDF (.pdf) and Markdown (.md, .markdown) only.
        </p>

        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
            dragActive ? "border-primary bg-muted/50" : "border-muted-foreground/25"
          )}
        >
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept=".pdf,.md,.markdown,application/pdf,text/markdown,text/x-markdown"
            multiple
            className="hidden"
            onChange={(e) => {
              processFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <p className="text-muted-foreground mb-2">
            Drag and drop files here, or
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
          >
            Choose files
          </Button>
        </div>

        {rejectError && (
          <div className="rounded-md bg-destructive/10 text-destructive text-sm p-3">
            {rejectError}
          </div>
        )}

        {files.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Uploaded files</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {files.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center justify-between gap-2 py-2 border-b border-border last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{f.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {f.type} · {formatSize(f.size)} ·{" "}
                        <span
                          className={
                            f.status === "success"
                              ? "text-green-600"
                              : f.status === "error"
                                ? "text-destructive"
                                : ""
                          }
                        >
                          {f.status === "uploading"
                            ? "Uploading…"
                            : f.status === "success"
                              ? "Uploaded"
                              : f.status === "error"
                                ? f.error ?? "Error"
                                : "Pending"}
                        </span>
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeFile(f.id)}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
