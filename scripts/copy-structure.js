#!/usr/bin/env node

/**
 * 업로드된 파일 구조 복사 스크립트
 * 
 * 사용법:
 * node scripts/copy-structure.js --source-user=USER_ID --target-user=USER_ID --target-path=/backup
 * 또는
 * node scripts/copy-structure.js --source-user=USER_ID --target-path=/backup (동일 사용자 내 복사)
 */

const fs = require('fs').promises;
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 환경 변수 확인
require('dotenv').config();

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다.');
  process.exit(1);
}

// Supabase 클라이언트 (서비스 롤 키 사용)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * 명령행 인수 파싱
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {};
  
  args.forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.substring(2).split('=');
      config[key] = value;
    }
  });
  
  return config;
}

/**
 * 사용자의 모든 폴더 구조 조회
 */
async function getUserFolders(userId) {
  const { data: folders, error } = await supabase
    .from('folders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
    
  if (error) throw error;
  return folders || [];
}

/**
 * 사용자의 모든 파일 조회
 */
async function getUserFiles(userId) {
  const { data: files, error } = await supabase
    .from('uploaded_files')
    .select('*')
    .eq('user_id', userId)
    .eq('upload_status', 'completed')
    .order('created_at', { ascending: true });
    
  if (error) throw error;
  return files || [];
}

/**
 * 폴더 ID 매핑 생성 (원본 -> 복사본)
 */
async function createFolderMapping(sourceFolders, targetUserId, targetBasePath) {
  const folderMapping = new Map();
  
  console.log(`📁 ${sourceFolders.length}개 폴더 구조 복사 중...`);
  
  // 부모 폴더부터 생성하기 위해 depth 순으로 정렬
  const sortedFolders = [...sourceFolders].sort((a, b) => a.depth - b.depth);
  
  for (let i = 0; i < sortedFolders.length; i++) {
    const folder = sortedFolders[i];
    
    // 진행률 표시
    const progress = Math.round(((i + 1) / sortedFolders.length) * 100);
    process.stdout.write(`\r폴더 생성 진행률: ${progress}% (${i + 1}/${sortedFolders.length})`);
    
    let newParentId = null;
    
    // 부모 폴더 ID 찾기
    if (folder.parent_id) {
      newParentId = folderMapping.get(folder.parent_id);
      if (!newParentId) {
        console.warn(`\n⚠️  부모 폴더를 찾을 수 없음: ${folder.name}`);
        continue;
      }
    }
    
    // 새 폴더 생성
    const { data: newFolder, error } = await supabase
      .from('folders')
      .insert({
        user_id: targetUserId,
        name: folder.name,
        parent_id: newParentId,
        is_system_folder: folder.is_system_folder,
        folder_color: folder.folder_color,
        description: folder.description,
      })
      .select()
      .single();
      
    if (error) {
      console.error(`\n❌ 폴더 생성 실패 (${folder.name}):`, error.message);
      continue;
    }
    
    folderMapping.set(folder.id, newFolder.id);
  }
  
  console.log('\n✅ 폴더 구조 복사 완료');
  return folderMapping;
}

/**
 * 물리적 파일 복사
 */
async function copyPhysicalFile(sourceFile, targetPath) {
  try {
    // 소스 파일이 존재하는지 확인
    await fs.access(sourceFile);
    
    // 타겟 디렉토리 생성
    const targetDir = path.dirname(targetPath);
    await fs.mkdir(targetDir, { recursive: true });
    
    // 파일 복사
    await fs.copyFile(sourceFile, targetPath);
    
    return true;
  } catch (error) {
    console.error(`❌ 파일 복사 실패: ${sourceFile} -> ${targetPath}`);
    console.error(`   오류: ${error.message}`);
    return false;
  }
}

/**
 * 파일 레코드 및 물리적 파일 복사
 */
async function copyFiles(sourceFiles, folderMapping, targetUserId, targetBasePath) {
  console.log(`\n📄 ${sourceFiles.length}개 파일 복사 중...`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < sourceFiles.length; i++) {
    const file = sourceFiles[i];
    
    // 진행률 표시
    const progress = Math.round(((i + 1) / sourceFiles.length) * 100);
    process.stdout.write(`\r파일 복사 진행률: ${progress}% (${i + 1}/${sourceFiles.length}) | 성공: ${successCount}, 실패: ${failCount}`);
    
    // 새 폴더 ID 찾기
    const newFolderId = folderMapping.get(file.folder_id);
    if (!newFolderId) {
      console.warn(`\n⚠️  대상 폴더를 찾을 수 없음: ${file.original_filename}`);
      failCount++;
      continue;
    }
    
    // 물리적 파일 경로 구성
    const sourceFilePath = path.join(process.cwd(), 'storage', file.file_path);
    const targetFileName = `${Date.now()}_${file.original_filename}`;
    const targetFilePath = path.join(targetBasePath, 'files', targetFileName);
    
    // 물리적 파일 복사
    const copySuccess = await copyPhysicalFile(sourceFilePath, targetFilePath);
    if (!copySuccess) {
      failCount++;
      continue;
    }
    
    // 데이터베이스 레코드 생성
    const { error } = await supabase
      .from('uploaded_files')
      .insert({
        user_id: targetUserId,
        folder_id: newFolderId,
        storage_folder_id: file.storage_folder_id, // 필요시 새로 생성
        original_filename: file.original_filename,
        display_filename: file.display_filename,
        file_path: path.relative(process.cwd(), targetFilePath).replace(/\\/g, '/'),
        storage_bucket: 'originals',
        file_size: file.file_size,
        mime_type: file.mime_type,
        file_type: file.file_type,
        has_thumbnail: false, // 썸네일은 복사하지 않음
        thumbnail_path: null,
        thumbnail_size: null,
        upload_status: 'completed',
        is_starred: file.is_starred,
        media_created_at: file.media_created_at,
      });
      
    if (error) {
      console.error(`\n❌ DB 레코드 생성 실패 (${file.original_filename}):`, error.message);
      // 복사된 물리적 파일 삭제
      try {
        await fs.unlink(targetFilePath);
      } catch (unlinkError) {
        console.error(`파일 삭제 실패: ${targetFilePath}`);
      }
      failCount++;
      continue;
    }
    
    successCount++;
  }
  
  console.log(`\n✅ 파일 복사 완료: 성공 ${successCount}개, 실패 ${failCount}개`);
  return { successCount, failCount };
}

/**
 * 메인 실행 함수
 */
async function main() {
  try {
    const config = parseArgs();
    
    // 필수 파라미터 확인
    if (!config['source-user']) {
      console.error('❌ --source-user 파라미터가 필요합니다.');
      console.log('\n사용법:');
      console.log('  node scripts/copy-structure.js --source-user=USER_ID --target-user=USER_ID --target-path=/backup');
      console.log('  node scripts/copy-structure.js --source-user=USER_ID --target-path=/backup');
      process.exit(1);
    }
    
    if (!config['target-path']) {
      console.error('❌ --target-path 파라미터가 필요합니다.');
      process.exit(1);
    }
    
    const sourceUserId = config['source-user'];
    const targetUserId = config['target-user'] || sourceUserId; // 지정되지 않으면 동일 사용자
    const targetBasePath = path.resolve(config['target-path']);
    
    console.log('🚀 파일 구조 복사를 시작합니다...');
    console.log(`📂 소스 사용자: ${sourceUserId}`);
    console.log(`📂 타겟 사용자: ${targetUserId}`);
    console.log(`📂 타겟 경로: ${targetBasePath}`);
    
    // 타겟 디렉토리 생성
    await fs.mkdir(targetBasePath, { recursive: true });
    await fs.mkdir(path.join(targetBasePath, 'files'), { recursive: true });
    
    // 1. 소스 사용자의 폴더 구조 조회
    console.log('\n📋 소스 데이터 조회 중...');
    const sourceFolders = await getUserFolders(sourceUserId);
    const sourceFiles = await getUserFiles(sourceUserId);
    
    console.log(`📁 폴더 ${sourceFolders.length}개 발견`);
    console.log(`📄 파일 ${sourceFiles.length}개 발견`);
    
    if (sourceFolders.length === 0 && sourceFiles.length === 0) {
      console.log('ℹ️  복사할 데이터가 없습니다.');
      return;
    }
    
    // 2. 폴더 구조 복사
    const folderMapping = await createFolderMapping(sourceFolders, targetUserId, targetBasePath);
    
    // 3. 파일 복사
    if (sourceFiles.length > 0) {
      const result = await copyFiles(sourceFiles, folderMapping, targetUserId, targetBasePath);
      
      console.log('\n📊 복사 결과 요약:');
      console.log(`  📁 폴더: ${sourceFolders.length}개 복사`);
      console.log(`  📄 파일: ${result.successCount}개 성공, ${result.failCount}개 실패`);
    }
    
    console.log('\n🎉 구조 복사가 완료되었습니다!');
    
  } catch (error) {
    console.error('\n💥 치명적 오류 발생:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  main();
}

module.exports = { main, parseArgs, copyPhysicalFile };