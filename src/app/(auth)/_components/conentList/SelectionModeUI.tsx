"use client";

interface SelectionModeUIProps {
  isTouchDevice: boolean;
  isSelectionMode: boolean;
  selectedFileCount: number;
  onExitSelectionMode: () => void;
}

/**
 * 선택 모드 관련 UI 컴포넌트
 */
export default function SelectionModeUI({
  isTouchDevice,
  isSelectionMode,
  selectedFileCount,
  onExitSelectionMode,
}: SelectionModeUIProps) {
  return (
    <>
      {/* 터치 기기 선택 모드 안내 */}
      {isTouchDevice && !isSelectionMode && selectedFileCount === 0 && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="text-sm text-blue-800">
            📱 파일을 길게 터치하여 선택 모드를 시작하세요
          </p>
        </div>
      )}

      {/* 선택 모드 상태 표시 */}
      {isSelectionMode && (
        <div className="mb-4 rounded-lg border border-green-300 bg-green-100 p-3">
          <div className="flex items-center justify-between">
            <span className="font-medium text-green-800">
              🎯 선택 모드 활성화
            </span>
            <button
              onClick={onExitSelectionMode}
              className="rounded bg-gray-500 px-3 py-1 text-sm text-white hover:bg-gray-600"
            >
              선택 모드 종료
            </button>
          </div>
          <p className="mt-1 text-sm text-green-700">
            {isTouchDevice
              ? "파일을 터치하여 선택/해제하세요"
              : "파일을 클릭하여 선택/해제하세요"}
          </p>
        </div>
      )}
    </>
  );
}