export default function PushNotificationsPanel({
  push,
  onClose,
}) {
  return (
    <section
      id="push-reminder-settings-panel"
      role="dialog"
      aria-modal="false"
      aria-labelledby="push-reminder-settings-title"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
      }}
      aria-label="Push reminder settings"
      className="absolute right-0 top-full z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-md border border-line bg-surface p-4 text-left shadow-lg"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="push-reminder-settings-title" className="text-title font-bold">
            PUSH REMINDERS
          </h2>
          <p className="mt-2 text-meta leading-relaxed text-muted">
            할 일은 마감일 오전 9시, 캘린더 일정은 시작 10분 전에 알려드립니다.
            시간은 이 기기의 시간대를 기준으로 합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close push reminder settings"
          className="ui-icon-btn -mr-2 -mt-1 text-[18px] leading-none"
        >
          ×
        </button>
      </div>

      <p className="mt-3 rounded bg-canvas p-3 text-meta leading-relaxed text-muted">
        데스크톱 및 Android 브라우저에서 Web Push를 사용할 수 있습니다.
        iPhone 또는 iPad에서는 STATIC을 홈 화면에 추가한 뒤 앱으로 열어야
        합니다(iOS/iPadOS 16.4 이상). 일반 브라우저 탭에서는 푸시 알림을 받을
        수 없습니다. HTTPS 연결이 필요하며, 푸시 알림 전송을 위해 STATIC
        Supabase 스케줄러 설정도 필요합니다.
      </p>

      {push.permission === 'denied' && (
        <p className="mt-3 rounded border border-amber-300 bg-amber-50 p-2 text-meta text-amber-900">
          이 사이트의 알림이 차단되어 있습니다. 알림을 켜려면 먼저 브라우저
          설정에서 이 사이트의 알림을 허용해 주세요.
        </p>
      )}
      {push.error && (
        <p role="alert" className="mt-3 text-meta text-red-700">
          {push.error}
        </p>
      )}
      {push.status && (
        <p role="status" aria-live="polite" className="mt-3 text-meta text-muted">
          {push.status}
        </p>
      )}

      <button
        type="button"
        onClick={push.enabled ? push.disable : push.enable}
        disabled={!push.supported || push.loading}
        className="ui-btn ui-btn-primary mt-4 w-full"
      >
        {push.loading
          ? 'WORKING...'
          : push.enabled
            ? 'TURN OFF ON THIS DEVICE'
            : 'ENABLE PUSH REMINDERS'}
      </button>
    </section>
  );
}
