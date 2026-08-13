import type { ReactNode } from "react";
import { useTranslation } from "../i18n/LocaleContext";

/** Barcha sahifalarda bir xil ko'rinishdagi "yuklanmoqda" holati. */
export function LoadingState() {
  const { t } = useTranslation();
  return (
    <p className="loading">
      <span className="spinner" aria-hidden="true" />
      {t("common.loading")}
    </p>
  );
}

/** Xato xabari — ixtiyoriy "Qayta urinish" tugmasi bilan. */
export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="error-banner" role="alert">
      <span>{message}</span>
      {onRetry && (
        <button type="button" onClick={onRetry}>
          {t("common.retry")}
        </button>
      )}
    </div>
  );
}

/** Ro'yxat bo'sh bo'lganda ko'rsatiladigan izoh matni. */
export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="empty-state">{children}</p>;
}
