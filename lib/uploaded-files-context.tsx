"use client";

import React, { createContext, useCallback, useContext, useState } from "react";
import type { UploadedFile } from "./api";

type UploadedFilesContextValue = {
  files: UploadedFile[];
  addFile: (file: UploadedFile) => void;
  updateFile: (id: string, patch: Partial<UploadedFile>) => void;
  removeFile: (id: string) => void;
  hasSuccessfulUpload: boolean;
};

const UploadedFilesContext = createContext<UploadedFilesContextValue | null>(null);

export function UploadedFilesProvider({ children }: { children: React.ReactNode }) {
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const addFile = useCallback((file: UploadedFile) => {
    setFiles((prev) => [...prev, file]);
  }, []);

  const updateFile = useCallback((id: string, patch: Partial<UploadedFile>) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...patch } : f))
    );
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const hasSuccessfulUpload = files.some((f) => f.status === "success");

  return (
    <UploadedFilesContext.Provider
      value={{ files, addFile, updateFile, removeFile, hasSuccessfulUpload }}
    >
      {children}
    </UploadedFilesContext.Provider>
  );
}

export function useUploadedFiles() {
  const ctx = useContext(UploadedFilesContext);
  if (!ctx) throw new Error("useUploadedFiles must be used within UploadedFilesProvider");
  return ctx;
}
