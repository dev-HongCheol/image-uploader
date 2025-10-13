"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash, Edit2, MoveRight, FolderIcon } from "lucide-react";
import { Folder } from "@/types/database";
import { updateFolderApi, deleteFolderApi } from "@/lib/api/folder-api";
import MoveFileDialog from "./MoveFileDialog";
import { useSearchParams } from "next/navigation";

type FolderManageDialogProps = {
  open: boolean;
  onClose: () => void;
  folder: Folder;
  onUpdateComplete?: () => void;
};

/**
 * 폴더 관리 다이얼로그
 * 폴더명 변경, 이동, 삭제 기능 제공
 */
const FolderManageDialog = ({
  open,
  onClose,
  folder,
  onUpdateComplete,
}: FolderManageDialogProps) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [newFolderName, setNewFolderName] = useState(folder.name);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const queryClient = useQueryClient();
  const path = useSearchParams().get("path") || "";

  /**
   * 폴더명 변경 mutation
   */
  const updateFolderMutation = useMutation({
    mutationFn: (data: { folderId: string; name: string }) =>
      updateFolderApi({ folderId: data.folderId, name: data.name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content", path] });
      toast.success("폴더명이 변경되었습니다.");
      setIsEditMode(false);
      onUpdateComplete?.();
      onClose();
    },
    onError: (error) => {
      console.error("폴더명 변경 실패:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "폴더명 변경 중 오류가 발생했습니다.",
      );
    },
  });

  /**
   * 폴더 삭제 mutation
   */
  const deleteFolderMutation = useMutation({
    mutationFn: (folderId: string) => deleteFolderApi({ folderId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content"] });
      toast.success("폴더가 삭제되었습니다.");
      onUpdateComplete?.();
      onClose();
    },
    onError: (error) => {
      console.error("폴더 삭제 실패:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "폴더 삭제 중 오류가 발생했습니다.",
      );
    },
  });

  /**
   * 폴더명 변경 핸들러
   */
  const handleUpdateFolderName = () => {
    if (!newFolderName.trim()) {
      toast.error("폴더명을 입력해주세요.");
      return;
    }

    if (newFolderName === folder.name) {
      setIsEditMode(false);
      return;
    }

    updateFolderMutation.mutate({
      folderId: String(folder.id),
      name: newFolderName.trim(),
    });
  };

  /**
   * 폴더 삭제 핸들러
   */
  const handleDeleteFolder = () => {
    const isConfirmed = confirm(
      `'${folder.name}' 폴더를 삭제하시겠습니까?\n폴더 내의 모든 파일과 하위 폴더도 함께 삭제됩니다.`,
    );

    if (!isConfirmed) return;

    deleteFolderMutation.mutate(String(folder.id));
  };

  /**
   * Enter 키로 폴더명 변경
   */
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleUpdateFolderName();
    } else if (e.key === "Escape") {
      setIsEditMode(false);
      setNewFolderName(folder.name);
    }
  };

  return (
    <>
      <Dialog open={open && !showMoveDialog} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderIcon className="h-5 w-5" />
              폴더 관리
            </DialogTitle>
            <DialogDescription>
              폴더명 변경, 이동, 삭제 등의 작업을 수행할 수 있습니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 폴더명 표시/수정 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">폴더명</label>
              {isEditMode ? (
                <div className="flex gap-2">
                  <Input
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="폴더명을 입력하세요"
                    disabled={updateFolderMutation.isPending}
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={handleUpdateFolderName}
                    disabled={
                      !newFolderName.trim() || updateFolderMutation.isPending
                    }
                  >
                    {updateFolderMutation.isPending ? "저장 중..." : "저장"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsEditMode(false);
                      setNewFolderName(folder.name);
                    }}
                  >
                    취소
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span className="font-medium">{folder.name}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsEditMode(true)}
                    className="flex items-center gap-1"
                  >
                    <Edit2 className="h-4 w-4" />
                    수정
                  </Button>
                </div>
              )}
            </div>

            {/* 액션 버튼들 */}
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowMoveDialog(true)}
                className="flex items-center justify-start gap-2"
              >
                <MoveRight className="h-4 w-4" />
                폴더 이동
              </Button>

              <Button
                variant="destructive"
                onClick={handleDeleteFolder}
                disabled={deleteFolderMutation.isPending}
                className="flex items-center justify-start gap-2"
              >
                <Trash className="h-4 w-4" />
                {deleteFolderMutation.isPending ? "삭제 중..." : "폴더 삭제"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 폴더 이동 다이얼로그 */}
      {showMoveDialog && (
        <MoveFileDialog
          open={showMoveDialog}
          onClose={() => setShowMoveDialog(false)}
          selectedFiles={[]}
          onMoveComplete={() => {
            setShowMoveDialog(false);
            onUpdateComplete?.();
            onClose();
          }}
          movingFolderId={folder.id}
        />
      )}
    </>
  );
};

export default FolderManageDialog;
