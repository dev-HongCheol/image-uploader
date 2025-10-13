"use client";

import { Loader2, Upload } from "lucide-react";
import { Progress } from "@/components/ui/progress";

/**
 * 업로드 진행 상태를 표시하는 오버레이 컴포넌트
 * @param {UploadProgressProps} props - 컴포넌트 props
 * @returns {JSX.Element} 업로드 진행 오버레이
 */
interface UploadProgressProps {
  /** 업로드 진행률 (0-100) */
  progress?: number;
  /** 업로드 중인 파일 개수 */
  fileCount?: number;
  /** 전체 파일 개수 */
  totalFiles?: number;
  /** 현재 업로드 중인 파일명 */
  currentFileName?: string;
}

export default function FileUploadProgress({
  progress = 0,
  fileCount = 0,
  totalFiles = 0,
  currentFileName,
}: UploadProgressProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-2xl dark:bg-gray-900">
        <div className="flex flex-col items-center space-y-6">
          {/* 아이콘 영역 */}
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-blue-400 opacity-20"></div>
            <div className="relative rounded-full bg-blue-100 p-4 dark:bg-blue-900">
              <Upload className="size-12 text-blue-600 dark:text-blue-400" />
            </div>
          </div>

          {/* 텍스트 영역 */}
          <div className="space-y-2 text-center">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              업로드 중...
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {totalFiles > 0 ? (
                <>
                  {fileCount} / {totalFiles} 파일 업로드 중
                </>
              ) : (
                "파일을 업로드하는 중입니다."
              )}
            </p>
            {currentFileName && (
              <p className="truncate text-xs text-gray-400 dark:text-gray-500">
                {currentFileName}
              </p>
            )}
          </div>

          {/* 진행률 바 */}
          <div className="w-full space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>{progress.toFixed(0)}%</span>
              <Loader2 className="size-4 animate-spin" />
            </div>
          </div>

          {/* 안내 메시지 */}
          <p className="text-center text-xs text-gray-400 dark:text-gray-500">
            업로드가 완료될 때까지 창을 닫지 마세요.
          </p>
        </div>
      </div>
    </div>
  );
}
