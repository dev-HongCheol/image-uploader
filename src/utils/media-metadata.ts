/**
 * 미디어 파일(이미지, 동영상)에서 촬영/생성 일시를 추출하는 유틸리티
 */

import ExifReader from "exifreader";
import { parseBuffer } from "music-metadata";

/**
 * 이미지 파일에서 EXIF 촬영 일시를 추출
 *
 * @param file - 이미지 파일
 * @returns ISO 8601 형식의 촬영 일시 문자열 또는 null
 */
async function extractImageCreatedDate(file: File): Promise<string | null> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const tags = ExifReader.load(arrayBuffer);

    // EXIF 날짜 우선순위: DateTimeOriginal > CreateDate > DateTime
    const dateFields = ["DateTimeOriginal", "CreateDate", "DateTime"];

    for (const field of dateFields) {
      const dateTag = tags[field];
      if (dateTag?.description) {
        // EXIF 날짜 형식: "2024:01:15 14:30:45"
        const exifDate = dateTag.description;

        // ISO 8601 형식으로 변환: "2024-01-15T14:30:45"
        const isoDate = exifDate
          .replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3")
          .replace(" ", "T");

        // 유효한 날짜인지 확인
        const parsedDate = new Date(isoDate);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate.toISOString();
        }
      }
    }

    return null;
  } catch (error) {
    console.error("EXIF 추출 실패:", error);
    return null;
  }
}

/**
 * 동영상 파일에서 생성 일시를 추출
 *
 * @param file - 동영상 파일
 * @returns ISO 8601 형식의 생성 일시 문자열 또는 null
 */
async function extractVideoCreatedDate(file: File): Promise<string | null> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // music-metadata를 사용해서 동영상 메타데이터 추출
    const metadata = await parseBuffer(buffer, file.type);

    // 생성일 찾기 (다양한 필드 확인)
    const dateFields = [
      metadata.common.date,
      metadata.common.originaldate,
      metadata.format.creationTime,
    ];

    for (const dateField of dateFields) {
      if (dateField) {
        const date = new Date(dateField);
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      }
    }

    // QuickTime/Apple 특별 메타데이터 확인
    if (metadata.native && metadata.native.QuickTime) {
      const qtMetadata = metadata.native.QuickTime;
      for (const entry of qtMetadata) {
        if (entry.id === "IDAT" || entry.id === "CreationDate") {
          const date = new Date(entry.value as string);
          if (!isNaN(date.getTime())) {
            return date.toISOString();
          }
        }
      }
    }

    return null;
  } catch (error) {
    console.error("동영상 메타데이터 추출 실패:", error);
    return null;
  }
}

/**
 * 미디어 파일에서 촬영/생성 일시를 추출하는 통합 함수
 *
 * @param file - 미디어 파일
 * @returns ISO 8601 형식의 촬영/생성 일시 문자열 또는 null
 */
export async function extractMediaCreatedDate(
  file: File,
): Promise<string | null> {
  const mimeType = file.type.toLowerCase();

  let mediaDate: string | null = null;

  if (mimeType.startsWith("image/")) {
    mediaDate = await extractImageCreatedDate(file);
  } else if (mimeType.startsWith("video/")) {
    mediaDate = await extractVideoCreatedDate(file);
  }

  return mediaDate;
}
