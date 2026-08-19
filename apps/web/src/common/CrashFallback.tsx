import { useTranslation } from "../i18n/LocaleContext";

/**
 * React render xatosi ushlanganda (MonitoringErrorBoundary orqali)
 * oq ekran o'rniga ko'rsatiladigan do'stona fallback ekran.
 */
export function CrashFallback() {
  const { t } = useTranslation();
  return (
    <main className="page">
      <div className="error-banner" role="alert">
        <span>{t("common.crashed")}</span>
        <button type="button" onClick={() => window.location.reload()}>
          {t("common.reload")}
        </button>
      </div>
    </main>
  );
}
