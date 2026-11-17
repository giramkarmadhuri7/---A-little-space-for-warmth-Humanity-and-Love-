import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Heart,
  Moon,
  Share2,
  Sun,
} from 'lucide-react';
import { ArticleDetail, ArticleSummary } from '../types/index.ts';
import { useApp, useDocumentMeta } from '../context/AppContext.tsx';
import { formatPublishedDate } from '../i18n/translations.ts';
import { ResilientImage } from '../components/ResilientImage.tsx';
import { ArticleCard } from '../components/ArticleCard.tsx';

interface ArticleDetailPageProps {
  slug: string;
}

export const ArticleDetailPage: React.FC<ArticleDetailPageProps> = ({
  slug,
}) => {
  const { language, setLanguage, theme, toggleTheme, navigate, t } = useApp();

  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [related, setRelated] = useState<ArticleSummary[]>([]);
  const [prevArticle, setPrevArticle] = useState<{ slug: string; titleMr: string } | null>(null);
  const [nextArticle, setNextArticle] = useState<{ slug: string; titleMr: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [copied, setCopied] = useState(false);
  const [appreciated, setAppreciated] = useState(false);
  const [appreciationCount, setAppreciationCount] = useState(0);

  // Comment state
  const [cName, setCName] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cContent, setCContent] = useState('');
  const [cWebsite, setCWebsite] = useState('');
  const [cState, setCState] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [cMsg, setCMsg] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setNotFound(false);
    setAppreciated(false);

    async function loadArticle() {
      try {
        const res = await fetch(`/api/articles/${encodeURIComponent(slug)}`, {
          cache: 'no-store',
        });
        if (res.status === 404) {
          if (active) setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error('Failed to load article');
        const data = await res.json();
        if (active) {
          setArticle(data.article);
          setAppreciationCount(data.article?.appreciationCount ?? 0);
          setRelated(data.related || []);
          setPrevArticle(data.previousArticle || null);
          setNextArticle(data.nextArticle || null);
        }
      } catch (err) {
        console.error('Error loading article:', err);
        if (active) setNotFound(true);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadArticle();
    return () => {
      active = false;
    };
  }, [slug]);

  const hasEnglish = Boolean(article?.translationEn);
  const showingEnglish = language === 'en' && hasEnglish;

  const displayTitle = article
    ? showingEnglish
      ? article.translationEn!.title
      : article.titleMr
    : t.brandName;

  const displayExcerpt = article
    ? showingEnglish
      ? article.translationEn!.excerpt || article.excerptMr
      : article.excerptMr
    : '';

  const displayContent = article
    ? showingEnglish
      ? article.translationEn!.content || article.contentMr
      : article.contentMr
    : '';

  const seoTitle = article
    ? showingEnglish
      ? article.translationEn!.seoTitle || `${displayTitle} — ${t.brandName}`
      : article.seoTitleMr || `${displayTitle} — ${t.brandName}`
    : t.brandName;

  const seoDesc = article
    ? showingEnglish
      ? article.translationEn!.seoDescription || displayExcerpt
      : article.seoDescriptionMr || displayExcerpt
    : '';

  useDocumentMeta(seoTitle, seoDesc || t.brandTagline);

  // Inject Article Schema.org JSON-LD when article loads
  useEffect(() => {
    if (!article) return;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'article-jsonld';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: displayTitle,
      description: displayExcerpt,
      image: article.featuredImageUrl || undefined,
      author: {
        '@type': 'Person',
        name: article.authorName || 'माधुरी',
      },
      datePublished: article.publishedAt || article.createdAt,
      inLanguage: showingEnglish ? 'en' : 'mr',
    });
    const old = document.getElementById('article-jsonld');
    if (old) old.remove();
    document.head.appendChild(script);
    return () => {
      document.getElementById('article-jsonld')?.remove();
    };
  }, [article, displayTitle, displayExcerpt, showingEnglish]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback ignored
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: displayTitle,
          text: displayExcerpt || t.brandTagline,
          url: window.location.href,
        });
        return;
      } catch {
        // User cancelled or unsupported
      }
    }
    handleCopyLink();
  };

  const handleAppreciate = async () => {
    if (appreciated || !article) return;
    setAppreciated(true);
    setAppreciationCount((prev) => prev + 1);
    try {
      const res = await fetch(
        `/api/articles/${encodeURIComponent(article.slug)}/appreciate`,
        { method: 'POST' }
      );
      if (res.ok) {
        const data = await res.json();
        setAppreciationCount(data.appreciationCount);
      }
    } catch {
      // keep optimistic UI
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!article) return;
    setCState('submitting');
    setCMsg('');
    try {
      const res = await fetch(
        `/api/articles/${encodeURIComponent(article.slug)}/comments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            authorName: cName,
            authorEmail: cEmail,
            content: cContent,
            website: cWebsite,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not submit reflection.');
      setCState('done');
      setCMsg(t.commentSubmittedMsg);
      setCName('');
      setCEmail('');
      setCContent('');
    } catch (err: unknown) {
      setCState('error');
      setCMsg(err instanceof Error ? err.message : 'Unable to send reflection.');
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 space-y-6 animate-pulse">
        <div className="h-6 w-40 bg-[#EFE8DC] dark:bg-[#221C17] rounded" />
        <div className="h-12 w-full bg-[#EFE8DC] dark:bg-[#221C17] rounded" />
        <div className="h-72 w-full bg-[#EFE8DC] dark:bg-[#221C17] rounded-2xl" />
        <div className="space-y-3 pt-4">
          <div className="h-4 w-full bg-[#EFE8DC] dark:bg-[#221C17] rounded" />
          <div className="h-4 w-5/6 bg-[#EFE8DC] dark:bg-[#221C17] rounded" />
          <div className="h-4 w-4/6 bg-[#EFE8DC] dark:bg-[#221C17] rounded" />
        </div>
      </div>
    );
  }

  if (notFound || !article) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center space-y-5">
        <h1 className="font-editorial text-3xl font-semibold text-[#2B211C] dark:text-[#FAF6EF]">
          {language === 'mr' ? 'लेख सापडला नाही' : 'Writing Not Found'}
        </h1>
        <p className="text-sm text-[#6E5B50] dark:text-[#B8AA98]">
          {language === 'mr'
            ? 'तुम्ही शोधत असलेला लेख कदाचित काढलेला असेल किंवा अजून प्रकाशित झालेला नसेल.'
            : 'The writing you are looking for may have moved or is not published yet.'}
        </p>
        <button
          type="button"
          onClick={() => navigate('/writings')}
          className="px-5 py-2.5 rounded-lg bg-[#4F6855] text-white text-sm font-medium"
        >
          {t.backToWritings}
        </button>
      </div>
    );
  }

  const categoryLabel =
    language === 'en'
      ? article.categoryNameEn || article.categoryNameMr
      : article.categoryNameMr || article.categoryNameEn;

  const dateText = formatPublishedDate(
    article.publishedAt || article.createdAt,
    language
  );

  return (
    <article className="pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
        {/* Subtle Top Breadcrumb & Comfort Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-8">
          <a
            href="/writings"
            onClick={(e) => {
              e.preventDefault();
              navigate('/writings');
            }}
            className="inline-flex items-center gap-1.5 text-sm text-[#6E5B50] dark:text-[#B8AA98] hover:text-[#2B211C] dark:hover:text-[#FAF6EF] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t.backToWritings}</span>
          </a>

          <div className="flex items-center gap-2">
            {/* Article-level Bilingual Switch */}
            <div className="inline-flex rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] p-0.5 bg-[#F3ECE1] dark:bg-[#221C17]">
              <button
                type="button"
                onClick={() => setLanguage('mr')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  language === 'mr'
                    ? 'bg-[#FAF6EF] dark:bg-[#161310] text-[#2B211C] dark:text-[#FAF6EF] shadow-xs'
                    : 'text-[#6E5B50] dark:text-[#B8AA98]'
                }`}
              >
                मराठी
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  language === 'en'
                    ? 'bg-[#FAF6EF] dark:bg-[#161310] text-[#2B211C] dark:text-[#FAF6EF] shadow-xs'
                    : 'text-[#6E5B50] dark:text-[#B8AA98]'
                }`}
              >
                English
              </button>
            </div>

            {/* Peaceful Reading Dark/Light Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] bg-[#F3ECE1] dark:bg-[#221C17] text-[#5C4B42] dark:text-[#C5B7A4] hover:text-[#2B211C] dark:hover:text-[#FAF6EF]"
              title={t.darkModeLabel}
              aria-label={t.darkModeLabel}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* English Unavailable Gentle Notice (Never replaces Marathi original!) */}
        {language === 'en' && !hasEnglish && (
          <div className="mb-8 px-4 py-3 rounded-xl border border-[#DFD4C2] dark:border-[#342B24] bg-[#F3ECE1] dark:bg-[#221C17] text-sm text-[#5C4B42] dark:text-[#D5C9B6]">
            {t.englishUnavailableBanner}
          </div>
        )}

        {/* Header */}
        <header className="space-y-5 mb-10">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#6E5B50] dark:text-[#B8AA98]">
            {categoryLabel && (
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/writings?category=${encodeURIComponent(
                      article.categorySlug || ''
                    )}`
                  )
                }
                className="font-medium text-[#4F6855] dark:text-[#8AA890] hover:underline"
              >
                {categoryLabel}
              </button>
            )}
            {categoryLabel && dateText && <span aria-hidden="true">·</span>}
            {dateText && <time>{dateText}</time>}
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">
              {article.readingTimeMinutes} {t.minutesRead}
            </span>
            <span aria-hidden="true">·</span>
            <span>{t.byAuthor}</span>
            {article.isSample && (
              <>
                <span aria-hidden="true">·</span>
                <span className="italic text-[#8C6D3F] dark:text-[#CFA86A]">
                  {t.sampleBadge}
                </span>
              </>
            )}
          </div>

          <h1 className="font-editorial text-3xl sm:text-4xl lg:text-5xl font-semibold text-[#2B211C] dark:text-[#FAF6EF] leading-[1.24] text-balance">
            {displayTitle}
          </h1>

          {displayExcerpt && (
            <p className="text-lg text-[#5C4B42] dark:text-[#C9BCA9] leading-relaxed">
              {displayExcerpt}
            </p>
          )}
        </header>

        {/* Featured / Cover Image (preserves original aspect ratio) */}
        {article.featuredImageUrl && (
          <figure className="mb-12">
            <div className="rounded-2xl overflow-hidden border border-[#E5DCCD] dark:border-[#302821] bg-[#F3ECE1]/60 dark:bg-[#1E1915] flex items-center justify-center">
              <ResilientImage
                src={article.featuredImageUrl}
                alt={article.featuredImageAlt || displayTitle}
                fallbackLabel={displayTitle}
                className="w-full h-auto max-h-[75vh] object-contain"
              />
            </div>
            {article.featuredImageAlt && (
              <figcaption className="mt-2.5 text-xs text-[#6E5B50] dark:text-[#9E907E] italic text-center">
                {article.featuredImageAlt}
              </figcaption>
            )}
          </figure>
        )}

        {/* Main Reading Canvas */}
        <div
          className="journal-prose max-w-prose mx-auto text-[#2B211C] dark:text-[#EFE8DC]"
          dangerouslySetInnerHTML={{ __html: displayContent }}
        />

        {/* Tags (Zero-Pill clean typographic text) */}
        {article.tags && article.tags.length > 0 && (
          <div className="max-w-prose mx-auto mt-10 pt-6 border-t border-[#E5DCCD] dark:border-[#2C251F] flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6E5B50] dark:text-[#B8AA98]">
            <span className="font-medium">
              {language === 'mr' ? 'टॅग्स:' : 'Tags:'}
            </span>
            {article.tags.map((tg, idx) => (
              <React.Fragment key={tg.id}>
                {idx > 0 && <span aria-hidden="true">·</span>}
                <span>#{language === 'en' ? tg.nameEn : tg.nameMr}</span>
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Author Attribution + Appreciation + Share Toolbar */}
        <div className="max-w-prose mx-auto mt-10 py-6 border-y border-[#E5DCCD] dark:border-[#2C251F] flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-editorial text-lg font-medium text-[#2B211C] dark:text-[#FAF6EF]">
              — {article.authorName || 'माधुरी'}
            </p>
            <p className="text-xs text-[#6E5B50] dark:text-[#B8AA98]">
              {t.brandName} · {t.brandTagline}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleAppreciate}
              disabled={appreciated}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg border transition-colors ${
                appreciated
                  ? 'bg-[#4F6855] border-[#4F6855] text-white'
                  : 'border-[#D4C7B4] dark:border-[#3A3129] bg-[#F3ECE1] dark:bg-[#221C17] hover:border-[#4F6855]'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${appreciated ? 'fill-current' : ''}`} />
              <span>{t.appreciateBtn}</span>
              <span className="tabular-nums opacity-80">({appreciationCount})</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] bg-[#FDFBF7] dark:bg-[#1E1915] hover:border-[#4F6855] transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#4F6855]" />
                  <span>{t.linkCopied}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>{t.copyLink}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleNativeShare}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] bg-[#FDFBF7] dark:bg-[#1E1915] hover:border-[#4F6855] transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{t.shareArticle}</span>
            </button>
          </div>
        </div>

        {/* Previous / Next Article Navigation */}
        {(prevArticle || nextArticle) && (
          <nav
            aria-label="Article navigation"
            className="max-w-prose mx-auto mt-10 grid grid-cols-1 sm:grid-cols-2 gap-6"
          >
            <div>
              {prevArticle && (
                <a
                  href={`/writings/${encodeURIComponent(prevArticle.slug)}`}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/writings/${encodeURIComponent(prevArticle.slug)}`);
                  }}
                  className="block p-4 rounded-xl border border-[#E5DCCD] dark:border-[#302821] hover:border-[#4F6855] transition-colors"
                >
                  <span className="inline-flex items-center gap-1 text-xs text-[#6E5B50] dark:text-[#B8AA98] mb-1">
                    <ArrowLeft className="w-3.5 h-3.5" />
                    {t.prevArticle}
                  </span>
                  <p className="font-editorial text-base font-medium text-[#2B211C] dark:text-[#FAF6EF] line-clamp-2">
                    {prevArticle.titleMr}
                  </p>
                </a>
              )}
            </div>
            <div>
              {nextArticle && (
                <a
                  href={`/writings/${encodeURIComponent(nextArticle.slug)}`}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/writings/${encodeURIComponent(nextArticle.slug)}`);
                  }}
                  className="block p-4 rounded-xl border border-[#E5DCCD] dark:border-[#302821] hover:border-[#4F6855] transition-colors sm:text-right"
                >
                  <span className="inline-flex items-center gap-1 text-xs text-[#6E5B50] dark:text-[#B8AA98] mb-1 sm:justify-end">
                    {t.nextArticle}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                  <p className="font-editorial text-base font-medium text-[#2B211C] dark:text-[#FAF6EF] line-clamp-2">
                    {nextArticle.titleMr}
                  </p>
                </a>
              )}
            </div>
          </nav>
        )}

        {/* Moderated Reader Reflections */}
        <section className="max-w-prose mx-auto mt-16 pt-10 border-t border-[#E5DCCD] dark:border-[#2C251F] space-y-8">
          <h2 className="font-editorial text-2xl font-semibold text-[#2B211C] dark:text-[#FAF6EF]">
            {t.commentsTitle}
          </h2>

          {article.comments && article.comments.length > 0 ? (
            <div className="space-y-4">
              {article.comments.map((cm) => (
                <div
                  key={cm.id}
                  className="p-5 rounded-xl bg-[#FDFBF7] dark:bg-[#1E1915] border border-[#E5DCCD] dark:border-[#302821] space-y-2"
                >
                  <div className="flex items-center justify-between text-xs text-[#6E5B50] dark:text-[#B8AA98]">
                    <span className="font-medium text-[#2B211C] dark:text-[#FAF6EF]">
                      {cm.authorName}
                    </span>
                    <time>{formatPublishedDate(cm.createdAt, language)}</time>
                  </div>
                  <p className="text-sm text-[#3D2F28] dark:text-[#DFD4C3] leading-relaxed whitespace-pre-line">
                    {cm.content}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#6E5B50] dark:text-[#B8AA98]">
              {t.noCommentsYet}
            </p>
          )}

          <form
            onSubmit={handleCommentSubmit}
            className="p-6 rounded-xl bg-[#F3ECE1]/60 dark:bg-[#1E1915] border border-[#E5DCCD] dark:border-[#302821] space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#5C4B42] dark:text-[#C5B7A4] mb-1.5">
                  {t.commentNameLabel} *
                </label>
                <input
                  type="text"
                  required
                  value={cName}
                  onChange={(e) => setCName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] bg-[#FAF6EF] dark:bg-[#161310] focus:outline-none focus:ring-2 focus:ring-[#4F6855]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#5C4B42] dark:text-[#C5B7A4] mb-1.5">
                  {t.commentEmailLabel}
                </label>
                <input
                  type="email"
                  value={cEmail}
                  onChange={(e) => setCEmail(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] bg-[#FAF6EF] dark:bg-[#161310] focus:outline-none focus:ring-2 focus:ring-[#4F6855]"
                />
              </div>
            </div>

            {/* Honeypot */}
            <input
              type="text"
              value={cWebsite}
              onChange={(e) => setCWebsite(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              className="hidden"
              aria-hidden="true"
            />

            <div>
              <label className="block text-xs font-medium text-[#5C4B42] dark:text-[#C5B7A4] mb-1.5">
                {t.commentBodyLabel} *
              </label>
              <textarea
                required
                rows={3}
                value={cContent}
                onChange={(e) => setCContent(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] bg-[#FAF6EF] dark:bg-[#161310] focus:outline-none focus:ring-2 focus:ring-[#4F6855]"
              />
            </div>

            <button
              type="submit"
              disabled={cState === 'submitting'}
              className="px-5 py-2.5 text-xs font-medium rounded-lg bg-[#4F6855] hover:bg-[#3F5544] text-white transition-colors disabled:opacity-60"
            >
              {t.commentSubmitBtn}
            </button>

            {cMsg && (
              <p
                className={`text-xs ${
                  cState === 'error'
                    ? 'text-red-700 dark:text-red-400'
                    : 'text-[#4F6855] dark:text-[#8AA890]'
                }`}
              >
                {cMsg}
              </p>
            )}
          </form>
        </section>
      </div>

      {/* Related Articles */}
      {related.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 pt-12 border-t border-[#E5DCCD] dark:border-[#2C251F]">
          <h2 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#2B211C] dark:text-[#FAF6EF] mb-8">
            {t.relatedTitle}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {related.map((item) => (
              <ArticleCard key={item.id} article={item} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
};
