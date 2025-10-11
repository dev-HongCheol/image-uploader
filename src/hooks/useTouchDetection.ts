import { useCallback, useEffect, useState } from "react";

/**
 * 터치 지원 기기 감지를 위한 커스텀 훅
 * 하이드레이션 에러를 방지하기 위해 클라이언트에서만 터치 감지
 * @returns {boolean} isTouchDevice - 현재 기기가 터치를 지원하는지 여부
 */
export const useTouchDetection = () => {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    // 클라이언트에서만 터치 감지 실행
    setIsTouchDevice("ontouchstart" in window || navigator.maxTouchPoints > 0);
  }, []);

  return { isTouchDevice };
};