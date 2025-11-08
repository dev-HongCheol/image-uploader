/**
 * 새로운 폴더 시스템 유틸리티 함수들
 *
 * 핵심 개념:
 * - 논리적 폴더: 사용자가 보는 폴더 구조 (folders 테이블)
 * - 물리적 폴더: 실제 파일이 저장되는 곳 (storage_folders 테이블)
 * - 파일 이동: 실제 파일은 그대로, DB의 folder_id만 변경
 */

import {
  BUCKET_NAMES,
  ROOT_FOLDER_NAME,
  DEFAULT_PAGE_SIZE,
} from "@/constants/common";
import type {
  Folder,
  FolderInsert,
  FolderTreeNode,
  StorageFolder,
  UploadedFile,
  UploadedFileInfo,
  UploadedFileInsert,
} from "@/types/database";
import { createClient } from "@/utils/supabase/server";

/**
 * 사용자의 루트 폴더를 가져오거나 생성하는 함수
 *
 * @param userId - 사용자 ID
 * @returns 루트 폴더 정보
 */
export async function getOrCreateUserRoot(userId: string): Promise<Folder> {
  const supabase = await createClient();

  // 기존 루트 폴더 조회
  let { data: rootFolder } = await supabase
    .from("folders")
    .select("*")
    .eq("user_id", userId)
    .is("parent_id", null)
    .eq("name", ROOT_FOLDER_NAME)
    .single();

  // 루트 폴더가 없으면 생성
  if (!rootFolder) {
    const { data: newFolder, error } = await supabase
      .from("folders")
      .insert({
        user_id: userId,
        name: ROOT_FOLDER_NAME,
        parent_id: null,
        is_system_folder: true,
      } satisfies FolderInsert)
      .select()
      .single();

    if (error) throw error;
    rootFolder = newFolder;
  }

  return rootFolder;
}

/**
 * 사용자가 새로운 논리적 폴더를 생성하는 함수
 *
 * @param userId - 사용자 ID
 * @param folderName - 생성할 폴더명
 * @param parentFolderId - 상위 폴더 ID (없으면 루트 폴더)
 * @param options - 폴더 생성 옵션
 * @returns 생성된 폴더 정보
 */
export async function createUserFolder(
  userId: string,
  folderName: string,
  parentFolderId?: string,
  options: {
    folderColor?: string;
    description?: string;
  } = {},
): Promise<Folder> {
  const supabase = await createClient();

  // 부모 폴더 결정 (없으면 루트 폴더)
  let parentId: string | null = null;
  let parentDepth = 0;

  if (parentFolderId) {
    // 부모 폴더 존재 여부 및 권한 확인
    const { data: parentFolder } = await supabase
      .from("folders")
      .select("id, depth, user_id")
      .eq("id", parentFolderId)
      .eq("user_id", userId)
      .single();

    if (!parentFolder) {
      throw new Error("Parent folder not found or permission denied");
    }

    parentId = parentFolder.id;
    parentDepth = parentFolder.depth;
  } else {
    // 부모 폴더가 지정되지 않으면 루트 폴더 하위에 생성
    const rootFolder = await getOrCreateUserRoot(userId);
    parentId = rootFolder.id;
    parentDepth = rootFolder.depth;
  }

  // 최대 깊이 체크 (10레벨까지)
  if (parentDepth >= 10) {
    throw new Error("Maximum folder depth exceeded");
  }

  // 같은 부모 폴더 내에서 중복 이름 체크
  const { data: existingFolder } = await supabase
    .from("folders")
    .select("id")
    .eq("user_id", userId)
    .eq("parent_id", parentId)
    .eq("name", folderName)
    .single();

  if (existingFolder) {
    throw new Error(
      "Folder with this name already exists in the parent directory",
    );
  }

  // 폴더명 유효성 검사
  if (!folderName.trim() || folderName.length > 255) {
    throw new Error("Invalid folder name");
  }

  if (folderName.includes("/") || folderName.includes("\\")) {
    throw new Error("Folder name cannot contain path separators");
  }

  // 새 폴더 생성
  const { data: newFolder, error } = await supabase
    .from("folders")
    .insert({
      user_id: userId,
      name: folderName.trim(),
      parent_id: parentId,
      is_system_folder: false, // 사용자가 만든 폴더
      folder_color: options.folderColor,
      description: options.description,
    } satisfies FolderInsert)
    .select()
    .single();

  if (error) {
    console.error("폴더 생성 오류:", error);
    throw new Error(`Failed to create folder: ${error.message}`);
  }

  return newFolder;
}

/**
 * 논리적 폴더 삭제 함수 (폴더 내 파일과 하위 폴더 모두 삭제)
 *
 * @param userId - 사용자 ID
 * @param folderId - 삭제할 폴더 ID
 * @param options - 삭제 옵션
 */
export async function deleteUserFolder(
  userId: string,
  folderId: string,
  options: {
    recursive?: boolean; // 하위 폴더도 함께 삭제
  } = {},
): Promise<void> {
  const supabase = await createClient();

  // 폴더 존재 여부 및 권한 확인
  const { data: folder } = await supabase
    .from("folders")
    .select("id, name, user_id, is_system_folder")
    .eq("id", folderId)
    .eq("user_id", userId)
    .single();

  if (!folder) {
    throw new Error("Folder not found or permission denied");
  }

  if (folder.is_system_folder) {
    throw new Error("Cannot delete system folder");
  }

  // 1. 폴더 내 파일 삭제 (DB + 스토리지)
  const { data: files } = await supabase
    .from("uploaded_files")
    .select("*")
    .eq("folder_id", folderId)
    .eq("user_id", userId);

  if (files && files.length > 0) {
    // 파일 경로 수집
    const originalFilePaths = files.map((file) => file.file_path);
    const thumbnailFilePaths = files
      .filter((file) => file.thumbnail_path)
      .map((file) => file.thumbnail_path!);

    // storage_folder별 집계
    const storageFolderUpdates = files.reduce(
      (acc, file) => {
        if (!acc[file.storage_folder_id]) {
          acc[file.storage_folder_id] = {
            count: 0,
            totalSize: 0,
          };
        }
        acc[file.storage_folder_id].count += 1;
        acc[file.storage_folder_id].totalSize += file.file_size;
        return acc;
      },
      {} as Record<string, { count: number; totalSize: number }>,
    );

    // DB에서 파일 레코드 삭제
    const { error: deleteFilesError } = await supabase
      .from("uploaded_files")
      .delete()
      .eq("folder_id", folderId)
      .eq("user_id", userId);

    if (deleteFilesError) {
      throw new Error(
        `Failed to delete files from database: ${deleteFilesError.message}`,
      );
    }

    // storage_folders 카운터 업데이트
    for (const [storageFolderId, update] of Object.entries(
      storageFolderUpdates,
    ) as [string, { count: number; totalSize: number }][]) {
      const { data: currentFolder } = await supabase
        .from("storage_folders")
        .select("file_count, total_size, max_file_count")
        .eq("id", storageFolderId)
        .single();

      if (currentFolder) {
        const newFileCount = Math.max(
          0,
          currentFolder.file_count - update.count,
        );
        const newTotalSize = Math.max(
          0,
          currentFolder.total_size - update.totalSize,
        );
        const isActive = newFileCount < currentFolder.max_file_count;

        await supabase
          .from("storage_folders")
          .update({
            file_count: newFileCount,
            total_size: newTotalSize,
            is_active: isActive,
          })
          .eq("id", storageFolderId);
      }
    }

    // 스토리지에서 원본 파일 삭제
    if (originalFilePaths.length > 0) {
      const { error: removeOriginalsError } = await supabase.storage
        .from(BUCKET_NAMES.ORIGINALS)
        .remove(originalFilePaths);

      if (removeOriginalsError) {
        console.warn("원본 파일 스토리지 삭제 실패:", removeOriginalsError);
      }
    }

    // 스토리지에서 썸네일 파일 삭제
    if (thumbnailFilePaths.length > 0) {
      const { error: removeThumbnailsError } = await supabase.storage
        .from(BUCKET_NAMES.THUMBNAILS)
        .remove(thumbnailFilePaths);

      if (removeThumbnailsError) {
        console.warn("썸네일 파일 스토리지 삭제 실패:", removeThumbnailsError);
      }
    }
  }

  // 2. 하위 폴더 재귀적 삭제
  const { data: subfolders } = await supabase
    .from("folders")
    .select("id")
    .eq("parent_id", folderId);

  if (subfolders && subfolders.length > 0) {
    if (!options.recursive) {
      throw new Error(
        "Cannot delete folder with subfolders. Use recursive option or delete subfolders first.",
      );
    }

    // 재귀적으로 하위 폴더 삭제 (하위 폴더의 파일도 모두 삭제됨)
    for (const subfolder of subfolders) {
      await deleteUserFolder(userId, subfolder.id, { recursive: true });
    }
  }

  // 3. 폴더 자체 삭제
  const { error } = await supabase
    .from("folders")
    .delete()
    .eq("id", folderId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to delete folder: ${error.message}`);
  }
}

/**
 * 논리적 폴더 정보 업데이트
 *
 * @param userId - 사용자 ID
 * @param folderId - 업데이트할 폴더 ID
 * @param updates - 업데이트할 정보
 */
export async function updateUserFolder(
  userId: string,
  folderId: string,
  updates: {
    name?: string;
    folderColor?: string;
    description?: string;
  },
): Promise<Folder> {
  const supabase = await createClient();

  // 폴더 존재 여부 및 권한 확인
  const { data: existingFolder } = await supabase
    .from("folders")
    .select("id, name, parent_id, user_id, is_system_folder")
    .eq("id", folderId)
    .eq("user_id", userId)
    .single();

  if (!existingFolder) {
    throw new Error("Folder not found or permission denied");
  }

  if (existingFolder.is_system_folder) {
    throw new Error("Cannot modify system folder");
  }

  // 이름 변경 시 중복 체크
  if (updates.name && updates.name !== existingFolder.name) {
    if (!updates.name.trim() || updates.name.length > 255) {
      throw new Error("Invalid folder name");
    }

    if (updates.name.includes("/") || updates.name.includes("\\")) {
      throw new Error("Folder name cannot contain path separators");
    }

    const { data: duplicateFolder } = await supabase
      .from("folders")
      .select("id")
      .eq("user_id", userId)
      .eq("parent_id", existingFolder.parent_id)
      .eq("name", updates.name.trim())
      .single();

    if (duplicateFolder) {
      throw new Error(
        "Folder with this name already exists in the parent directory",
      );
    }
  }

  // 폴더 정보 업데이트
  const { data: updatedFolder, error } = await supabase
    .from("folders")
    .update({
      ...(updates.name && { name: updates.name.trim() }),
      ...(updates.folderColor !== undefined && {
        folder_color: updates.folderColor,
      }),
      ...(updates.description !== undefined && {
        description: updates.description,
      }),
    })
    .eq("id", folderId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update folder: ${error.message}`);
  }

  return updatedFolder;
}

/**
 * 활성 저장 폴더를 가져오거나 새로 생성하는 함수
 *
 * @param userId - 사용자 ID
 * @returns 활성 저장 폴더 정보
 */
export async function getOrCreateActiveStorageFolder(
  userId: string,
): Promise<StorageFolder> {
  const supabase = await createClient();

  // 현재 활성 저장 폴더 조회 (파일 수가 max_file_count 미만인 폴더)
  let { data: activeFolder } = await supabase
    .from("storage_folders")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("folder_index", { ascending: false })
    .limit(1)
    .single();

  // 활성 폴더가 없으면 새 폴더 생성
  if (!activeFolder) {
    const { data: maxFolder } = await supabase
      .from("storage_folders")
      .select("folder_index")
      .eq("user_id", userId)
      .order("folder_index", { ascending: false })
      .limit(1)
      .single();

    const folderIndex = (maxFolder?.folder_index ?? -1) + 1;
    const storagePath = `${userId}/folder_${String(folderIndex).padStart(3, "0")}`;

    const { data: newFolder, error } = await supabase
      .from("storage_folders")
      .insert({
        user_id: userId,
        folder_index: folderIndex,
        storage_path: storagePath,
        file_count: 0,
        max_file_count: 1000,
        total_size: 0,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      // 중복 키 오류인 경우, 다시 활성 폴더 조회 시도
      if (error.code === "23505") {
        console.log("Race condition detected, retrying folder lookup...");
        const { data: retryFolder } = await supabase
          .from("storage_folders")
          .select("*")
          .eq("user_id", userId)
          .eq("is_active", true)
          .order("folder_index", { ascending: false })
          .limit(1)
          .single();

        if (retryFolder) {
          activeFolder = retryFolder;
        } else {
          // 여전히 없으면 원래 오류 던지기
          throw error;
        }
      } else {
        throw error;
      }
    } else {
      activeFolder = newFolder;
    }
  }

  return activeFolder;
}

/**
 * 저장 폴더에 대응하는 논리적 폴더를 가져오거나 생성하는 함수
 *
 * @param userId - 사용자 ID
 * @param storageFolder - 물리적 저장 폴더
 * @returns 대응하는 논리적 폴더
 */
export async function getOrCreateLogicalFolder(
  userId: string,
  storageFolder: StorageFolder,
): Promise<Folder> {
  const supabase = await createClient();

  // 루트 폴더 확인
  const rootFolder = await getOrCreateUserRoot(userId);

  // 저장 폴더에 대응하는 논리적 폴더명
  const folderName = `folder_${String(storageFolder.folder_index).padStart(3, "0")}`;
  const fullPath = `ROOT_FOLDER_NAME${folderName}`;

  // 기존 논리적 폴더 조회
  let { data: logicalFolder } = await supabase
    .from("folders")
    .select("*")
    .eq("user_id", userId)
    .eq("full_path", fullPath)
    .single();

  // 논리적 폴더가 없으면 생성
  if (!logicalFolder) {
    const { data: newFolder, error } = await supabase
      .from("folders")
      .insert({
        user_id: userId,
        name: folderName,
        parent_id: rootFolder.id,
        is_system_folder: true,
      } satisfies FolderInsert)
      .select()
      .single();

    if (error) throw error;
    logicalFolder = newFolder;
  }

  return logicalFolder;
}

/**
 * 저장 폴더의 파일 개수를 증가시키는 함수
 *
 * @param storageFolderId - 저장 폴더 ID
 * @param fileSize - 추가할 파일 크기
 */
export async function incrementStorageFolderCount(
  storageFolderId: string,
  fileSize: number,
): Promise<void> {
  const supabase = await createClient();

  const { data: currentFolder } = await supabase
    .from("storage_folders")
    .select("file_count, total_size, max_file_count")
    .eq("id", storageFolderId)
    .single();

  if (!currentFolder) throw new Error("Storage folder not found");

  const newFileCount = currentFolder.file_count + 1;
  const newTotalSize = currentFolder.total_size + fileSize;
  const isActive = newFileCount < currentFolder.max_file_count;

  await supabase
    .from("storage_folders")
    .update({
      file_count: newFileCount,
      total_size: newTotalSize,
      is_active: isActive,
    })
    .eq("id", storageFolderId);
}

/**
 * 파일을 다른 논리적 폴더로 이동하는 함수
 * (물리적 파일은 그대로, DB의 folder_id만 변경)
 *
 * @param fileId - 이동할 파일 ID
 * @param targetFolderId - 대상 폴더 ID
 * @param userId - 사용자 ID (권한 확인용)
 */
export async function moveFileToFolder(
  fileId: string,
  targetFolderId: string,
  userId: string,
): Promise<void> {
  const supabase = await createClient();

  // 파일과 대상 폴더의 소유권 확인
  const { data: file } = await supabase
    .from("uploaded_files")
    .select("user_id, folder_id")
    .eq("id", fileId)
    .single();

  const { data: targetFolder } = await supabase
    .from("folders")
    .select("user_id")
    .eq("id", targetFolderId)
    .single();

  if (!file || !targetFolder) {
    throw new Error("File or target folder not found");
  }

  if (file.user_id !== userId || targetFolder.user_id !== userId) {
    throw new Error("Permission denied");
  }

  // 파일의 논리적 폴더만 변경 (물리적 위치는 그대로)
  await supabase
    .from("uploaded_files")
    .update({ folder_id: targetFolderId })
    .eq("id", fileId);
}

/**
 * 사용자의 폴더 트리를 조회하는 함수
 *
 * @param userId - 사용자 ID
 * @param parentId - 상위 폴더 ID (null이면 루트부터)
 * @returns 폴더 트리 구조
 */
export async function getUserFolderTree(
  userId: string,
  parentId: string | null = null,
): Promise<FolderTreeNode[]> {
  const supabase = await createClient();

  // 사용자가 만든 논리적 폴더만 조회 (시스템 폴더 제외)
  let query = supabase
    .from("folder_tree_view") // 뷰 사용
    .select("*")
    .eq("user_id", userId)
    .eq("is_system_folder", false) // 시스템 폴더 제외
    .order("name");

  // parent_id가 null인 경우와 값이 있는 경우를 다르게 처리
  if (parentId === null) {
    query = query.is("parent_id", null);
  } else {
    query = query.eq("parent_id", parentId);
  }

  const { data: folders, error } = await query;
  if (error) {
    console.error("폴더 트리 조회 오류:", error);
    return [];
  }

  if (!folders) return [];

  // 재귀적으로 하위 폴더들도 조회
  const folderTree: FolderTreeNode[] = [];

  for (const folder of folders) {
    const children = await getUserFolderTree(userId, folder.id);

    folderTree.push({
      ...folder,
      children: children.length > 0 ? children : undefined,
      level: folder.depth,
      expanded: false, // 기본값
    });
  }

  return folderTree;
}

/**
 * 특정 폴더의 하위 폴더 목록을 조회하는 함수
 *
 * @param folderId - 부모 폴더 ID
 * @param userId - 사용자 ID
 * @returns 하위 폴더 목록
 */
export async function getFolders(
  folderId: string,
  userId: string,
): Promise<Folder[]> {
  const supabase = await createClient();

  const { data: folders, error } = await supabase
    .from("folders")
    .select("*")
    .eq("user_id", userId)
    .eq("parent_id", folderId)
    .eq("is_system_folder", false) // 사용자가 만든 폴더만
    .order("name", { ascending: true }); // 폴더는 이름순 정렬

  if (error) {
    console.error("하위 폴더 조회 오류:", error);
    throw error;
  }

  return folders || [];
}

/**
 * 특정 폴더의 파일 목록을 조회하는 함수
 *
 * @param folderId - 폴더 ID
 * @param userId - 사용자 ID
 * @param options - 조회 옵션
 * @returns 파일 목록
 */
export async function getFolderFiles(
  folderId: string,
  userId: string,
  options: {
    fileType?: "image" | "video" | "document" | "other";
    limit?: number;
    offset?: number;
    sortBy?: "created_at" | "name" | "size";
    sortOrder?: "asc" | "desc";
  } = {},
): Promise<UploadedFileInfo[]> {
  const supabase = await createClient();

  let query = supabase
    .from("uploaded_files")
    .select("*")
    .eq("user_id", userId)
    .eq("folder_id", folderId)
    .eq("upload_status", "completed");

  // 필터 적용
  if (options.fileType) {
    query = query.eq("file_type", options.fileType);
  }

  // 다단계 정렬 적용: 1차 촬영일, 2차 파일명, 3차 생성일
  query = query
    .order("media_created_at", { ascending: false, nullsFirst: false }) // 1차: 촬영일 (최신순, null은 마지막)
    .order("original_filename", { ascending: true }) // 2차: 파일명 (오름차순)
    .order("created_at", { ascending: false }); // 3차: 생성일 (최신순)

  // 페이지네이션 적용
  const limit = options.limit || DEFAULT_PAGE_SIZE;
  const offset = options.offset || 0;

  // range만 사용 (limit과 offset 모두 처리)
  query = query.range(offset, offset + limit - 1);

  const { data: files, error } = await query;
  if (error) throw error;

  if (!files || files.length === 0) {
    return [];
  }

  /**
   * 비디오도 썸네일을 지원하기 위해 가장 간단한 video태그의 preload="metadata"를 설정함.
   * 썸네일을 생성한 이미지 파일과 동일하게 파일 타입이 비디오 인 경우 원본 경로를 기반으로 접근 URL 생성
   * signedUrlMap 맵에 해당 컨텐츠의 id를 키로 signedURL추가 후 최종 리턴 객체에 추가
   */
  const signedUrlMap = new Map<string, string>();

  // 썸네일이 존재하는 파일만 필터
  const filesWithThumbnails: UploadedFile[] = files.filter(
    (file: UploadedFile) => file.thumbnail_path,
  );

  if (filesWithThumbnails.length !== 0) {
    const thumbnailPaths = filesWithThumbnails.map(
      (file: UploadedFile) => file.thumbnail_path,
    );

    const { data: thumbnailSignedURLs } = await supabase.storage
      .from(BUCKET_NAMES.THUMBNAILS)
      .createSignedUrls(thumbnailPaths as string[], 600);

    // signed URL을 파일과 매핑하기 위한 Map 생성

    if (thumbnailSignedURLs) {
      thumbnailSignedURLs.forEach((signedUrl, index) => {
        if (signedUrl?.signedUrl) {
          signedUrlMap.set(filesWithThumbnails[index].id, signedUrl.signedUrl);
        }
      });
    }
  }

  // create video signedURL
  const videoContents: UploadedFile[] = files.filter(
    (file) => file.file_type === "video",
  );

  if (videoContents.length !== 0) {
    const videoFilePaths = videoContents.map(
      (videoContent) => videoContent.file_path,
    );
    const { data: videoSignedURLs } = await supabase.storage
      .from(BUCKET_NAMES.ORIGINALS)
      .createSignedUrls(videoFilePaths, 600);

    if (videoSignedURLs) {
      videoSignedURLs.forEach((signedUrl, index) => {
        if (signedUrl?.signedUrl) {
          signedUrlMap.set(videoContents[index].id, signedUrl.signedUrl);
        }
      });
    }
  }

  // 모든 파일에 대해 해당하는 signed URL 설정
  return files.map((file: UploadedFile, index: number) => ({
    ...file,
    signedThumbnailUrl: file.thumbnail_path
      ? signedUrlMap.get(file.id) || null
      : file.file_type === "video"
        ? signedUrlMap.get(file.id) || null
        : null,
  }));
}

/**
 * 경로 문자열을 기반으로 폴더 ID를 찾는 함수
 * 경로 형식: "/test/bb/11" 또는 "test/bb/11"
 *
 * @param userId - 사용자 ID
 * @param pathString - 슬래시로 구분된 폴더 경로 문자열
 * @returns 해당 경로의 폴더 ID, 존재하지 않으면 null
 */
export async function findFolderByPath(
  userId: string,
  pathString: string,
): Promise<string | null> {
  if (!pathString || pathString.trim() === "") {
    return null;
  }

  const supabase = await createClient();

  // 앞뒤 슬래시 제거하고 경로를 분리
  const cleanPath = pathString.replace(/^\/+|\/+$/g, "");
  const pathSegments = cleanPath
    .split("/")
    .filter((segment) => segment.trim() !== "");

  if (pathSegments.length === 0) {
    return null;
  }

  // 루트 폴더부터 시작
  const rootFolder = await getOrCreateUserRoot(userId);
  let currentFolderId = rootFolder.id;

  // 각 경로 세그먼트를 순차적으로 탐색
  for (const folderName of pathSegments) {
    const { data: childFolder } = await supabase
      .from("folders")
      .select("id")
      .eq("user_id", userId)
      .eq("parent_id", currentFolderId)
      .eq("name", folderName.trim())
      .eq("is_system_folder", false) // 사용자가 만든 폴더만
      .single();

    if (!childFolder) {
      // 경로에 해당하는 폴더가 없음
      return null;
    }

    currentFolderId = childFolder.id;
  }

  return currentFolderId;
}

/**
 * 새로운 폴더 시스템을 위한 파일 업로드 정보 생성
 *
 * @param userId - 사용자 ID
 * @param file - 업로드할 파일 정보
 * @param uploadInfo - 업로드 결과 정보
 * @param targetFolderId - 업로드할 대상 폴더 ID (없으면 루트 폴더)
 * @returns 데이터베이스 insert용 객체
 */
export async function createFileRecord(
  userId: string,
  file: File,
  uploadInfo: {
    filePath: string;
    thumbnailPath?: string;
    thumbnailSize?: number;
    mediaCreatedAt?: string;
  },
  targetFolderId?: string,
): Promise<UploadedFileInsert> {
  // 활성 저장 폴더 가져오기 (물리적 저장용)
  const storageFolder = await getOrCreateActiveStorageFolder(userId);

  // 논리적 폴더 결정 (기본값: 루트 폴더)
  let logicalFolderId: string;
  if (targetFolderId) {
    // 드래그 앤 드롭 등으로 특정 폴더에 업로드하는 경우
    logicalFolderId = targetFolderId;
  } else {
    // 기본 업로드: 루트 폴더에 업로드
    const rootFolder = await getOrCreateUserRoot(userId);
    logicalFolderId = rootFolder.id;
  }

  // 파일 타입 결정
  const getFileType = (
    mimeType: string,
  ): "image" | "video" | "document" | "other" => {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("video/")) return "video";
    if (
      mimeType.includes("pdf") ||
      mimeType.includes("document") ||
      mimeType.includes("text/")
    )
      return "document";
    return "other";
  };

  return {
    user_id: userId,
    folder_id: logicalFolderId, // 논리적 폴더 위치 (루트 폴더 또는 지정된 폴더)
    storage_folder_id: storageFolder.id, // 물리적 저장 위치
    original_filename: file.name,
    display_filename: file.name, // 초기값은 원본 파일명
    file_path: uploadInfo.filePath,
    storage_bucket: "originals",
    file_size: file.size,
    mime_type: file.type,
    file_type: getFileType(file.type),
    has_thumbnail: !!uploadInfo.thumbnailPath,
    thumbnail_path: uploadInfo.thumbnailPath,
    thumbnail_size: uploadInfo.thumbnailSize,
    upload_status: "completed",
    is_starred: false,
    media_created_at: uploadInfo.mediaCreatedAt,
  };
}
