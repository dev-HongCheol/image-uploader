import { MouseEvent, useCallback, useMemo, useState } from "react";
import { UploadedFile } from "@/types/database";

/**
 * 파일 선택 관리를 위한 커스텀 훅
 * @param files - 파일 목록
 * @returns 파일 선택 관련 상태와 핸들러들
 */
export const useFileSelection = (files: UploadedFile[]) => {
  /** 선택된 파일들의 인덱스 */
  const [selectedFileIds, setSelectedFileIds] = useState<number[]>([]);

  // 선택된 파일들 (메모이제이션)
  const selectedFiles = useMemo(() => {
    return files.filter((file, index) => selectedFileIds.includes(index));
  }, [selectedFileIds, files]);

  /**
   * 파일 선택 핸들러
   * @param {MouseEvent<HTMLDivElement>} event - 마우스 이벤트
   * @param {number} fileIndex - 파일 인덱스
   * @param {boolean} isTouchDevice - 터치 기기 여부
   * @param {boolean} isSelectionMode - 선택 모드 여부
   * @param {function} setIsSelectionMode - 선택 모드 설정 함수
   */
  const handleFileSelect = useCallback(
    (
      event: MouseEvent<HTMLDivElement>,
      fileIndex: number,
      isTouchDevice: boolean,
      isSelectionMode: boolean,
      setIsSelectionMode: (mode: boolean) => void,
    ) => {
      event.preventDefault();
      event.stopPropagation();

      if (!files || fileIndex < 0 || fileIndex >= files.length) {
        return;
      }

      // 터치 기기에서는 선택 모드가 아닐 때 일반 터치로 선택 불가
      if (isTouchDevice && !isSelectionMode) return;

      const { ctrlKey, shiftKey } = event;
      const isCurrentlySelected = selectedFileIds.includes(fileIndex);

      // 터치 기기에서는 키보드 조합 무시하고 토글 선택만
      if (isTouchDevice) {
        const newSelection = isCurrentlySelected
          ? selectedFileIds.filter((id) => id !== fileIndex)
          : [...selectedFileIds, fileIndex].sort((a, b) => a - b);

        setSelectedFileIds(newSelection);
        return;
      }

      // 데스크톱에서의 기존 로직
      // Ctrl + Shift 조합은 무시
      if (ctrlKey && shiftKey) return;

      // 일반 클릭: 단일 선택 및 선택 모드 활성화
      if (!ctrlKey && !shiftKey) {
        setSelectedFileIds(isCurrentlySelected ? [] : [fileIndex]);
        if (!isSelectionMode && !isCurrentlySelected) {
          setIsSelectionMode(true);
        }
        return;
      }

      // Ctrl 클릭: 토글 선택 및 선택 모드 활성화
      if (ctrlKey) {
        const newSelection = isCurrentlySelected
          ? selectedFileIds.filter((id) => id !== fileIndex)
          : [...selectedFileIds, fileIndex].sort((a, b) => a - b);

        setSelectedFileIds(newSelection);
        if (!isSelectionMode) {
          setIsSelectionMode(true);
        }
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
    [selectedFileIds, files],
  );

  /**
   * 길게 터치 시 파일을 선택에 추가
   * @param {number} fileIndex - 파일 인덱스
   */
  const handleLongPress = useCallback((fileIndex: number) => {
    setSelectedFileIds((prev) => {
      const newSelection = prev.includes(fileIndex)
        ? prev
        : [...prev, fileIndex].sort((a, b) => a - b);
      return newSelection;
    });
  }, []);

  /**
   * 선택된 파일들 초기화
   */
  const clearSelectedFiles = useCallback(() => {
    setSelectedFileIds([]);
  }, []);

  return {
    selectedFileIds,
    selectedFiles,
    handleFileSelect,
    handleLongPress,
    clearSelectedFiles,
    setSelectedFileIds,
  };
};