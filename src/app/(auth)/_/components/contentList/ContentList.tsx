"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { DEFAULT_PAGE_SIZE } from "@/constants/common";
import { ContentResponse, getContentApi } from "@/lib/api/content-api";
import { UploadedFile } from "@/types/database";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useInView } from "react-intersection-observer";
import ContentDetailDialog from "./dialogs/ContentDetailDialog";
import ContentItem from "./ContentItem";
import { useFileSelection } from "../../hooks/useFileSelection";
import { useTouchSelection } from "../../hooks/useTouchSelection";
import FileControlPanel from "./selectedFileControlPanel/FileControlPanel";
import FolderList from "./FolderList";

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
  const { ref, inView } = useInView();

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

  // 커스텀 훅들
  const touchSelection = useTouchSelection();
  const fileSelection = useFileSelection(data?.files || []);

  const handlePreviewFile = useCallback(
    (file: UploadedFile | undefined) => setPreviewFile(file),
    [],
  );

  // 폴더를 이동하면 선택된 파일 및 선택 모드 초기화
  useEffect(() => {
    fileSelection.clearSelectedFiles();
    touchSelection.resetSelection();
  }, [
    currentPath,
    fileSelection.clearSelectedFiles,
    touchSelection.resetSelection,
  ]);

  useEffect(() => {
    if (hasNextPage && !isFetching && inView) {
      console.log("fetching..");
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetching]);

  const handleMoveComplete = useCallback(() => {
    // 파일 이동 완료 후 선택 상태 및 선택 모드 초기화
    fileSelection.clearSelectedFiles();
    touchSelection.resetSelection();
    refetch();
  }, [
    fileSelection.clearSelectedFiles,
    touchSelection.resetSelection,
    refetch,
  ]);

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
      <FileControlPanel
        selectedFiles={fileSelection.selectedFiles}
        onMoveComplete={handleMoveComplete}
        touchSelection={touchSelection}
      />

      {!isFetching &&
        folders &&
        folders.length === 0 &&
        files &&
        files.length === 0 && (
          <div className="mt-[5%] text-center">
            현재 경로는 빈 폴더입니다.
            <br />
            파일을 업로드 및 폴더를 생성이 가능하며 상단의 폴더명을 선택하여
            폴더를 이동 하실 수 있습니다.
          </div>
        )}

      {/* 폴더 목록 */}
      <FolderList
        folders={folders || []}
        currentPath={currentPath}
        onUpdateComplete={refetch}
      />

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
                isSelected={fileSelection.selectedFileIds.includes(index)}
                key={file.id}
                file={file}
                index={index}
                handlePreviewFile={handlePreviewFile}
                handleFileSelect={(event, fileIndex) =>
                  fileSelection.handleFileSelect(
                    event,
                    fileIndex,
                    touchSelection.isTouchDevice,
                    touchSelection.isSelectionMode,
                    touchSelection.setIsSelectionMode,
                  )
                }
                onTouchStart={() =>
                  touchSelection.handleTouchStart(
                    index,
                    fileSelection.handleLongPress,
                  )
                }
                onTouchEnd={touchSelection.handleTouchEnd}
                onTouchMove={touchSelection.handleTouchMove}
                longPressActive={touchSelection.longPressActive === index}
                isSelectionMode={touchSelection.isSelectionMode}
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
