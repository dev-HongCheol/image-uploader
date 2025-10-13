"use client";

import { UploadResult } from "@/app/api/upload/route";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { CloudUpload } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { ChangeEvent, MouseEvent, useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import FileUploadProgress from "./FIleUploadProgress";

const batchSize = 10;

const FileUploadButton = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({
    progress: 0,
    fileCount: 0,
    totalFiles: 0,
    currentFileName: "",
  });
  const queryClient = useQueryClient();
  const path = useSearchParams().get("path") || "";

  const handleClickFileBtn = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      const fileInput = fileInputRef.current;
      if (!fileInput) return;

      fileInput.click();
    },
    [],
  );

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files?.length === 0) return;

    fileUpload([...files]);
  };

  const fileUpload = async (files: File[]) => {
    if (isUploading || files.length === 0) return;

    setIsUploading(true);
    const totalFiles = files.length;
    let completedFiles = 0;

    setUploadProgress({
      progress: 0,
      fileCount: 0,
      totalFiles,
      currentFileName: "",
    });

    // TODO: 동기화가 없어..문제없을까? 테스트 필요
    for (let i = 0; i < files.length; i += batchSize) {
      const uploadBatchFiles = files.slice(i, i + batchSize);

      try {
        const formData = new FormData();

        formData.append("path", path);
        uploadBatchFiles.forEach((file) => {
          formData.append("files", file);
        });

        // 현재 배치의 첫 번째 파일명 업데이트
        setUploadProgress((prev) => ({
          ...prev,
          currentFileName: uploadBatchFiles[0]?.name || "",
        }));

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();

        if (result.results) {
          // 각 파일의 업로드 결과 처리
          result.results.forEach((fileResult: UploadResult) => {
            completedFiles++;

            // 진행률 업데이트
            const progress = (completedFiles / totalFiles) * 100;
            setUploadProgress({
              progress,
              fileCount: completedFiles,
              totalFiles,
              currentFileName: fileResult.fileName,
            });

            if ("error" in fileResult) {
              toast.error(`${fileResult.fileName} upload failed`, {
                duration: Infinity,
                closeButton: true,
                description: fileResult.error,
              });
            } else {
              toast.success(`${fileResult.fileName} upload success`, {
                closeButton: true,
              });
            }
          });

          queryClient.invalidateQueries({ queryKey: ["content", path ?? ""] });
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error("Upload error:", error);
        toast.error("Upload failed", {
          duration: Infinity,
          closeButton: true,
          description: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // 업로드 완료 후 상태 초기화
    setIsUploading(false);
    setUploadProgress({
      progress: 0,
      fileCount: 0,
      totalFiles: 0,
      currentFileName: "",
    });

    // 파일 입력 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <form>
        <input
          type="file"
          hidden
          name="file"
          multiple
          accept="image/*,video/*"
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        <Button
          size="icon"
          className="size-7 text-blue-600 dark:text-blue-300"
          variant="outline"
          title="Upload File"
          onClick={handleClickFileBtn}
          disabled={isUploading}
        >
          <CloudUpload />
        </Button>
      </form>
      {isUploading && (
        <FileUploadProgress
          progress={uploadProgress.progress}
          fileCount={uploadProgress.fileCount}
          totalFiles={uploadProgress.totalFiles}
          currentFileName={uploadProgress.currentFileName}
        />
      )}
    </>
  );
};

export default FileUploadButton;
