import { Moon, Sun } from 'lucide-react';

import { useT } from '@/shared/i18n';
import { useUiStore } from '@/shared/stores/useUiStore';

/** Sun/moon button, 44 px hit target, visible in both palettes. */
export const ThemeToggle = () => {
  const t = useT();
  const theme = useUiStore((state) => state.theme);
  const toggleTheme = useUiStore((state) => state.toggleTheme);
  const label = theme === 'dark' ? t.common.themeLight : t.common.themeDark;
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-line bg-surface-2 text-ink transition-colors hover:bg-line"
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
};
