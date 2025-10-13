import { createClient } from "@/utils/supabase/server";
import { findFolderByPath, getOrCreateUserRoot } from "@/utils/folder-system";
import { NextRequest, NextResponse } from "next/server";

/**
 * 폴더 이동 API
 * POST /api/folders/move
 * Body: { folderId: string, targetPath: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { folderId, targetPath } = body;

    if (!folderId) {
      return NextResponse.json(
        { error: "Folder ID is required" },
        { status: 400 },
      );
    }

    // 이동할 폴더 정보 확인
    const { data: folder } = await supabase
      .from("folders")
      .select("id, name, parent_id, user_id, is_system_folder")
      .eq("id", folderId)
      .eq("user_id", user.id)
      .single();

    if (!folder) {
      return NextResponse.json(
        { error: "Folder not found or permission denied" },
        { status: 404 },
      );
    }

    if (folder.is_system_folder) {
      return NextResponse.json(
        { error: "Cannot move system folder" },
        { status: 403 },
      );
    }

    // 대상 폴더 ID 결정
    let targetParentId: string;

    if (!targetPath || targetPath.trim() === "") {
      // 루트 폴더로 이동
      const rootFolder = await getOrCreateUserRoot(user.id);
      targetParentId = rootFolder.id;
    } else {
      // 경로로 대상 폴더 찾기
      const foundFolderId = await findFolderByPath(user.id, targetPath);

      if (!foundFolderId) {
        return NextResponse.json(
          {
            error: "Target folder not found",
            message: `경로 '${targetPath}'에 해당하는 폴더를 찾을 수 없습니다.`,
          },
          { status: 404 },
        );
      }

      // 자기 자신으로 이동 방지
      if (foundFolderId === folderId) {
        return NextResponse.json(
          { error: "Cannot move folder into itself" },
          { status: 400 },
        );
      }

      // 자기 하위 폴더로 이동 방지 (순환 참조 방지)
      const isDescendant = await checkIsDescendant(
        supabase,
        user.id,
        folderId,
        foundFolderId,
      );
      if (isDescendant) {
        return NextResponse.json(
          { error: "Cannot move folder into its own descendant" },
          { status: 400 },
        );
      }

      targetParentId = foundFolderId;
    }

    // 이미 같은 부모 폴더에 있으면 성공 반환
    if (folder.parent_id === targetParentId) {
      return NextResponse.json({
        success: true,
        data: folder,
        message: "Folder is already in the target location",
      });
    }

    // 대상 폴더에 같은 이름의 폴더가 있는지 확인
    const { data: duplicateFolder } = await supabase
      .from("folders")
      .select("id")
      .eq("user_id", user.id)
      .eq("parent_id", targetParentId)
      .eq("name", folder.name)
      .single();

    if (duplicateFolder) {
      return NextResponse.json(
        {
          error: "Duplicate folder name",
          message: "대상 폴더에 같은 이름의 폴더가 이미 존재합니다.",
        },
        { status: 400 },
      );
    }

    // 폴더 이동 (parent_id 변경)
    const { data: updatedFolder, error } = await supabase
      .from("folders")
      .update({ parent_id: targetParentId })
      .eq("id", folderId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("폴더 이동 오류:", error);
      return NextResponse.json(
        {
          error: "Failed to move folder",
          message: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedFolder,
    });
  } catch (error) {
    console.error("폴더 이동 오류:", error);
    return NextResponse.json(
      {
        error: "Failed to move folder",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * 폴더가 다른 폴더의 하위 폴더인지 확인하는 함수
 *
 * @param supabase - Supabase 클라이언트
 * @param userId - 사용자 ID
 * @param ancestorId - 상위 폴더 후보 ID
 * @param descendantId - 하위 폴더 후보 ID
 * @returns true if descendantId is a descendant of ancestorId
 */
async function checkIsDescendant(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  ancestorId: string,
  descendantId: string,
): Promise<boolean> {
  let currentId = descendantId;

  // 최대 10레벨까지만 확인 (무한 루프 방지)
  for (let i = 0; i < 10; i++) {
    const { data: folder } = await supabase
      .from("folders")
      .select("parent_id")
      .eq("id", currentId)
      .eq("user_id", userId)
      .single();

    if (!folder || !folder.parent_id) {
      // 루트에 도달했거나 폴더를 찾을 수 없음
      return false;
    }

    if (folder.parent_id === ancestorId) {
      // 하위 폴더임을 확인
      return true;
    }

    currentId = folder.parent_id;
  }

  return false;
}
