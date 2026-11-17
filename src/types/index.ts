export type Language = 'mr' | 'en';
export type ThemeMode = 'light' | 'dark';

export interface Category {
  id: number;
  slug: string;
  nameMr: string;
  nameEn: string;
  descriptionMr: string;
  descriptionEn: string;
  sortOrder: number;
  articleCount?: number;
}

export interface ArticleTranslation {
  id?: number;
  articleId?: number;
  language: string;
  title: string;
  excerpt: string;
  content?: string;
  seoTitle?: string;
  seoDescription?: string;
  isPublished: boolean;
}

export interface ArticleSummary {
  id: number;
  slug: string;
  titleMr: string;
  excerptMr: string;
  featuredImageUrl: string;
  featuredImageAlt: string;
  categoryId: number | null;
  authorName: string;
  status?: 'draft' | 'published' | 'scheduled';
  isFeatured: boolean;
  isSample: boolean;
  readingTimeMinutes: number;
  publishedAt: string | null;
  scheduledAt?: string | null;
  appreciationCount: number;
  createdAt: string;
  updatedAt?: string;
  categorySlug: string | null;
  categoryNameMr: string | null;
  categoryNameEn: string | null;
  translationEn?: ArticleTranslation | null;
  hasEnglishTranslation?: boolean;
}

export interface ArticleTag {
  id: number;
  slug: string;
  nameMr: string;
  nameEn: string;
}

export interface ArticleComment {
  id: number;
  articleId?: number;
  authorName: string;
  authorEmail?: string;
  content: string;
  status?: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  articleTitleMr?: string | null;
  articleSlug?: string | null;
}

export interface ArticleDetail extends ArticleSummary {
  contentMr: string;
  seoTitleMr: string;
  seoDescriptionMr: string;
  tags: ArticleTag[];
  comments: ArticleComment[];
}

export interface MediaFile {
  id: number;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  altText: string;
  caption: string;
  url: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ContactMessage {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  isRead: boolean;
  isSpam: boolean;
  createdAt: string;
}

export interface ActivityLog {
  id: number;
  action: string;
  entityType: string;
  entityId: number | null;
  summary: string;
  createdAt: string;
}

export interface SiteSettingsMap {
  instagram_url?: string;
  linkedin_url?: string;
  contact_email?: string;
  journal_note_mr?: string;
  journal_note_en?: string;
  profile_image_url?: string;
  profile_image_alt?: string;
  brand_logo_url?: string;
  [key: string]: string | undefined;
}
