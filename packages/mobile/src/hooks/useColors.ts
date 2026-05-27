import { useThemeStore } from '@/store/theme';
import { colors } from '@/utils/theme';

export function useColors() {
  const { dark } = useThemeStore();
  return dark ? colors.dark : colors.light;
}
