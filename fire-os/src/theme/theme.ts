export const colors = {
  bg: '#F7F7F8',
  panel: '#FFFFFF',
  panel2: '#FDECEC',
  red: '#D71920',
  redSoft: '#EF4444',
  text: '#171717',
  muted: '#666666',
  line: '#E2E2E5',
  success: '#16803C',
  warning: '#B45309',
};

export type ThemeMode = 'light' | 'dark';

export function applyTheme(mode: ThemeMode) {
  const palette = mode === 'dark' ? {
    bg: '#111111', panel: '#1D1D1D', panel2: '#351719', red: '#FF4B55', redSoft: '#FF626B',
    text: '#F5F5F5', muted: '#B8B8B8', line: '#3A3A3A', success: '#58C783', warning: '#F2B45D',
  } : {
    bg: '#F7F7F8', panel: '#FFFFFF', panel2: '#FDECEC', red: '#D71920', redSoft: '#EF4444',
    text: '#171717', muted: '#666666', line: '#E2E2E5', success: '#16803C', warning: '#B45309',
  };
  Object.assign(colors, palette);
}
