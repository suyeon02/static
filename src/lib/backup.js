import { supabase } from './supabase';
import { getLocalizedErrorMessage } from './userFacingError';

const BUCKET = 'my-desk-files';
const PAGE_SIZE = 500;
const BACKUP_VERSION = 1;
const DATA_FILES = {
  note_folders: 'data/note_folders.json',
  notes: 'data/notes.json',
  tasks: 'data/tasks.json',
  events: 'data/events.json',
  projects: 'data/projects.json',
  bookmarks: 'data/bookmarks.json',
  trash_items: 'data/trash_items.json',
  local: 'data/local.json',
};
const DATABASE_TABLES = [
  'note_folders',
  'notes',
  'tasks',
  'events',
  'projects',
  'bookmarks',
  'trash_items',
];
const STORAGE_PAGE_SIZE = 100;

function report(onProgress, category, progress) {
  onProgress?.(category, progress);
}

function isSafeRelativePath(path) {
  return (
    typeof path === 'string' &&
    path.length > 0 &&
    !path.startsWith('/') &&
    !path.includes('\\') &&
    path.split('/').every(
      (segment) =>
        segment.length > 0 &&
        segment !== '.' &&
        segment !== '..' &&
        !segment.includes(':'),
    )
  );
}

function getRelativeStoragePath(userId, path) {
  const prefix = `${userId}/`;
  if (!path.startsWith(prefix)) {
    throw new Error('저장소에서 현재 로그인한 계정 폴더 외부의 파일을 반환했습니다.');
  }
  const relativePath = path.slice(prefix.length);
  if (!isSafeRelativePath(relativePath)) {
    throw new Error('저장소에서 허용되지 않는 파일 경로를 반환했습니다.');
  }
  return relativePath;
}

async function assertSignedInUser(userId) {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session?.user || data.session.user.id !== userId) {
    throw new Error('로그인 계정이 변경되어 백업 작업을 중단했습니다.');
  }
}

async function loadTableRows(table) {
  const rows = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    const page = data || [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

async function listStorageObjects(userId) {
  const objects = [];

  async function listDirectory(directory) {
    const entries = [];
    for (let offset = 0; ; offset += STORAGE_PAGE_SIZE) {
      const { data, error } = await supabase.storage.from(BUCKET).list(directory, {
        limit: STORAGE_PAGE_SIZE,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      });
      if (error) throw error;
      const page = data || [];
      entries.push(...page);
      if (page.length < STORAGE_PAGE_SIZE) break;
    }

    for (const entry of entries) {
      if (!entry.name || !isSafeRelativePath(entry.name)) {
        throw new Error('저장소에서 허용되지 않는 파일 이름을 반환했습니다.');
      }
      const path = `${directory}/${entry.name}`;
      if (entry.id) {
        const relativePath = getRelativeStoragePath(userId, path);
        objects.push({
          path: relativePath,
          originalName:
            typeof entry.metadata?.originalName === 'string'
              ? entry.metadata.originalName
              : entry.name,
          contentType:
            typeof entry.metadata?.mimetype === 'string'
              ? entry.metadata.mimetype
              : 'application/octet-stream',
        });
      } else {
        if (path.split('/').some((part) => !part)) {
          throw new Error('저장소에서 허용되지 않는 폴더 이름을 반환했습니다.');
        }
        await listDirectory(path);
      }
    }
  }

  await listDirectory(userId);
  return objects;
}

export async function createBackupZip({
  userId,
  memoText,
  quickMemos,
  onProgress,
}) {
  const { strToU8, zipSync } = await import('fflate');
  await assertSignedInUser(userId);
  const zipFiles = {};
  const manifest = {
    app: 'MY DESK',
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    dataFiles: DATA_FILES,
    files: [],
  };

  for (const table of DATABASE_TABLES) {
    report(onProgress, table, { status: 'working', message: 'Reading data…' });
    try {
      const rows = await loadTableRows(table);
      zipFiles[DATA_FILES[table]] = strToU8(JSON.stringify(rows));
      report(onProgress, table, {
        status: 'done',
        count: rows.length,
        message: `${rows.length} records`,
      });
    } catch (error) {
      const errorMessage = getLocalizedErrorMessage(error, '다시 시도해 주세요.');
      report(onProgress, table, { status: 'error', message: errorMessage });
      throw new Error(`${table} 데이터: ${errorMessage}`);
    }
  }

  const localData = { static_memo: memoText, static_quick_memos: quickMemos };
  zipFiles[DATA_FILES.local] = strToU8(JSON.stringify(localData));
  report(onProgress, 'static_memo', {
    status: 'done',
    count: Number(Boolean(memoText)),
    message: `${Number(Boolean(memoText))} memo`,
  });
  report(onProgress, 'static_quick_memos', {
    status: 'done',
    count: quickMemos.length,
    message: `${quickMemos.length} quick memos`,
  });

  report(onProgress, 'files', { status: 'working', message: 'Listing files…' });
  let objects;
  try {
    objects = await listStorageObjects(userId);
  } catch (error) {
    const errorMessage = getLocalizedErrorMessage(error, '다시 시도해 주세요.');
    report(onProgress, 'files', { status: 'error', message: errorMessage });
    throw new Error(`파일: ${errorMessage}`);
  }

  for (let index = 0; index < objects.length; index += 1) {
    const object = objects[index];
    report(onProgress, 'files', {
      status: 'working',
      done: index,
      total: objects.length,
      message: `Downloading ${index + 1} of ${objects.length}`,
    });
    try {
      await assertSignedInUser(userId);
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .download(`${userId}/${object.path}`);
      if (error) throw error;
      zipFiles[`files/${object.path}`] = new Uint8Array(await data.arrayBuffer());
      manifest.files.push({
        ...object,
        archivePath: `files/${object.path}`,
      });
    } catch (error) {
      const errorMessage = getLocalizedErrorMessage(error, '다시 시도해 주세요.');
      report(onProgress, 'files', { status: 'error', message: errorMessage });
      throw new Error(`파일 ${object.originalName}: ${errorMessage}`);
    }
  }
  report(onProgress, 'files', {
    status: 'done',
    count: objects.length,
    message: `${objects.length} files`,
  });

  zipFiles['manifest.json'] = strToU8(JSON.stringify(manifest, null, 2));
  const bytes = zipSync(zipFiles, { level: 6 });
  return new Blob([bytes], { type: 'application/zip' });
}

function parseJsonFile(archive, path, strFromU8) {
  const bytes = archive[path];
  if (!(bytes instanceof Uint8Array)) {
    throw new Error(`백업에 ${path} 파일이 없습니다.`);
  }
  try {
    return JSON.parse(strFromU8(bytes));
  } catch {
    throw new Error(`${path} 파일이 올바른 JSON 형식이 아닙니다.`);
  }
}

function validateDataRows(rows, category) {
  if (!Array.isArray(rows)) throw new Error(`${category} 항목은 배열이어야 합니다.`);
  return rows.map((row, index) => {
    if (
      !row ||
      typeof row !== 'object' ||
      Array.isArray(row) ||
      (typeof row.id !== 'string' && typeof row.id !== 'number') ||
      (typeof row.id === 'number' && !Number.isFinite(row.id)) ||
      String(row.id).length === 0
    ) {
      throw new Error(`${category} ${index + 1}번째 항목의 ID 또는 형식이 올바르지 않습니다.`);
    }
    if (Object.keys(row).some((key) => ['__proto__', 'prototype', 'constructor'].includes(key))) {
      throw new Error(`${category} ${index + 1}번째 항목에 허용되지 않는 필드가 있습니다.`);
    }
    return row;
  });
}

function validateArchive(archive, strFromU8) {
  const manifest = parseJsonFile(archive, 'manifest.json', strFromU8);
  if (
    !manifest ||
    manifest.app !== 'MY DESK' ||
    manifest.version !== BACKUP_VERSION ||
    !manifest.dataFiles ||
    !Array.isArray(manifest.files)
  ) {
    throw new Error('지원되는 MY DESK 백업 파일(버전 1)이 아닙니다.');
  }

  for (const [category, expectedPath] of Object.entries(DATA_FILES)) {
    if (manifest.dataFiles[category] !== expectedPath) {
      throw new Error(`백업 매니페스트에 ${category} 데이터 파일이 없습니다.`);
    }
  }

  const expectedPaths = new Set(['manifest.json', ...Object.values(DATA_FILES)]);
  const filePaths = new Set();
  for (const [index, file] of manifest.files.entries()) {
    if (
      !file ||
      typeof file !== 'object' ||
      !isSafeRelativePath(file.path) ||
      typeof file.originalName !== 'string' ||
      !file.originalName ||
      typeof file.contentType !== 'string' ||
      file.archivePath !== `files/${file.path}` ||
      filePaths.has(file.path)
    ) {
      throw new Error(`저장소 파일 ${index + 1}번째 항목의 형식이 잘못되었거나 허용되지 않습니다.`);
    }
    filePaths.add(file.path);
    expectedPaths.add(file.archivePath);
  }

  for (const path of Object.keys(archive)) {
    if (path.includes('\\') || path.startsWith('/')) {
      throw new Error('ZIP 파일에 허용되지 않는 경로가 있습니다.');
    }
    if (path.endsWith('/')) {
      const parent = path.slice(0, -1);
      if (!['data', 'files'].includes(parent)) {
        throw new Error(`ZIP 파일에 예상하지 못한 폴더가 있습니다: ${path}`);
      }
      continue;
    }
    if (!isSafeRelativePath(path) || !expectedPaths.has(path)) {
      throw new Error(`ZIP 파일에 예상하지 못했거나 허용되지 않는 항목이 있습니다: ${path}`);
    }
  }

  const data = {};
  for (const [category, path] of Object.entries(DATA_FILES)) {
    data[category] = parseJsonFile(archive, path, strFromU8);
  }
  for (const table of DATABASE_TABLES) {
    data[table] = validateDataRows(data[table], table);
  }
  if (
    !data.local ||
    typeof data.local !== 'object' ||
    typeof data.local.static_memo !== 'string' ||
    !Array.isArray(data.local.static_quick_memos) ||
    data.local.static_quick_memos.some(
      (memo) =>
        !memo ||
        typeof memo !== 'object' ||
        (typeof memo.id !== 'string' && typeof memo.id !== 'number') ||
        typeof memo.content !== 'string',
    )
  ) {
    throw new Error('로컬 메모 데이터 형식이 올바르지 않습니다.');
  }

  for (const file of manifest.files) {
    if (!(archive[file.archivePath] instanceof Uint8Array)) {
      throw new Error(`ZIP 파일에 ${file.originalName}의 저장 데이터가 없습니다.`);
    }
  }
  return { manifest, data };
}

async function loadExistingIds(table) {
  const ids = new Set();
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select('id')
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    const page = data || [];
    for (const row of page) ids.add(String(row.id));
    if (page.length < PAGE_SIZE) return ids;
  }
}

async function importTable(table, rows, userId, onProgress) {
  report(onProgress, table, {
    status: 'working',
    done: 0,
    total: rows.length,
    message: `Importing ${rows.length} records…`,
  });
  const result = { imported: 0, skipped: 0, errors: [] };
  try {
    await assertSignedInUser(userId);
    const existingIds = await loadExistingIds(table);
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const id = String(row.id);
      if (existingIds.has(id)) {
        result.skipped += 1;
      } else {
        try {
          await assertSignedInUser(userId);
          const importRow = { ...row };
          if (Object.prototype.hasOwnProperty.call(importRow, 'user_id')) {
            importRow.user_id = userId;
          }
          const { error } = await supabase.from(table).insert(importRow);
          if (error) throw error;
          existingIds.add(id);
          result.imported += 1;
        } catch (error) {
          result.errors.push(
            `ID ${id}: ${getLocalizedErrorMessage(error, '가져오지 못했습니다.')}`,
          );
        }
      }
      report(onProgress, table, {
        status: 'working',
        done: index + 1,
        total: rows.length,
        message: `${index + 1} of ${rows.length}`,
      });
    }
  } catch (error) {
    result.errors.push(getLocalizedErrorMessage(error, '다시 시도해 주세요.'));
  }
  report(onProgress, table, {
    status: result.errors.length ? 'error' : 'done',
    ...result,
    message: result.errors.length
      ? `${result.imported}개 가져옴, ${result.skipped}개 유지, 오류 ${result.errors.length}건`
      : `${result.imported} imported, ${result.skipped} kept, ${result.errors.length} errors`,
  });
  return result;
}

function mergeLocalMemos(data, memoText, quickMemos, setMemoText, setQuickMemos, onProgress) {
  const result = {};
  const nextMemoText = memoText || data.static_memo;
  try {
    localStorage.setItem('static_memo', nextMemoText);
    setMemoText(nextMemoText);
    result.static_memo = {
      imported: memoText ? 0 : Number(Boolean(data.static_memo)),
      skipped: memoText ? Number(Boolean(data.static_memo)) : 0,
      errors: [],
    };
  } catch (error) {
    result.static_memo = {
      imported: 0,
      skipped: 0,
      errors: [getLocalizedErrorMessage(error, '다시 시도해 주세요.')],
    };
  }
  report(onProgress, 'static_memo', {
    status: result.static_memo.errors.length ? 'error' : 'done',
    ...result.static_memo,
    message: result.static_memo.errors[0] || '기존 메모가 있으면 유지합니다.',
  });

  const existing = new Set(quickMemos.map((memo) => String(memo.id)));
  const additions = data.static_quick_memos.filter((memo) => {
    const key = String(memo.id);
    if (existing.has(key)) return false;
    existing.add(key);
    return true;
  });
  const mergedMemos = [...quickMemos, ...additions];
  try {
    localStorage.setItem('static_quick_memos', JSON.stringify(mergedMemos));
    setQuickMemos(mergedMemos);
    result.static_quick_memos = {
      imported: additions.length,
      skipped: data.static_quick_memos.length - additions.length,
      errors: [],
    };
  } catch (error) {
    result.static_quick_memos = {
      imported: 0,
      skipped: 0,
      errors: [getLocalizedErrorMessage(error, '다시 시도해 주세요.')],
    };
  }
  report(onProgress, 'static_quick_memos', {
    status: result.static_quick_memos.errors.length ? 'error' : 'done',
    ...result.static_quick_memos,
    message: `${result.static_quick_memos.imported}개 추가, ${result.static_quick_memos.skipped}개 유지`,
  });
  return result;
}

async function importStorageFiles(files, archive, userId, onProgress) {
  const result = { imported: 0, skipped: 0, errors: [] };
  report(onProgress, 'files', {
    status: 'working',
    done: 0,
    total: files.length,
    message: '기존 파일 확인 중…',
  });
  try {
    await assertSignedInUser(userId);
    const existing = new Set();
    const objects = await listStorageObjects(userId);
    objects.forEach((object) => existing.add(object.path));
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      if (existing.has(file.path)) {
        result.skipped += 1;
      } else {
        try {
          await assertSignedInUser(userId);
          const { error } = await supabase.storage.from(BUCKET).upload(
            `${userId}/${file.path}`,
            archive[file.archivePath],
            {
              upsert: false,
              contentType: file.contentType,
              metadata: { originalName: file.originalName },
            },
          );
          if (error) throw error;
          existing.add(file.path);
          result.imported += 1;
        } catch (error) {
          result.errors.push(
            `${file.originalName}: ${getLocalizedErrorMessage(error, '가져오지 못했습니다.')}`,
          );
        }
      }
      report(onProgress, 'files', {
        status: 'working',
        done: index + 1,
        total: files.length,
        message: `${index + 1} of ${files.length}`,
      });
    }
  } catch (error) {
    result.errors.push(getLocalizedErrorMessage(error, '다시 시도해 주세요.'));
  }
  report(onProgress, 'files', {
    status: result.errors.length ? 'error' : 'done',
    ...result,
    message: result.errors.length
      ? `${result.imported}개 가져옴, ${result.skipped}개 유지, 오류 ${result.errors.length}건`
      : `${result.imported} imported, ${result.skipped} kept, ${result.errors.length} errors`,
  });
  return result;
}

export async function restoreBackupZip({
  file,
  userId,
  memoText,
  quickMemos,
  setMemoText,
  setQuickMemos,
  onProgress,
}) {
  const { strFromU8, unzipSync } = await import('fflate');
  await assertSignedInUser(userId);
  report(onProgress, 'archive', { status: 'working', message: 'Validating ZIP…' });
  let archive;
  let validated;
  try {
    archive = unzipSync(new Uint8Array(await file.arrayBuffer()));
    validated = validateArchive(archive, strFromU8);
    report(onProgress, 'archive', {
      status: 'done',
      message: 'Manifest and entries validated',
    });
  } catch (error) {
    report(onProgress, 'archive', {
      status: 'error',
      message: getLocalizedErrorMessage(error, '백업 파일을 확인하지 못했습니다.'),
    });
    throw error;
  }

  const results = {};
  for (const table of DATABASE_TABLES) {
    results[table] = await importTable(
      table,
      validated.data[table],
      userId,
      onProgress,
    );
  }
  const localResults = mergeLocalMemos(
    validated.data.local,
    memoText,
    quickMemos,
    setMemoText,
    setQuickMemos,
    onProgress,
  );
  results.static_memo = localResults.static_memo;
  results.static_quick_memos = localResults.static_quick_memos;
  results.files = await importStorageFiles(
    validated.manifest.files,
    archive,
    userId,
    onProgress,
  );
  return results;
}
