import heroJournalImg from '../assets/images/hero_journal_morning_1794570847641.jpg';
import diaryFlowersImg from '../assets/images/diary_gratitude_flowers_1794570849341.jpg';
import aboutWindowImg from '../assets/images/about_quiet_window_1794570848576.jpg';
import naturePathImg from '../assets/images/nature_reflection_path_1794570857248.jpg';

export const EDITORIAL_IMAGES = {
  heroJournal: heroJournalImg,
  diaryFlowers: diaryFlowersImg,
  aboutWindow: aboutWindowImg,
  naturePath: naturePathImg,
};

const ASSET_PATH_MAP: Record<string, string> = {
  '/src/assets/images/hero_journal_morning_1794570847641.jpg': heroJournalImg,
  '/src/assets/images/diary_gratitude_flowers_1794570849341.jpg': diaryFlowersImg,
  '/src/assets/images/about_quiet_window_1794570848576.jpg': aboutWindowImg,
  '/src/assets/images/nature_reflection_path_1794570857248.jpg': naturePathImg,
};

export function resolveAssetUrl(src?: string | null): string {
  const trimmed = typeof src === 'string' ? src.trim() : '';
  if (!trimmed) return '';
  return ASSET_PATH_MAP[trimmed] || trimmed;
}
