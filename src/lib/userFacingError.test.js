import test from 'node:test';
import assert from 'node:assert/strict';
import { getLocalizedErrorMessage } from './userFacingError.js';

test('localizes known service error codes and common network errors', () => {
  assert.equal(
    getLocalizedErrorMessage({ code: 'invalid_credentials' }),
    '이메일 또는 비밀번호가 올바르지 않습니다.',
  );
  assert.equal(
    getLocalizedErrorMessage(new Error('Failed to fetch')),
    '네트워크 연결을 확인하고 다시 시도해 주세요.',
  );
});

test('preserves Korean errors and uses the caller fallback for unknown English errors', () => {
  assert.equal(
    getLocalizedErrorMessage(new Error('기존 데이터 형식이 올바르지 않습니다.')),
    '기존 데이터 형식이 올바르지 않습니다.',
  );
  assert.equal(
    getLocalizedErrorMessage(new Error('An unknown service error'), '노트를 저장하지 못했습니다.'),
    '노트를 저장하지 못했습니다.',
  );
});
