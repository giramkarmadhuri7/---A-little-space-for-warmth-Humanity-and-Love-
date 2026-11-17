import express, { Router } from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { z } from 'zod';
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  ilike,
  inArray,
  lt,
  ne,
  or,
  sql,
} from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  activityLogs,
  adminUsers,
  articleComments,
  articles,
  articleTags,
  articleTranslations,
  categories,
  contactMessages,
  mediaFiles,
  newsletterSubscribers,
  siteSettings,
  tags,
} from '../db/schema.ts';
import {
  AuthRequest,
  requireAdmin,
  requireFirebaseAuth,
} from '../middleware/auth.ts';
import {
  createSlug,
  detectImageMimeFromBuffer,
  estimateReadingTimeMinutes,
  hashIp,
  hashPassphrase,
  sanitizeRichContent,
  signAdminSession,
  verifyPassphrase,
} from './security.ts';
import {
  ensureInitialDataSeeded,
  publishDueScheduledArticles,
} from './seed.ts';

const router = Router();

// Rate limiters
const publicWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again gently after a few minutes.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please wait a few minutes.' },
});

// Multer setup for safe image uploads (5MB limit, memory buffer)
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
});

const handleSingleImageUpload: express.RequestHandler = (req, res, next) => {
  upload.single('file')(req, res, (err: unknown) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            error:
              'Image size exceeds the 5 MB maximum limit. Please choose a smaller photograph.',
          });
        }
        return res.status(400).json({ error: err.message });
      }
      return res.status(400).json({ error: 'Unable to process uploaded image.' });
    }
    next();
  });
};

async function logActivity(
  adminId: number | null,
  action: string,
  entityType: string,
  entityId: number | null,
  summary: string
) {
  try {
    await db.insert(activityLogs).values({
      adminId,
      action,
      entityType,
      entityId,
      summary,
    });
  } catch (err) {
    console.error('Activity log failed:', err);
  }
}

// ============================================================================
// PUBLIC ROUTES
// ============================================================================

router.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'madhuchya-janiva' });
});

router.get('/api/site-data', async (_req, res) => {
  try {
    await ensureInitialDataSeeded();
    await publishDueScheduledArticles();

    const allCats = await db
      .select()
      .from(categories)
      .orderBy(asc(categories.sortOrder), asc(categories.id));

    const publishedCounts = await db
      .select({
        categoryId: articles.categoryId,
        total: count(),
      })
      .from(articles)
      .where(eq(articles.status, 'published'))
      .groupBy(articles.categoryId);

    const countMap = new Map(
      publishedCounts.map((row) => [row.categoryId, Number(row.total)])
    );

    const settingsRows = await db.select().from(siteSettings);
    const settings: Record<string, string> = {};
    for (const row of settingsRows) {
      settings[row.key] = row.value;
    }

    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    );
    res.json({
      categories: allCats.map((c) => ({
        ...c,
        articleCount: countMap.get(c.id) ?? 0,
      })),
      settings,
    });
  } catch (error) {
    console.error('Failed to load site data:', error);
    res.status(500).json({ error: 'Unable to load site data right now.' });
  }
});

router.get('/api/articles', async (req, res) => {
  try {
    await ensureInitialDataSeeded();
    await publishDueScheduledArticles();

    const categorySlug = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const sort = req.query.sort === 'oldest' ? 'oldest' : 'latest';
    const featured = req.query.featured === 'true';
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);

    const conditions = [eq(articles.status, 'published')];

    if (featured) {
      conditions.push(eq(articles.isFeatured, true));
    }

    if (categorySlug && categorySlug !== 'all') {
      const catRow = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.slug, categorySlug))
        .limit(1);
      if (catRow[0]) {
        conditions.push(eq(articles.categoryId, catRow[0].id));
      } else {
        return res.json({ articles: [] });
      }
    }

    if (search) {
      const pattern = `%${search}%`;
      const matchingTranslations = await db
        .select({ articleId: articleTranslations.articleId })
        .from(articleTranslations)
        .where(
          and(
            eq(articleTranslations.isPublished, true),
            or(
              ilike(articleTranslations.title, pattern),
              ilike(articleTranslations.excerpt, pattern),
              ilike(articleTranslations.content, pattern)
            )
          )
        );
      const translatedIds = matchingTranslations.map((t) => t.articleId);
      const searchCond = translatedIds.length
        ? or(
            ilike(articles.titleMr, pattern),
            ilike(articles.excerptMr, pattern),
            ilike(articles.contentMr, pattern),
            inArray(articles.id, translatedIds)
          )
        : or(
            ilike(articles.titleMr, pattern),
            ilike(articles.excerptMr, pattern),
            ilike(articles.contentMr, pattern)
          );
      if (searchCond) conditions.push(searchCond);
    }

    const rows = await db
      .select({
        id: articles.id,
        slug: articles.slug,
        titleMr: articles.titleMr,
        excerptMr: articles.excerptMr,
        featuredImageUrl: articles.featuredImageUrl,
        featuredImageAlt: articles.featuredImageAlt,
        categoryId: articles.categoryId,
        authorName: articles.authorName,
        isFeatured: articles.isFeatured,
        isSample: articles.isSample,
        readingTimeMinutes: articles.readingTimeMinutes,
        publishedAt: articles.publishedAt,
        appreciationCount: articles.appreciationCount,
        createdAt: articles.createdAt,
        categorySlug: categories.slug,
        categoryNameMr: categories.nameMr,
        categoryNameEn: categories.nameEn,
      })
      .from(articles)
      .leftJoin(categories, eq(articles.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(
        sort === 'oldest'
          ? asc(articles.publishedAt)
          : desc(articles.publishedAt),
        sort === 'oldest' ? asc(articles.id) : desc(articles.id)
      )
      .limit(limit);

    const articleIds = rows.map((r) => r.id);
    const translations =
      articleIds.length > 0
        ? await db
            .select({
              articleId: articleTranslations.articleId,
              language: articleTranslations.language,
              title: articleTranslations.title,
              excerpt: articleTranslations.excerpt,
              isPublished: articleTranslations.isPublished,
            })
            .from(articleTranslations)
            .where(
              and(
                inArray(articleTranslations.articleId, articleIds),
                eq(articleTranslations.isPublished, true)
              )
            )
        : [];

    const transMap = new Map<number, (typeof translations)[number]>();
    for (const tr of translations) {
      if (tr.language === 'en') transMap.set(tr.articleId, tr);
    }

    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    );
    res.json({
      articles: rows.map((row) => ({
        ...row,
        translationEn: transMap.get(row.id) ?? null,
      })),
    });
  } catch (error) {
    console.error('Failed to fetch articles:', error);
    res.status(500).json({ error: 'Unable to load writings right now.' });
  }
});

router.get('/api/articles/:slug', async (req, res) => {
  try {
    await ensureInitialDataSeeded();
    await publishDueScheduledArticles();

    const slug = decodeURIComponent(req.params.slug);
    const rows = await db
      .select({
        id: articles.id,
        slug: articles.slug,
        titleMr: articles.titleMr,
        excerptMr: articles.excerptMr,
        contentMr: articles.contentMr,
        featuredImageUrl: articles.featuredImageUrl,
        featuredImageAlt: articles.featuredImageAlt,
        categoryId: articles.categoryId,
        authorName: articles.authorName,
        status: articles.status,
        isFeatured: articles.isFeatured,
        isSample: articles.isSample,
        readingTimeMinutes: articles.readingTimeMinutes,
        seoTitleMr: articles.seoTitleMr,
        seoDescriptionMr: articles.seoDescriptionMr,
        publishedAt: articles.publishedAt,
        appreciationCount: articles.appreciationCount,
        createdAt: articles.createdAt,
        categorySlug: categories.slug,
        categoryNameMr: categories.nameMr,
        categoryNameEn: categories.nameEn,
      })
      .from(articles)
      .leftJoin(categories, eq(articles.categoryId, categories.id))
      .where(and(eq(articles.slug, slug), eq(articles.status, 'published')))
      .limit(1);

    const article = rows[0];
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const [translationEnRow] = await db
      .select()
      .from(articleTranslations)
      .where(
        and(
          eq(articleTranslations.articleId, article.id),
          eq(articleTranslations.language, 'en'),
          eq(articleTranslations.isPublished, true)
        )
      )
      .limit(1);

    const articleTagRows = await db
      .select({
        id: tags.id,
        slug: tags.slug,
        nameMr: tags.nameMr,
        nameEn: tags.nameEn,
      })
      .from(articleTags)
      .innerJoin(tags, eq(articleTags.tagId, tags.id))
      .where(eq(articleTags.articleId, article.id));

    const approvedComments = await db
      .select({
        id: articleComments.id,
        authorName: articleComments.authorName,
        content: articleComments.content,
        createdAt: articleComments.createdAt,
      })
      .from(articleComments)
      .where(
        and(
          eq(articleComments.articleId, article.id),
          eq(articleComments.status, 'approved')
        )
      )
      .orderBy(desc(articleComments.createdAt));

    // Related articles in same category or latest
    const relatedRows = await db
      .select({
        id: articles.id,
        slug: articles.slug,
        titleMr: articles.titleMr,
        excerptMr: articles.excerptMr,
        featuredImageUrl: articles.featuredImageUrl,
        featuredImageAlt: articles.featuredImageAlt,
        readingTimeMinutes: articles.readingTimeMinutes,
        publishedAt: articles.publishedAt,
        isSample: articles.isSample,
        categorySlug: categories.slug,
        categoryNameMr: categories.nameMr,
        categoryNameEn: categories.nameEn,
      })
      .from(articles)
      .leftJoin(categories, eq(articles.categoryId, categories.id))
      .where(
        and(
          eq(articles.status, 'published'),
          ne(articles.id, article.id),
          article.categoryId ? eq(articles.categoryId, article.categoryId) : sql`true`
        )
      )
      .orderBy(desc(articles.publishedAt))
      .limit(3);

    // Previous & Next published articles by publishedAt/id
    const publishedDate = article.publishedAt ?? article.createdAt;
    const [prevArticle] = await db
      .select({
        slug: articles.slug,
        titleMr: articles.titleMr,
      })
      .from(articles)
      .where(
        and(
          eq(articles.status, 'published'),
          ne(articles.id, article.id),
          or(
            lt(articles.publishedAt, publishedDate),
            and(eq(articles.publishedAt, publishedDate), lt(articles.id, article.id))
          )
        )
      )
      .orderBy(desc(articles.publishedAt), desc(articles.id))
      .limit(1);

    const [nextArticle] = await db
      .select({
        slug: articles.slug,
        titleMr: articles.titleMr,
      })
      .from(articles)
      .where(
        and(
          eq(articles.status, 'published'),
          ne(articles.id, article.id),
          or(
            gt(articles.publishedAt, publishedDate),
            and(eq(articles.publishedAt, publishedDate), gt(articles.id, article.id))
          )
        )
      )
      .orderBy(asc(articles.publishedAt), asc(articles.id))
      .limit(1);

    // Translations for related/prev/next
    const extraIds = [
      ...relatedRows.map((r) => r.id),
    ];
    const extraTranslations =
      extraIds.length > 0
        ? await db
            .select({
              articleId: articleTranslations.articleId,
              title: articleTranslations.title,
              excerpt: articleTranslations.excerpt,
            })
            .from(articleTranslations)
            .where(
              and(
                inArray(articleTranslations.articleId, extraIds),
                eq(articleTranslations.language, 'en'),
                eq(articleTranslations.isPublished, true)
              )
            )
        : [];
    const extraMap = new Map(extraTranslations.map((t) => [t.articleId, t]));

    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    );
    res.json({
      article: {
        ...article,
        translationEn: translationEnRow ?? null,
        tags: articleTagRows,
        comments: approvedComments,
      },
      related: relatedRows.map((r) => ({
        ...r,
        translationEn: extraMap.get(r.id) ?? null,
      })),
      previousArticle: prevArticle ?? null,
      nextArticle: nextArticle ?? null,
    });
  } catch (error) {
    console.error('Failed to fetch single article:', error);
    res.status(500).json({ error: 'Unable to load this writing right now.' });
  }
});

router.post('/api/articles/:slug/appreciate', publicWriteLimiter, async (req, res) => {
  try {
    const slug = decodeURIComponent(req.params.slug);
    const updated = await db
      .update(articles)
      .set({
        appreciationCount: sql`${articles.appreciationCount} + 1`,
      })
      .where(and(eq(articles.slug, slug), eq(articles.status, 'published')))
      .returning({ appreciationCount: articles.appreciationCount });

    if (!updated[0]) {
      return res.status(404).json({ error: 'Article not found' });
    }
    res.json({ appreciationCount: updated[0].appreciationCount });
  } catch (error) {
    console.error('Failed to appreciate article:', error);
    res.status(500).json({ error: 'Could not save appreciation' });
  }
});

const commentSchema = z.object({
  authorName: z.string().trim().min(2).max(80),
  authorEmail: z.string().trim().email().optional().or(z.literal('')),
  content: z.string().trim().min(3).max(1500),
  website: z.string().optional(), // honeypot
});

router.post('/api/articles/:slug/comments', publicWriteLimiter, async (req, res) => {
  try {
    const parsed = commentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Please fill in your name and reflection.' });
    }
    if (parsed.data.website && parsed.data.website.trim().length > 0) {
      return res.status(200).json({ ok: true, pending: true });
    }

    const slug = decodeURIComponent(req.params.slug);
    const [article] = await db
      .select({ id: articles.id })
      .from(articles)
      .where(and(eq(articles.slug, slug), eq(articles.status, 'published')))
      .limit(1);

    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    await db.insert(articleComments).values({
      articleId: article.id,
      authorName: parsed.data.authorName,
      authorEmail: parsed.data.authorEmail ?? '',
      content: parsed.data.content,
      status: 'pending',
    });

    res.status(201).json({
      ok: true,
      message: 'Your reflection has been submitted for moderation.',
    });
  } catch (error) {
    console.error('Failed to submit comment:', error);
    res.status(500).json({ error: 'Unable to submit reflection right now.' });
  }
});

const contactSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(100),
  email: z.string().trim().email('Please provide a valid email address').max(150),
  subject: z.string().trim().min(2, 'Subject is required').max(200),
  message: z.string().trim().min(10, 'Message must be at least 10 characters').max(4000),
  honeypot: z.string().optional(),
  formRenderedAt: z.number().optional(),
});

router.post('/api/contact', publicWriteLimiter, async (req, res) => {
  try {
    const parsed = contactSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Invalid form submission',
      });
    }

    const isHoneypotTriggered =
      Boolean(parsed.data.honeypot && parsed.data.honeypot.trim().length > 0) ||
      (typeof parsed.data.formRenderedAt === 'number' &&
        Date.now() - parsed.data.formRenderedAt < 1200);

    await db.insert(contactMessages).values({
      name: parsed.data.name,
      email: parsed.data.email,
      subject: parsed.data.subject,
      message: parsed.data.message,
      isSpam: isHoneypotTriggered,
      ipHash: hashIp(req.ip || ''),
    });

    res.status(201).json({ ok: true });
  } catch (error) {
    console.error('Contact form submission failed:', error);
    res.status(500).json({ error: 'Unable to send your message right now.' });
  }
});

const newsletterSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  name: z.string().trim().max(80).optional().default(''),
  preferredLanguage: z.enum(['mr', 'en']).optional().default('mr'),
});

router.post('/api/newsletter', publicWriteLimiter, async (req, res) => {
  try {
    const parsed = newsletterSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    await db
      .insert(newsletterSubscribers)
      .values({
        email: parsed.data.email.toLowerCase(),
        name: parsed.data.name,
        preferredLanguage: parsed.data.preferredLanguage,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: newsletterSubscribers.email,
        set: {
          name: parsed.data.name,
          preferredLanguage: parsed.data.preferredLanguage,
          isActive: true,
        },
      });

    res.status(201).json({ ok: true });
  } catch (error) {
    console.error('Newsletter subscription failed:', error);
    res.status(500).json({ error: 'Unable to subscribe right now.' });
  }
});

router.get('/api/media/:id/file', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).send('Invalid media ID');
    }

    const rows = await db
      .select({
        mimeType: mediaFiles.mimeType,
        dataBase64: mediaFiles.dataBase64,
        updatedAt: mediaFiles.updatedAt,
      })
      .from(mediaFiles)
      .where(eq(mediaFiles.id, id))
      .limit(1);

    const file = rows[0];
    if (!file) {
      return res.status(404).send('Media not found');
    }

    const buffer = Buffer.from(file.dataBase64, 'base64');
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch (error) {
    console.error('Failed to serve media file:', error);
    res.status(500).send('Error loading media');
  }
});

// SEO: Dynamic Sitemap & Robots.txt
router.get('/sitemap.xml', async (req, res) => {
  try {
    await ensureInitialDataSeeded();
    const baseUrl =
      process.env.APP_URL || `${req.protocol}://${req.get('host')}`;

    const published = await db
      .select({
        slug: articles.slug,
        updatedAt: articles.updatedAt,
      })
      .from(articles)
      .where(eq(articles.status, 'published'))
      .orderBy(desc(articles.publishedAt));

    const cats = await db.select({ slug: categories.slug }).from(categories);

    const staticUrls = ['', '/about', '/writings', '/contact'];
    const urlsXml = [
      ...staticUrls.map(
        (path) => `
  <url>
    <loc>${baseUrl}${path}</loc>
    <changefreq>weekly</changefreq>
    <priority>${path === '' ? '1.0' : '0.8'}</priority>
  </url>`
      ),
      ...cats.map(
        (c) => `
  <url>
    <loc>${baseUrl}/writings?category=${encodeURIComponent(c.slug)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`
      ),
      ...published.map(
        (a) => `
  <url>
    <loc>${baseUrl}/writings/${encodeURIComponent(a.slug)}</loc>
    <lastmod>${a.updatedAt.toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>`
      ),
    ].join('');

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urlsXml}
</urlset>`);
  } catch (error) {
    console.error('Sitemap error:', error);
    res.status(500).send('Error generating sitemap');
  }
});

router.get('/robots.txt', (req, res) => {
  const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(`User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/admin/

Sitemap: ${baseUrl}/sitemap.xml
`);
});

// ============================================================================
// ADMIN AUTHENTICATION & INITIAL SECURE SETUP
// ============================================================================

router.get('/api/admin/bootstrap-status', async (_req, res) => {
  try {
    const [{ value }] = await db.select({ value: count() }).from(adminUsers);
    res.json({ setupRequired: Number(value) === 0 });
  } catch (error) {
    console.error('Bootstrap status check failed:', error);
    res.status(500).json({ error: 'Unable to check admin setup status.' });
  }
});

const initialSetupSchema = z.object({
  displayName: z.string().trim().min(2).max(60).default('माधुरी'),
  passphrase: z.string().min(8, 'Passphrase must be at least 8 characters').max(128),
});

router.post(
  '/api/admin/initial-setup',
  authLimiter,
  requireFirebaseAuth,
  async (req: AuthRequest, res) => {
    try {
      const [{ value: existingCount }] = await db
        .select({ value: count() })
        .from(adminUsers);

      if (Number(existingCount) > 0) {
        return res.status(403).json({
          error: 'Public admin registration is disabled. An administrator already exists.',
        });
      }

      const parsed = initialSetupSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: parsed.error.issues[0]?.message || 'Invalid setup fields',
        });
      }

      const uid = req.user!.uid;
      const email = req.user!.email;
      if (!email) {
        return res.status(400).json({ error: 'Google account email is required.' });
      }

      const passwordHash = hashPassphrase(parsed.data.passphrase);

      const [createdAdmin] = await db
        .insert(adminUsers)
        .values({
          uid,
          email,
          displayName: parsed.data.displayName,
          passwordHash,
          role: 'admin',
          isActive: true,
          lastLoginAt: new Date(),
        })
        .returning();

      await ensureInitialDataSeeded();
      await logActivity(
        createdAdmin.id,
        'admin_setup',
        'admin',
        createdAdmin.id,
        `Initial administrator configured (${createdAdmin.displayName})`
      );

      const adminSessionToken = signAdminSession({
        adminId: createdAdmin.id,
        uid: createdAdmin.uid,
        email: createdAdmin.email,
      });

      res.status(201).json({
        admin: {
          id: createdAdmin.id,
          email: createdAdmin.email,
          displayName: createdAdmin.displayName,
          role: createdAdmin.role,
        },
        adminSessionToken,
      });
    } catch (error) {
      console.error('Initial admin setup failed:', error);
      res.status(500).json({ error: 'Unable to complete initial admin setup.' });
    }
  }
);

const unlockSchema = z.object({
  passphrase: z.string().min(1, 'Admin passphrase is required'),
});

router.post(
  '/api/admin/unlock',
  authLimiter,
  requireFirebaseAuth,
  async (req: AuthRequest, res) => {
    try {
      const parsed = unlockSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Admin passphrase is required.' });
      }

      const uid = req.user!.uid;
      const email = req.user!.email || '';

      const rows = await db
        .select()
        .from(adminUsers)
        .where(or(eq(adminUsers.uid, uid), eq(adminUsers.email, email)))
        .limit(1);

      const admin = rows[0];
      if (!admin || !admin.isActive) {
        return res.status(403).json({
          error: 'This account is not authorized as an administrator.',
        });
      }

      const valid = verifyPassphrase(parsed.data.passphrase, admin.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: 'Incorrect admin passphrase.' });
      }

      // Sync UID if needed and update lastLoginAt
      await db
        .update(adminUsers)
        .set({
          uid,
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(adminUsers.id, admin.id));

      await logActivity(
        admin.id,
        'login',
        'admin',
        admin.id,
        `${admin.displayName} signed into Admin Studio`
      );

      const adminSessionToken = signAdminSession({
        adminId: admin.id,
        uid,
        email: admin.email,
      });

      res.json({
        admin: {
          id: admin.id,
          email: admin.email,
          displayName: admin.displayName,
          role: admin.role,
        },
        adminSessionToken,
      });
    } catch (error) {
      console.error('Admin unlock failed:', error);
      res.status(500).json({ error: 'Unable to verify admin credentials.' });
    }
  }
);

router.get('/api/admin/me', requireAdmin, (req: AuthRequest, res) => {
  res.json({ admin: req.adminUser });
});

// ============================================================================
// PROTECTED ADMIN DASHBOARD ROUTES
// ============================================================================

router.get('/api/admin/overview', requireAdmin, async (_req: AuthRequest, res) => {
  try {
    await ensureInitialDataSeeded();
    await publishDueScheduledArticles();

    const [{ value: totalArticles }] = await db.select({ value: count() }).from(articles);
    const [{ value: publishedArticles }] = await db
      .select({ value: count() })
      .from(articles)
      .where(eq(articles.status, 'published'));
    const [{ value: draftArticles }] = await db
      .select({ value: count() })
      .from(articles)
      .where(eq(articles.status, 'draft'));
    const [{ value: scheduledArticles }] = await db
      .select({ value: count() })
      .from(articles)
      .where(eq(articles.status, 'scheduled'));
    const [{ value: sampleArticles }] = await db
      .select({ value: count() })
      .from(articles)
      .where(eq(articles.isSample, true));
    const [{ value: totalCategories }] = await db.select({ value: count() }).from(categories);
    const [{ value: totalMessages }] = await db
      .select({ value: count() })
      .from(contactMessages)
      .where(eq(contactMessages.isSpam, false));
    const [{ value: unreadMessages }] = await db
      .select({ value: count() })
      .from(contactMessages)
      .where(and(eq(contactMessages.isRead, false), eq(contactMessages.isSpam, false)));
    const [{ value: totalMedia }] = await db.select({ value: count() }).from(mediaFiles);
    const [{ value: pendingComments }] = await db
      .select({ value: count() })
      .from(articleComments)
      .where(eq(articleComments.status, 'pending'));
    const [{ value: subscriberCount }] = await db
      .select({ value: count() })
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.isActive, true));

    const recentActivity = await db
      .select()
      .from(activityLogs)
      .orderBy(desc(activityLogs.createdAt))
      .limit(12);

    res.json({
      stats: {
        totalArticles: Number(totalArticles),
        publishedArticles: Number(publishedArticles),
        draftArticles: Number(draftArticles),
        scheduledArticles: Number(scheduledArticles),
        sampleArticles: Number(sampleArticles),
        totalCategories: Number(totalCategories),
        totalMessages: Number(totalMessages),
        unreadMessages: Number(unreadMessages),
        totalMedia: Number(totalMedia),
        pendingComments: Number(pendingComments),
        subscriberCount: Number(subscriberCount),
      },
      recentActivity,
    });
  } catch (error) {
    console.error('Admin overview failed:', error);
    res.status(500).json({ error: 'Unable to load dashboard overview.' });
  }
});

// Admin Articles CRUD
router.get('/api/admin/articles', requireAdmin, async (_req: AuthRequest, res) => {
  try {
    await publishDueScheduledArticles();
    const rows = await db
      .select({
        id: articles.id,
        slug: articles.slug,
        titleMr: articles.titleMr,
        excerptMr: articles.excerptMr,
        featuredImageUrl: articles.featuredImageUrl,
        categoryId: articles.categoryId,
        authorName: articles.authorName,
        status: articles.status,
        isFeatured: articles.isFeatured,
        isSample: articles.isSample,
        readingTimeMinutes: articles.readingTimeMinutes,
        publishedAt: articles.publishedAt,
        scheduledAt: articles.scheduledAt,
        appreciationCount: articles.appreciationCount,
        createdAt: articles.createdAt,
        updatedAt: articles.updatedAt,
        categoryNameMr: categories.nameMr,
        categoryNameEn: categories.nameEn,
      })
      .from(articles)
      .leftJoin(categories, eq(articles.categoryId, categories.id))
      .orderBy(desc(articles.updatedAt), desc(articles.id));

    const translations = await db
      .select({
        articleId: articleTranslations.articleId,
        language: articleTranslations.language,
        title: articleTranslations.title,
        isPublished: articleTranslations.isPublished,
      })
      .from(articleTranslations);

    const transMap = new Map<number, boolean>();
    for (const tr of translations) {
      if (tr.language === 'en') transMap.set(tr.articleId, true);
    }

    res.json({
      articles: rows.map((r) => ({
        ...r,
        hasEnglishTranslation: transMap.get(r.id) ?? false,
      })),
    });
  } catch (error) {
    console.error('Admin articles fetch failed:', error);
    res.status(500).json({ error: 'Unable to load articles.' });
  }
});

router.get('/api/admin/articles/:id', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid article ID' });
    }

    const [article] = await db
      .select()
      .from(articles)
      .where(eq(articles.id, id))
      .limit(1);

    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const [translationEn] = await db
      .select()
      .from(articleTranslations)
      .where(
        and(
          eq(articleTranslations.articleId, article.id),
          eq(articleTranslations.language, 'en')
        )
      )
      .limit(1);

    const tagRows = await db
      .select({ nameMr: tags.nameMr })
      .from(articleTags)
      .innerJoin(tags, eq(articleTags.tagId, tags.id))
      .where(eq(articleTags.articleId, article.id));

    res.json({
      article,
      translationEn: translationEn ?? null,
      tags: tagRows.map((t) => t.nameMr),
    });
  } catch (error) {
    console.error('Admin single article fetch failed:', error);
    res.status(500).json({ error: 'Unable to load article details.' });
  }
});

const articlePayloadSchema = z.object({
  titleMr: z.string().trim().min(2, 'Marathi title is required').max(250),
  slug: z.string().trim().max(120).optional(),
  excerptMr: z.string().trim().max(600).optional().default(''),
  contentMr: z.string().trim().min(5, 'Article content is required'),
  featuredImageUrl: z
    .string()
    .trim()
    .max(500)
    .refine(
      (val) => !val || (!val.startsWith('data:') && !val.startsWith('blob:')),
      'Temporary data or blob URLs are not allowed for cover images.'
    )
    .optional()
    .default(''),
  featuredImageAlt: z.string().trim().max(250).optional().default(''),
  categoryId: z.number().int().positive().nullable().optional(),
  status: z.enum(['draft', 'published', 'scheduled']).default('draft'),
  scheduledAt: z.string().nullable().optional(),
  isFeatured: z.boolean().optional().default(false),
  isSample: z.boolean().optional().default(false),
  seoTitleMr: z.string().trim().max(160).optional().default(''),
  seoDescriptionMr: z.string().trim().max(320).optional().default(''),
  tags: z.array(z.string().trim().min(1).max(60)).optional().default([]),
  englishTranslation: z
    .object({
      enabled: z.boolean(),
      title: z.string().trim().max(250).optional().default(''),
      excerpt: z.string().trim().max(600).optional().default(''),
      content: z.string().trim().optional().default(''),
      seoTitle: z.string().trim().max(160).optional().default(''),
      seoDescription: z.string().trim().max(320).optional().default(''),
      isPublished: z.boolean().optional().default(true),
    })
    .optional(),
});

async function syncArticleTags(articleId: number, tagNames: string[]) {
  await db.delete(articleTags).where(eq(articleTags.articleId, articleId));
  const uniqueNames = [...new Set(tagNames.map((t) => t.trim()).filter(Boolean))];
  for (const name of uniqueNames) {
    const slug = createSlug(name, 'tag');
    const [existing] = await db
      .select()
      .from(tags)
      .where(eq(tags.slug, slug))
      .limit(1);
    let tagId = existing?.id;
    if (!tagId) {
      const [inserted] = await db
        .insert(tags)
        .values({ slug, nameMr: name, nameEn: name })
        .onConflictDoNothing()
        .returning();
      tagId = inserted?.id;
    }
    if (tagId) {
      await db
        .insert(articleTags)
        .values({ articleId, tagId })
        .onConflictDoNothing();
    }
  }
}

router.post('/api/admin/articles', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const parsed = articlePayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Invalid article data',
      });
    }

    const data = parsed.data;
    const sanitizedContentMr = sanitizeRichContent(data.contentMr);
    const readingTimeMinutes = estimateReadingTimeMinutes(sanitizedContentMr);

    let slug = data.slug ? createSlug(data.slug) : createSlug(data.titleMr);
    const [existingSlug] = await db
      .select({ id: articles.id })
      .from(articles)
      .where(eq(articles.slug, slug))
      .limit(1);
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
    }

    const now = new Date();
    const scheduledDate = data.scheduledAt ? new Date(data.scheduledAt) : null;
    const publishedAt = data.status === 'published' ? now : null;

    const [created] = await db
      .insert(articles)
      .values({
        slug,
        titleMr: data.titleMr,
        excerptMr: data.excerptMr,
        contentMr: sanitizedContentMr,
        featuredImageUrl: data.featuredImageUrl,
        featuredImageAlt: data.featuredImageAlt,
        categoryId: data.categoryId ?? null,
        authorId: req.adminUser!.id,
        authorName: 'माधुरी',
        status: data.status,
        isFeatured: data.isFeatured,
        isSample: data.isSample,
        readingTimeMinutes,
        seoTitleMr: data.seoTitleMr,
        seoDescriptionMr: data.seoDescriptionMr,
        publishedAt,
        scheduledAt: data.status === 'scheduled' ? scheduledDate : null,
      })
      .returning();

    if (
      data.englishTranslation?.enabled &&
      data.englishTranslation.title &&
      data.englishTranslation.content
    ) {
      await db.insert(articleTranslations).values({
        articleId: created.id,
        language: 'en',
        title: data.englishTranslation.title,
        excerpt: data.englishTranslation.excerpt,
        content: sanitizeRichContent(data.englishTranslation.content),
        seoTitle: data.englishTranslation.seoTitle,
        seoDescription: data.englishTranslation.seoDescription,
        isPublished: data.englishTranslation.isPublished,
      });
    }

    await syncArticleTags(created.id, data.tags);
    await logActivity(
      req.adminUser!.id,
      data.status === 'published' ? 'publish_article' : 'create_article',
      'article',
      created.id,
      `${data.status === 'published' ? 'Published' : 'Saved'} article: ${created.titleMr}`
    );

    res.status(201).json({ article: created });
  } catch (error) {
    console.error('Create article failed:', error);
    res.status(500).json({ error: 'Unable to save article.' });
  }
});

router.put('/api/admin/articles/:id', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid article ID' });
    }

    const parsed = articlePayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Invalid article data',
      });
    }

    const [existing] = await db
      .select()
      .from(articles)
      .where(eq(articles.id, id))
      .limit(1);
    if (!existing) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const data = parsed.data;
    const sanitizedContentMr = sanitizeRichContent(data.contentMr);
    const readingTimeMinutes = estimateReadingTimeMinutes(sanitizedContentMr);

    let slug = data.slug ? createSlug(data.slug) : existing.slug;
    if (slug !== existing.slug) {
      const [conflict] = await db
        .select({ id: articles.id })
        .from(articles)
        .where(and(eq(articles.slug, slug), ne(articles.id, id)))
        .limit(1);
      if (conflict) {
        slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
      }
    }

    const now = new Date();
    const publishedAt =
      data.status === 'published'
        ? existing.publishedAt ?? now
        : data.status === 'draft'
          ? null
          : existing.publishedAt;
    const scheduledDate =
      data.status === 'scheduled' && data.scheduledAt
        ? new Date(data.scheduledAt)
        : null;

    const [updated] = await db
      .update(articles)
      .set({
        slug,
        titleMr: data.titleMr,
        excerptMr: data.excerptMr,
        contentMr: sanitizedContentMr,
        featuredImageUrl: data.featuredImageUrl,
        featuredImageAlt: data.featuredImageAlt,
        categoryId: data.categoryId ?? null,
        status: data.status,
        isFeatured: data.isFeatured,
        isSample: data.isSample,
        readingTimeMinutes,
        seoTitleMr: data.seoTitleMr,
        seoDescriptionMr: data.seoDescriptionMr,
        publishedAt,
        scheduledAt: scheduledDate,
        updatedAt: now,
      })
      .where(eq(articles.id, id))
      .returning();

    if (
      data.englishTranslation?.enabled &&
      data.englishTranslation.title &&
      data.englishTranslation.content
    ) {
      await db
        .insert(articleTranslations)
        .values({
          articleId: id,
          language: 'en',
          title: data.englishTranslation.title,
          excerpt: data.englishTranslation.excerpt,
          content: sanitizeRichContent(data.englishTranslation.content),
          seoTitle: data.englishTranslation.seoTitle,
          seoDescription: data.englishTranslation.seoDescription,
          isPublished: data.englishTranslation.isPublished,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [articleTranslations.articleId, articleTranslations.language],
          set: {
            title: data.englishTranslation.title,
            excerpt: data.englishTranslation.excerpt,
            content: sanitizeRichContent(data.englishTranslation.content),
            seoTitle: data.englishTranslation.seoTitle,
            seoDescription: data.englishTranslation.seoDescription,
            isPublished: data.englishTranslation.isPublished,
            updatedAt: now,
          },
        });
    } else if (data.englishTranslation && !data.englishTranslation.enabled) {
      await db
        .delete(articleTranslations)
        .where(
          and(
            eq(articleTranslations.articleId, id),
            eq(articleTranslations.language, 'en')
          )
        );
    }

    await syncArticleTags(id, data.tags);
    await logActivity(
      req.adminUser!.id,
      'update_article',
      'article',
      id,
      `Updated article (${data.status}): ${updated.titleMr}`
    );

    res.json({ article: updated });
  } catch (error) {
    console.error('Update article failed:', error);
    res.status(500).json({ error: 'Unable to update article.' });
  }
});

const coverPatchSchema = z.object({
  featuredImageUrl: z
    .string()
    .trim()
    .max(500)
    .refine(
      (val) => !val || (!val.startsWith('data:') && !val.startsWith('blob:')),
      'Temporary data or blob URLs are not allowed for cover images.'
    ),
  featuredImageAlt: z.string().trim().max(250).optional().default(''),
});

router.patch('/api/admin/articles/:id/cover', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid article ID' });
    }

    const parsed = coverPatchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Invalid cover image data',
      });
    }

    const [updated] = await db
      .update(articles)
      .set({
        featuredImageUrl: parsed.data.featuredImageUrl,
        featuredImageAlt: parsed.data.featuredImageAlt,
        updatedAt: new Date(),
      })
      .where(eq(articles.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Article not found' });
    }

    await logActivity(
      req.adminUser!.id,
      'update_article_cover',
      'article',
      id,
      parsed.data.featuredImageUrl
        ? `Updated cover photo for: ${updated.titleMr}`
        : `Removed cover photo for: ${updated.titleMr}`
    );

    res.json({ article: updated });
  } catch (error) {
    console.error('Update article cover failed:', error);
    res.status(500).json({ error: 'Unable to update article cover photo.' });
  }
});

router.delete('/api/admin/articles/:id', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid article ID' });
    }

    const [deleted] = await db
      .delete(articles)
      .where(eq(articles.id, id))
      .returning({ id: articles.id, titleMr: articles.titleMr });

    if (!deleted) {
      return res.status(404).json({ error: 'Article not found' });
    }

    await logActivity(
      req.adminUser!.id,
      'delete_article',
      'article',
      id,
      `Deleted article: ${deleted.titleMr}`
    );

    res.json({ ok: true });
  } catch (error) {
    console.error('Delete article failed:', error);
    res.status(500).json({ error: 'Unable to delete article.' });
  }
});

router.delete('/api/admin/sample-articles', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const deleted = await db
      .delete(articles)
      .where(eq(articles.isSample, true))
      .returning({ id: articles.id });

    await logActivity(
      req.adminUser!.id,
      'clear_samples',
      'article',
      null,
      `Removed ${deleted.length} sample template articles`
    );

    res.json({ ok: true, count: deleted.length });
  } catch (error) {
    console.error('Failed to clear sample articles:', error);
    res.status(500).json({ error: 'Unable to remove sample articles.' });
  }
});

// Admin Categories CRUD
const categorySchema = z.object({
  nameMr: z.string().trim().min(1).max(80),
  nameEn: z.string().trim().min(1).max(80),
  slug: z.string().trim().max(80).optional(),
  descriptionMr: z.string().trim().max(400).optional().default(''),
  descriptionEn: z.string().trim().max(400).optional().default(''),
  sortOrder: z.number().int().min(0).max(999).optional().default(0),
});

router.get('/api/admin/categories', requireAdmin, async (_req, res) => {
  try {
    await ensureInitialDataSeeded();
    const rows = await db
      .select()
      .from(categories)
      .orderBy(asc(categories.sortOrder), asc(categories.id));
    res.json({ categories: rows });
  } catch (error) {
    console.error('Fetch categories failed:', error);
    res.status(500).json({ error: 'Unable to load categories.' });
  }
});

router.post('/api/admin/categories', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const parsed = categorySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Please fill in Marathi and English category names.' });
    }
    const slug = parsed.data.slug
      ? createSlug(parsed.data.slug, 'cat')
      : createSlug(parsed.data.nameEn, 'cat');

    const [created] = await db
      .insert(categories)
      .values({
        slug,
        nameMr: parsed.data.nameMr,
        nameEn: parsed.data.nameEn,
        descriptionMr: parsed.data.descriptionMr,
        descriptionEn: parsed.data.descriptionEn,
        sortOrder: parsed.data.sortOrder,
      })
      .returning();

    await logActivity(
      req.adminUser!.id,
      'create_category',
      'category',
      created.id,
      `Created category: ${created.nameMr} (${created.nameEn})`
    );
    res.status(201).json({ category: created });
  } catch (error) {
    console.error('Create category failed:', error);
    res.status(500).json({ error: 'Category slug may already exist.' });
  }
});

router.put('/api/admin/categories/:id', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const parsed = categorySchema.safeParse(req.body);
    if (!Number.isInteger(id) || !parsed.success) {
      return res.status(400).json({ error: 'Invalid category payload.' });
    }

    const [updated] = await db
      .update(categories)
      .set({
        nameMr: parsed.data.nameMr,
        nameEn: parsed.data.nameEn,
        descriptionMr: parsed.data.descriptionMr,
        descriptionEn: parsed.data.descriptionEn,
        sortOrder: parsed.data.sortOrder,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Category not found' });
    }

    await logActivity(
      req.adminUser!.id,
      'update_category',
      'category',
      id,
      `Updated category: ${updated.nameMr}`
    );
    res.json({ category: updated });
  } catch (error) {
    console.error('Update category failed:', error);
    res.status(500).json({ error: 'Unable to update category.' });
  }
});

router.delete('/api/admin/categories/:id', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }
    const [deleted] = await db
      .delete(categories)
      .where(eq(categories.id, id))
      .returning({ id: categories.id, nameMr: categories.nameMr });
    if (!deleted) {
      return res.status(404).json({ error: 'Category not found' });
    }

    await logActivity(
      req.adminUser!.id,
      'delete_category',
      'category',
      id,
      `Deleted category: ${deleted.nameMr}`
    );
    res.json({ ok: true });
  } catch (error) {
    console.error('Delete category failed:', error);
    res.status(500).json({ error: 'Unable to delete category.' });
  }
});

// Admin Media Library
router.get('/api/admin/media', requireAdmin, async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: mediaFiles.id,
        filename: mediaFiles.filename,
        originalName: mediaFiles.originalName,
        mimeType: mediaFiles.mimeType,
        sizeBytes: mediaFiles.sizeBytes,
        altText: mediaFiles.altText,
        caption: mediaFiles.caption,
        createdAt: mediaFiles.createdAt,
        updatedAt: mediaFiles.updatedAt,
      })
      .from(mediaFiles)
      .orderBy(desc(mediaFiles.createdAt));

    res.json({
      media: rows.map((m) => ({
        ...m,
        url: `/api/media/${m.id}/file`,
      })),
    });
  } catch (error) {
    console.error('Fetch media failed:', error);
    res.status(500).json({ error: 'Unable to load media library.' });
  }
});

router.post(
  '/api/admin/media',
  requireAdmin,
  handleSingleImageUpload,
  async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Please select an image file.' });
      }

      if (req.file.size > MAX_IMAGE_SIZE_BYTES) {
        return res.status(400).json({
          error:
            'Image size exceeds the 5 MB maximum limit. Please choose a smaller photograph.',
        });
      }

      const detectedMime = detectImageMimeFromBuffer(req.file.buffer);
      const uploadPurpose =
        typeof req.body?.purpose === 'string'
          ? req.body.purpose
          : typeof req.query?.purpose === 'string'
            ? req.query.purpose
            : '';
      const isStrictPhotoUpload =
        uploadPurpose === 'cover' ||
        uploadPurpose === 'profile' ||
        uploadPurpose === 'brand_logo';
      const allowedPhotoMimes = new Set([
        'image/jpeg',
        'image/png',
        'image/webp',
      ]);

      if (!detectedMime || (isStrictPhotoUpload && !allowedPhotoMimes.has(detectedMime))) {
        return res.status(400).json({
          error: isStrictPhotoUpload
            ? 'Only valid JPG, JPEG, PNG, and WebP images are supported.'
            : 'Only valid PNG, JPEG, WEBP, or GIF images are allowed.',
        });
      }

      const altText =
        typeof req.body.altText === 'string' ? req.body.altText.trim().slice(0, 250) : '';
      const caption =
        typeof req.body.caption === 'string' ? req.body.caption.trim().slice(0, 300) : '';

      const safeFilename = `${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

      const [created] = await db
        .insert(mediaFiles)
        .values({
          filename: safeFilename,
          originalName: req.file.originalname.slice(0, 180),
          mimeType: detectedMime,
          sizeBytes: req.file.size,
          altText,
          caption,
          dataBase64: req.file.buffer.toString('base64'),
          uploadedById: req.adminUser!.id,
        })
        .returning({
          id: mediaFiles.id,
          filename: mediaFiles.filename,
          originalName: mediaFiles.originalName,
          mimeType: mediaFiles.mimeType,
          sizeBytes: mediaFiles.sizeBytes,
          altText: mediaFiles.altText,
          caption: mediaFiles.caption,
          createdAt: mediaFiles.createdAt,
        });

      await logActivity(
        req.adminUser!.id,
        'upload_media',
        'media',
        created.id,
        `Uploaded image: ${created.originalName}`
      );

      res.status(201).json({
        media: {
          ...created,
          url: `/api/media/${created.id}/file`,
        },
      });
    } catch (error) {
      console.error('Upload media failed:', error);
      res.status(500).json({ error: 'Unable to upload image.' });
    }
  }
);

router.put(
  '/api/admin/media/:id',
  requireAdmin,
  handleSingleImageUpload,
  async (req: AuthRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'Invalid media ID' });
      }

      const updates: Record<string, unknown> = {
        updatedAt: new Date(),
      };
      if (typeof req.body.altText === 'string') {
        updates.altText = req.body.altText.trim().slice(0, 250);
      }
      if (typeof req.body.caption === 'string') {
        updates.caption = req.body.caption.trim().slice(0, 300);
      }
      if (req.file) {
        const detectedMime = detectImageMimeFromBuffer(req.file.buffer);
        if (!detectedMime) {
          return res.status(400).json({ error: 'Invalid image file format.' });
        }
        updates.mimeType = detectedMime;
        updates.sizeBytes = req.file.size;
        updates.originalName = req.file.originalname.slice(0, 180);
        updates.dataBase64 = req.file.buffer.toString('base64');
      }

      const [updated] = await db
        .update(mediaFiles)
        .set(updates)
        .where(eq(mediaFiles.id, id))
        .returning({
          id: mediaFiles.id,
          filename: mediaFiles.filename,
          originalName: mediaFiles.originalName,
          mimeType: mediaFiles.mimeType,
          sizeBytes: mediaFiles.sizeBytes,
          altText: mediaFiles.altText,
          caption: mediaFiles.caption,
          createdAt: mediaFiles.createdAt,
          updatedAt: mediaFiles.updatedAt,
        });

      if (!updated) {
        return res.status(404).json({ error: 'Media item not found' });
      }

      res.json({
        media: { ...updated, url: `/api/media/${updated.id}/file` },
      });
    } catch (error) {
      console.error('Update media failed:', error);
      res.status(500).json({ error: 'Unable to update media item.' });
    }
  }
);

router.delete('/api/admin/media/:id', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid media ID' });
    }
    const [deleted] = await db
      .delete(mediaFiles)
      .where(eq(mediaFiles.id, id))
      .returning({ id: mediaFiles.id, originalName: mediaFiles.originalName });

    if (!deleted) {
      return res.status(404).json({ error: 'Media not found' });
    }
    await logActivity(
      req.adminUser!.id,
      'delete_media',
      'media',
      id,
      `Deleted media: ${deleted.originalName}`
    );
    res.json({ ok: true });
  } catch (error) {
    console.error('Delete media failed:', error);
    res.status(500).json({ error: 'Unable to delete media.' });
  }
});

// Admin Contact Messages
router.get('/api/admin/messages', requireAdmin, async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(contactMessages)
      .orderBy(desc(contactMessages.createdAt));
    res.json({ messages: rows });
  } catch (error) {
    console.error('Fetch messages failed:', error);
    res.status(500).json({ error: 'Unable to load contact messages.' });
  }
});

router.patch('/api/admin/messages/:id', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid message ID' });
    }
    const updates: Partial<{ isRead: boolean; isSpam: boolean }> = {};
    if (typeof req.body.isRead === 'boolean') updates.isRead = req.body.isRead;
    if (typeof req.body.isSpam === 'boolean') updates.isSpam = req.body.isSpam;

    const [updated] = await db
      .update(contactMessages)
      .set(updates)
      .where(eq(contactMessages.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Message not found' });
    }
    res.json({ message: updated });
  } catch (error) {
    console.error('Update message failed:', error);
    res.status(500).json({ error: 'Unable to update message.' });
  }
});

router.delete('/api/admin/messages/:id', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid message ID' });
    }
    await db.delete(contactMessages).where(eq(contactMessages.id, id));
    await logActivity(
      req.adminUser!.id,
      'delete_message',
      'message',
      id,
      `Deleted message #${id}`
    );
    res.json({ ok: true });
  } catch (error) {
    console.error('Delete message failed:', error);
    res.status(500).json({ error: 'Unable to delete message.' });
  }
});

// Admin Comments Moderation
router.get('/api/admin/comments', requireAdmin, async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: articleComments.id,
        articleId: articleComments.articleId,
        authorName: articleComments.authorName,
        authorEmail: articleComments.authorEmail,
        content: articleComments.content,
        status: articleComments.status,
        createdAt: articleComments.createdAt,
        articleTitleMr: articles.titleMr,
        articleSlug: articles.slug,
      })
      .from(articleComments)
      .leftJoin(articles, eq(articleComments.articleId, articles.id))
      .orderBy(desc(articleComments.createdAt));

    res.json({ comments: rows });
  } catch (error) {
    console.error('Fetch comments failed:', error);
    res.status(500).json({ error: 'Unable to load comments.' });
  }
});

router.patch('/api/admin/comments/:id', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const status = req.body.status;
    if (!Number.isInteger(id) || !['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid comment status update' });
    }
    const [updated] = await db
      .update(articleComments)
      .set({ status })
      .where(eq(articleComments.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: 'Comment not found' });
    res.json({ comment: updated });
  } catch (error) {
    console.error('Update comment failed:', error);
    res.status(500).json({ error: 'Unable to update comment.' });
  }
});

router.delete('/api/admin/comments/:id', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid ID' });
    await db.delete(articleComments).where(eq(articleComments.id, id));
    res.json({ ok: true });
  } catch (error) {
    console.error('Delete comment failed:', error);
    res.status(500).json({ error: 'Unable to delete comment.' });
  }
});

// Admin Site Settings
router.get('/api/admin/settings', requireAdmin, async (_req, res) => {
  try {
    await ensureInitialDataSeeded();
    const rows = await db.select().from(siteSettings);
    const settings: Record<string, string> = {};
    for (const r of rows) settings[r.key] = r.value;
    res.json({ settings });
  } catch (error) {
    console.error('Load settings failed:', error);
    res.status(500).json({ error: 'Unable to load settings.' });
  }
});

router.put('/api/admin/settings', requireAdmin, async (req: AuthRequest, res) => {
  try {
    const allowedKeys = [
      'instagram_url',
      'linkedin_url',
      'contact_email',
      'journal_note_mr',
      'journal_note_en',
      'profile_image_url',
      'profile_image_alt',
      'brand_logo_url',
    ];
    const body = req.body as Record<string, unknown>;
    const now = new Date();

    for (const urlKey of ['profile_image_url', 'brand_logo_url']) {
      if (typeof body[urlKey] === 'string') {
        const candidateUrl = (body[urlKey] as string).trim();
        if (
          candidateUrl &&
          (candidateUrl.startsWith('data:') || candidateUrl.startsWith('blob:'))
        ) {
          return res.status(400).json({
            error: 'Temporary data or blob URLs cannot be saved for site images.',
          });
        }
      }
    }

    for (const key of allowedKeys) {
      if (typeof body[key] === 'string') {
        const value = body[key].trim().slice(0, 1000);
        await db
          .insert(siteSettings)
          .values({ key, value, updatedAt: now })
          .onConflictDoUpdate({
            target: siteSettings.key,
            set: { value, updatedAt: now },
          });
      }
    }

    await logActivity(
      req.adminUser!.id,
      'update_settings',
      'settings',
      null,
      'Updated site & social link settings'
    );

    const rows = await db.select().from(siteSettings);
    const settings: Record<string, string> = {};
    for (const r of rows) settings[r.key] = r.value;
    res.json({ settings });
  } catch (error) {
    console.error('Update settings failed:', error);
    res.status(500).json({ error: 'Unable to save settings.' });
  }
});

export default router;
