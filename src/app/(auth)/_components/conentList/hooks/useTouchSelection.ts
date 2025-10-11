import { useCallback, useRef, useState } from "react";
import { useTouchDetection } from "@/hooks/useTouchDetection";

/**
 * 터치 기반 파일 선택을 위한 커스텀 훅
 * @returns 터치 선택 관련 상태와 핸들러들
 */
export const useTouchSelection = () => {
  const { isTouchDevice } = useTouchDetection();
  
  /** 모바일 선택 모드 상태 */
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  /** 길게 터치 중인 파일 인덱스 */
  const [longPressActive, setLongPressActive] = useState<number | null>(null);
  /** 길게 터치 타이머 */
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  /**
   * 터치 시작 시 호출되는 함수 - 길게 터치 감지를 시작
   * @param {number} fileIndex - 터치된 파일의 인덱스
   * @param {function} onLongPress - 길게 터치 시 실행할 콜백
   */
  const handleTouchStart = useCallback(
    (fileIndex: number, onLongPress: (index: number) => void) => {
      if (!isTouchDevice) return;

      setLongPressActive(fileIndex);

      // 선택 모드가 아닐 때만 길게 터치 타이머 시작
      if (!isSelectionMode) {
        longPressTimer.current = setTimeout(() => {
          onLongPress(fileIndex);
          setIsSelectionMode(true);
          setLongPressActive(null);

          // 햅틱 피드백 제공 (지원되는 기기에서)
          if ("vibrate" in navigator) {
            navigator.vibrate(50);
          }
        }, 500);
      }
    },
    [isSelectionMode, isTouchDevice],
  );

  /**
   * 터치 종료 시 호출되는 함수 - 길게 터치 타이머를 정리
   */
  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setLongPressActive(null);
  }, []);

  /**
   * 터치 이동 시 호출되는 함수 - 드래그 시 길게 터치를 취소
   */
  const handleTouchMove = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setLongPressActive(null);
  }, []);

  /**
   * 선택 모드 및 관련 상태 초기화
   */
  const resetSelection = useCallback(() => {
    setIsSelectionMode(false);
    setLongPressActive(null);
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  return {
    isSelectionMode,
    setIsSelectionMode,
    longPressActive,
    handleTouchStart,
    handleTouchEnd,
    handleTouchMove,
    resetSelection,
    isTouchDevice,
  };
};