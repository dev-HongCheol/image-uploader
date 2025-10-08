"use client";

import { DEFAULT_PAGE_SIZE } from "@/constants/common";
import { ContentResponse, getContentApi } from "@/lib/api/content-api";
import { UploadedFile } from "@/types/database";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Folder as FolderIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MouseEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useInView } from "react-intersection-observer";
import ContentDetailDialog from "./ContentDetailDialog";
import ContentItem from "./ContentItem";
import SelectedFileControlPanel from "./selectedFileControlPanel/SelectedFileControlPanel";
import { Skeleton } from "@/components/ui/skeleton";

type ContentListProps = {
  initialData: ContentResponse;
};

/**
 * 콘텐츠 목록 클라이언트 컴포넌트
 * 초기 데이터를 받아서 React Query로 실시간 업데이트 처리
 */
export default function ContentList({ initialData }: ContentListProps) {
  const searchParams = useSearchParams();
  const currentPath = searchParams.get("path") || "";
  /** 미리보기 파일 */
  const [previewFile, setPreviewFile] = useState<UploadedFile>();
  /** 선택된 파일들 */
  const [selectedFileIds, setSelectedFileIds] = useState<number[]>([]);
  const { ref, inView } = useInView();

  const handlePreviewFile = useCallback(
    (file: UploadedFile | undefined) => setPreviewFile(file),
    [],
  );

  // 폴더를 이동하면 선택된 파일 초기화
  useEffect(() => {
    setSelectedFileIds([]);
  }, [currentPath]);

  const { data, error, refetch, hasNextPage, fetchNextPage, isFetching } =
    useInfiniteQuery({
      queryKey: ["content", currentPath],
      queryFn: ({ pageParam }) =>
        getContentApi({ path: currentPath, offset: pageParam }),
      getNextPageParam: (lastPage, allPages) => {
        // 마지막 페이지에 파일이 없거나 페이지 크기보다 적으면 더 이상 페이지 없음
        if (!lastPage.files || lastPage.files.length < DEFAULT_PAGE_SIZE) {
          return undefined;
        }
        // 다음 offset = 현재까지 받은 모든 파일 개수
        const totalFiles = allPages.reduce(
          (sum, page) => sum + (page.files?.length || 0),
          0,
        );
        return totalFiles;
      },
      initialPageParam: 0,
      initialData: {
        pages: [initialData],
        pageParams: [0],
      },

      select: (data) => {
        // 모든 페이지의 파일을 하나의 배열로 병합
        const files = data.pages.flatMap((page) => page.files);

        // 첫 페이지의 폴더 정보와 병합된 파일 목록 반환
        return {
          folders: data.pages[0].folders,
          files,
          currentPath: data.pages[0].currentPath,
          folderId: data.pages[0].folderId,
        };
      },
    });

  useEffect(() => {
    if (hasNextPage && !isFetching && inView) {
      console.log("fetching..");
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetching]);

  // 선택된 파일들 (React Query의 data는 이미 메모이제이션되어 있음)
  const selectedFiles = useMemo(() => {
    return data.files.filter((file, index) => selectedFileIds.includes(index));
  }, [selectedFileIds, data.files]);

  const handleMoveComplete = useCallback(() => {
    // 파일 이동 완료 후 선택 상태 초기화
    setSelectedFileIds([]);
    refetch();
  }, []);

  /**
   * 파일 선택 핸들러
   * Ctrl: 다중 선택/해제, Shift: 범위 선택
   */
  const handleFileSelect = useCallback(
    (event: MouseEvent<HTMLDivElement>, fileIndex: number) => {
      event.preventDefault();
      event.stopPropagation();

      if (!data?.files || fileIndex < 0 || fileIndex >= data.files.length) {
        return;
      }

      const { ctrlKey, shiftKey } = event;
      const isCurrentlySelected = selectedFileIds.includes(fileIndex);

      // Ctrl + Shift 조합은 무시
      if (ctrlKey && shiftKey) return;

      // 일반 클릭: 단일 선택
      if (!ctrlKey && !shiftKey) {
        setSelectedFileIds(isCurrentlySelected ? [] : [fileIndex]);
        return;
      }

      // Ctrl 클릭: 토글 선택
      if (ctrlKey) {
        const newSelection = isCurrentlySelected
          ? selectedFileIds.filter((id) => id !== fileIndex)
          : [...selectedFileIds, fileIndex].sort((a, b) => a - b);

        setSelectedFileIds(newSelection);
        return;
      }

      // Shift 클릭: 범위 선택
      if (shiftKey && selectedFileIds.length > 0) {
        const lastSelected = selectedFileIds[selectedFileIds.length - 1];
        const start = Math.min(lastSelected, fileIndex);
        const end = Math.max(lastSelected, fileIndex);

        const rangeSelection = Array.from(
          { length: end - start + 1 },
          (_, i) => start + i,
        );
        const newSelection = [
          ...new Set([...selectedFileIds, ...rangeSelection]),
        ].sort((a, b) => a - b);

        setSelectedFileIds(newSelection);
      }
    },
    [selectedFileIds, data?.files],
  );

  if (error) {
    return (
      <div className="rounded-lg border p-4 text-red-500">
        오류가 발생했습니다: {error.message}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-lg border p-4 text-gray-500">
        데이터를 불러오는 중...
      </div>
    );
  }

  const { folders, files } = data;

  return (
    <div>
      {/* 선택된 파일 정보 및 컨트롤러 */}
      <SelectedFileControlPanel
        selectedFiles={selectedFiles}
        currentPath={currentPath}
        onMoveComplete={handleMoveComplete}
      />

      {/* 폴더 목록 */}
      {folders && folders.length > 0 && (
        <div className="">
          <h2 className="mb-3 text-lg font-semibold">폴더</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {folders.map((folder) => (
              <Link
                key={folder.id}
                href={`/?path=${encodeURIComponent(
                  currentPath
                    ? `${currentPath}/${folder.name}`
                    : `/${folder.name}`,
                )}`}
                className="flex cursor-pointer items-center rounded-lg border p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-900"
              >
                <div className="mr-3">
                  <FolderIcon
                    className="h-5 w-5"
                    style={{ color: folder.folder_color || "#3b82f6" }}
                  />
                </div>
                <div className="flex-1">
                  <div className="font-medium">{folder.name}</div>
                  {folder.description && (
                    <div className="text-sm text-gray-500">
                      {folder.description}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 파일 목록 */}
      <div className="mb-8">
        {previewFile && (
          <ContentDetailDialog
            open={!!previewFile}
            file={previewFile}
            onClose={handlePreviewFile}
          />
        )}

        {files && files.length > 0 && (
          <h2 className="mb-3 text-lg font-semibold">파일</h2>
        )}

        <div className="grid grid-cols-2 gap-3 select-none md:grid-cols-3 2xl:grid-cols-4">
          {files &&
            files.length > 0 &&
            files.map((file, index) => (
              <ContentItem
                isSelected={selectedFileIds.includes(index)}
                key={file.id}
                file={file}
                index={index}
                handlePreviewFile={handlePreviewFile}
                handleFileSelect={handleFileSelect}
              />
            ))}
          {isFetching && (
            <>
              <div className="flex flex-col gap-0.5 rounded-lg border p-1.5 md:gap-2 md:p-4">
                <Skeleton className="h-6" />
                <Skeleton className="h-32 justify-center sm:h-44 md:h-52" />
              </div>
              <div className="flex flex-col gap-0.5 rounded-lg border p-1.5 md:gap-2 md:p-4">
                <Skeleton className="h-6" />
                <Skeleton className="h-32 justify-center sm:h-44 md:h-52" />
              </div>
              <div className="flex flex-col gap-0.5 rounded-lg border p-1.5 md:gap-2 md:p-4">
                <Skeleton className="h-6" />
                <Skeleton className="h-32 justify-center sm:h-44 md:h-52" />
              </div>
            </>
          )}

          <div ref={ref} />
        </div>
      </div>
    </div>
  );
}
