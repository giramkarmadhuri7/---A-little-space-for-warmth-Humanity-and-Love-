import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const adminUsers = pgTable('admin_users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull().unique(),
  displayName: text('display_name').notNull().default('माधुरी'),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('admin'),
  isActive: boolean('is_active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  nameMr: text('name_mr').notNull(),
  nameEn: text('name_en').notNull(),
  descriptionMr: text('description_mr').notNull().default(''),
  descriptionEn: text('description_en').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const articles = pgTable('articles', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  titleMr: text('title_mr').notNull(),
  excerptMr: text('excerpt_mr').notNull().default(''),
  contentMr: text('content_mr').notNull(),
  featuredImageUrl: text('featured_image_url').notNull().default(''),
  featuredImageAlt: text('featured_image_alt').notNull().default(''),
  categoryId: integer('category_id').references(() => categories.id, {
    onDelete: 'set null',
  }),
  authorId: integer('author_id').references(() => adminUsers.id, {
    onDelete: 'set null',
  }),
  authorName: text('author_name').notNull().default('माधुरी'),
  status: text('status').notNull().default('draft'), // 'draft' | 'published' | 'scheduled'
  isFeatured: boolean('is_featured').notNull().default(false),
  isSample: boolean('is_sample').notNull().default(false),
  readingTimeMinutes: integer('reading_time_minutes').notNull().default(3),
  seoTitleMr: text('seo_title_mr').notNull().default(''),
  seoDescriptionMr: text('seo_description_mr').notNull().default(''),
  publishedAt: timestamp('published_at'),
  scheduledAt: timestamp('scheduled_at'),
  appreciationCount: integer('appreciation_count').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const articleTranslations = pgTable(
  'article_translations',
  {
    id: serial('id').primaryKey(),
    articleId: integer('article_id')
      .references(() => articles.id, { onDelete: 'cascade' })
      .notNull(),
    language: text('language').notNull().default('en'),
    title: text('title').notNull(),
    excerpt: text('excerpt').notNull().default(''),
    content: text('content').notNull(),
    seoTitle: text('seo_title').notNull().default(''),
    seoDescription: text('seo_description').notNull().default(''),
    isPublished: boolean('is_published').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('article_translations_article_lang_idx').on(
      table.articleId,
      table.language
    ),
  ]
);

export const tags = pgTable('tags', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  nameMr: text('name_mr').notNull(),
  nameEn: text('name_en').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const articleTags = pgTable(
  'article_tags',
  {
    id: serial('id').primaryKey(),
    articleId: integer('article_id')
      .references(() => articles.id, { onDelete: 'cascade' })
      .notNull(),
    tagId: integer('tag_id')
      .references(() => tags.id, { onDelete: 'cascade' })
      .notNull(),
  },
  (table) => [
    uniqueIndex('article_tags_unique_idx').on(table.articleId, table.tagId),
  ]
);

export const mediaFiles = pgTable('media_files', {
  id: serial('id').primaryKey(),
  filename: text('filename').notNull(),
  originalName: text('original_name').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  altText: text('alt_text').notNull().default(''),
  caption: text('caption').notNull().default(''),
  dataBase64: text('data_base64').notNull(),
  uploadedById: integer('uploaded_by_id').references(() => adminUsers.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const contactMessages = pgTable('contact_messages', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  isRead: boolean('is_read').notNull().default(false),
  isSpam: boolean('is_spam').notNull().default(false),
  ipHash: text('ip_hash').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const siteSettings = pgTable('site_settings', {
  id: serial('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value').notNull().default(''),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const articleComments = pgTable('article_comments', {
  id: serial('id').primaryKey(),
  articleId: integer('article_id')
    .references(() => articles.id, { onDelete: 'cascade' })
    .notNull(),
  authorName: text('author_name').notNull(),
  authorEmail: text('author_email').notNull().default(''),
  content: text('content').notNull(),
  status: text('status').notNull().default('pending'), // 'pending' | 'approved' | 'rejected'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const newsletterSubscribers = pgTable('newsletter_subscribers', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull().default(''),
  preferredLanguage: text('preferred_language').notNull().default('mr'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  adminId: integer('admin_id').references(() => adminUsers.id, {
    onDelete: 'set null',
  }),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: integer('entity_id'),
  summary: text('summary').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const adminUsersRelations = relations(adminUsers, ({ many }) => ({
  articles: many(articles),
  mediaFiles: many(mediaFiles),
  activityLogs: many(activityLogs),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  articles: many(articles),
}));

export const articlesRelations = relations(articles, ({ one, many }) => ({
  category: one(categories, {
    fields: [articles.categoryId],
    references: [categories.id],
  }),
  author: one(adminUsers, {
    fields: [articles.authorId],
    references: [adminUsers.id],
  }),
  translations: many(articleTranslations),
  articleTags: many(articleTags),
  comments: many(articleComments),
}));

export const articleTranslationsRelations = relations(
  articleTranslations,
  ({ one }) => ({
    article: one(articles, {
      fields: [articleTranslations.articleId],
      references: [articles.id],
    }),
  })
);

export const tagsRelations = relations(tags, ({ many }) => ({
  articleTags: many(articleTags),
}));

export const articleTagsRelations = relations(articleTags, ({ one }) => ({
  article: one(articles, {
    fields: [articleTags.articleId],
    references: [articles.id],
  }),
  tag: one(tags, {
    fields: [articleTags.tagId],
    references: [tags.id],
  }),
}));

export const articleCommentsRelations = relations(
  articleComments,
  ({ one }) => ({
    article: one(articles, {
      fields: [articleComments.articleId],
      references: [articles.id],
    }),
  })
);
