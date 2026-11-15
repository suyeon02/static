const ERROR_CODE_MESSAGES = {
  '23505': '이미 등록된 항목입니다.',
  '42501': '이 작업을 수행할 권한이 없습니다.',
  PGRST116: '요청한 항목을 찾을 수 없습니다.',
  email_not_confirmed: '이메일 인증 후 로그인해 주세요.',
  email_exists: '이미 가입된 이메일입니다.',
  invalid_credentials: '이메일 또는 비밀번호가 올바르지 않습니다.',
  over_request_rate_limit: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
  signup_disabled: '현재 회원가입을 사용할 수 없습니다.',
  too_many_requests: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
  user_already_exists: '이미 가입된 이메일입니다.',
  weak_password: '비밀번호가 보안 기준에 맞지 않습니다.',
};

const FALLBACK_MESSAGE = '요청을 처리하지 못했습니다. 다시 시도해 주세요.';

export function getLocalizedErrorMessage(error, fallback = FALLBACK_MESSAGE) {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String(error.code)
      : '';
  if (Object.prototype.hasOwnProperty.call(ERROR_CODE_MESSAGES, code)) {
    return ERROR_CODE_MESSAGES[code];
  }

  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';
  if (!message) return fallback;
  if (/[가-힣]/.test(message)) return message;
  if (/invalid login credentials|invalid credentials/i.test(message)) {
    return ERROR_CODE_MESSAGES.invalid_credentials;
  }
  if (/email.*not confirmed/i.test(message)) {
    return ERROR_CODE_MESSAGES.email_not_confirmed;
  }
  if (/already (registered|exists)|user already registered/i.test(message)) {
    return ERROR_CODE_MESSAGES.email_exists;
  }
  if (/weak password|password.*too short/i.test(message)) {
    return ERROR_CODE_MESSAGES.weak_password;
  }
  if (/signup.*disabled|signups.*not allowed/i.test(message)) {
    return ERROR_CODE_MESSAGES.signup_disabled;
  }
  if (/too many requests|rate limit/i.test(message)) {
    return ERROR_CODE_MESSAGES.too_many_requests;
  }
  if (/duplicate key|unique constraint/i.test(message)) {
    return ERROR_CODE_MESSAGES['23505'];
  }
  if (/permission denied|not authorized|row-level security/i.test(message)) {
    return ERROR_CODE_MESSAGES['42501'];
  }
  if (/failed to fetch|networkerror|network request failed/i.test(message)) {
    return '네트워크 연결을 확인하고 다시 시도해 주세요.';
  }
  if (/invalid key/i.test(message)) {
    return '잘못된 파일 저장 경로입니다.';
  }
  return fallback;
}
