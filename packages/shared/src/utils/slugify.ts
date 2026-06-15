const CROATIAN_CHAR_MAP: Record<string, string> = {
  'č': 'c',
  'ć': 'c',
  'đ': 'd',
  'š': 's',
  'ž': 'z',
  'Č': 'c',
  'Ć': 'c',
  'Đ': 'd',
  'Š': 's',
  'Ž': 'z',
};

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[čćđšžČĆĐŠŽ]/g, (char) => CROATIAN_CHAR_MAP[char] || char)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');
}
