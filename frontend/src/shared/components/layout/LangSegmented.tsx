import { Segmented } from '@/shared/components/ui/Segmented';
import { useT } from '@/shared/i18n';
import { useUiStore, type UiLanguage } from '@/shared/stores/useUiStore';

/** "ES | EN" control for the interface language (independent from the room's word language). */
export const LangSegmented = () => {
  const t = useT();
  const lang = useUiStore((state) => state.lang);
  const setLang = useUiStore((state) => state.setLang);
  return (
    <Segmented<UiLanguage>
      size="sm"
      label={t.common.uiLanguage}
      value={lang}
      onChange={setLang}
      className="h-11 items-center rounded-[10px] border border-line bg-surface-2 p-0.5 gap-0.5!"
      options={[
        { value: 'es', label: 'ES', ariaLabel: t.common.language.es },
        { value: 'en', label: 'EN', ariaLabel: t.common.language.en },
      ]}
    />
  );
};
