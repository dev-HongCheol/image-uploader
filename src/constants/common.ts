const BUCKET_NAMES = {
  ORIGINALS: "originals",
  THUMBNAILS: "thumbnails",
};

const FUNCTION_NAMES = {
  GENERATE_THUMBNAIL_JS: "generate-thumbnail-js",
  GENERATE_THUMBNAIL_MAGICK: "generate-thumbnail-magick",
};

const ROOT_FOLDER_NAME = "My Files";

/** 파일 목록 조회 시 한 번에 가져올 파일 개수 */
const DEFAULT_PAGE_SIZE = 20;

export { BUCKET_NAMES, FUNCTION_NAMES, ROOT_FOLDER_NAME, DEFAULT_PAGE_SIZE };
