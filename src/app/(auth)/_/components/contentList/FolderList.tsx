"use client";

import { Button } from "@/components/ui/button";
import { Folder } from "@/types/database";
import { EllipsisVertical, Folder as FolderIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import FolderManageDialog from "./dialogs/FolderManageDialog";

type FolderListProps = {
  folders: Folder[];
  currentPath: string;
  onUpdateComplete: () => void;
};

/**
 * 폴더 목록 컴포넌트
 * 폴더 카드와 관리 다이얼로그를 포함
 */
export default function FolderList({
  folders,
  currentPath,
  onUpdateComplete,
}: FolderListProps) {
  const [manageFolder, setManageFolder] = useState<Folder | null>(null);

  if (!folders || folders.length === 0) {
    return null;
  }

  return (
    <>
      <div className="mb-4">
        <h2 className="mb-3 text-lg font-semibold">폴더</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {folders.map((folder) => (
            <div
              key={folder.id}
              className="flex cursor-pointer items-center rounded-lg border p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-900"
            >
              <Link
                href={`/?path=${encodeURIComponent(
                  currentPath
                    ? `${currentPath}/${folder.name}`
                    : `/${folder.name}`,
                )}`}
                className="flex flex-1 items-center"
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
              <Button
                size="icon"
                className="size-7 text-gray-600 hover:cursor-pointer"
                variant={"outline"}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setManageFolder(folder);
                }}
                title="폴더 관리"
              >
                <EllipsisVertical />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* 폴더 관리 다이얼로그 */}
      {manageFolder && (
        <FolderManageDialog
          open={!!manageFolder}
          onClose={() => setManageFolder(null)}
          folder={manageFolder}
          onUpdateComplete={() => {
            setManageFolder(null);
            onUpdateComplete();
          }}
        />
      )}
    </>
  );
}
