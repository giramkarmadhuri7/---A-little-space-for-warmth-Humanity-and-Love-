import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { ArticleSummary } from '../types/index.ts';
import { useApp } from '../context/AppContext.tsx';
import { formatPublishedDate } from '../i18n/translations.ts';
import { ResilientImage } from './ResilientImage.tsx';

interface ArticleCardProps {
  article: ArticleSummary;
  featured?: boolean;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({
  article,
  featured = false,
}) => {
  const { language, navigate, t } = useApp();

  const useEnglish = language === 'en' && article.translationEn;
  const displayTitle = useEnglish
    ? article.translationEn!.title
    : article.titleMr;
  const displayExcerpt = useEnglish
    ? article.translationEn!.excerpt || article.excerptMr
    : article.excerptMr;
  const categoryLabel =
    language === 'en'
      ? article.categoryNameEn || article.categoryNameMr
      : article.categoryNameMr || article.categoryNameEn;

  const dateText = formatPublishedDate(
    article.publishedAt || article.createdAt,
    language
  );

  const handleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(`/writings/${encodeURIComponent(article.slug)}`);
  };

  return (
    <article className="group flex flex-col bg-[#FDFBF7] dark:bg-[#1E1915] border border-[#E5DCCD] dark:border-[#302821] rounded-xl overflow-hidden transition-transform duration-200 hover:-translate-y-0.5">
      <a
        href={`/writings/${encodeURIComponent(article.slug)}`}
        onClick={handleOpen}
        className="flex items-center justify-center overflow-hidden aspect-[4/3] bg-[#EFE8DC]/75 dark:bg-[#221C17]"
      >
        <ResilientImage
          src={article.featuredImageUrl}
          alt={article.featuredImageAlt || displayTitle}
          fallbackLabel={displayTitle}
          className={
            article.featuredImageUrl
              ? 'w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.02]'
              : 'w-full h-full'
          }
        />
      </a>

      <div className="flex-1 flex flex-col p-6">
        {/* Clean unboxed typographic metadata (Zero-Pill Rule) */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#6E5B50] dark:text-[#B8AA98] mb-3">
          {categoryLabel && (
            <span className="font-medium text-[#4F6855] dark:text-[#8AA890]">
              {categoryLabel}
            </span>
          )}
          {categoryLabel && dateText && <span aria-hidden="true">·</span>}
          {dateText && <time>{dateText}</time>}
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">
            {article.readingTimeMinutes} {t.minutesRead}
          </span>
          {article.isSample && (
            <>
              <span aria-hidden="true">·</span>
              <span className="italic text-[#8C6D3F] dark:text-[#CFA86A]">
                {t.sampleBadge}
              </span>
            </>
          )}
        </div>

        <h3
          className={`font-editorial font-semibold text-[#2B211C] dark:text-[#FAF6EF] leading-snug mb-3 text-balance ${
            featured ? 'text-2xl' : 'text-xl'
          }`}
        >
          <a
            href={`/writings/${encodeURIComponent(article.slug)}`}
            onClick={handleOpen}
            className="hover:text-[#4F6855] dark:hover:text-[#8AA890] transition-colors"
          >
            {displayTitle}
          </a>
        </h3>

        {displayExcerpt && (
          <p className="text-sm text-[#5C4B42] dark:text-[#C5B7A4] leading-relaxed line-clamp-3 mb-5 flex-1">
            {displayExcerpt}
          </p>
        )}

        <div className="pt-4 border-t border-[#ECE4D7] dark:border-[#2C251F] flex items-center justify-between text-xs text-[#6E5B50] dark:text-[#A99A88]">
          <span>{article.authorName || 'माधुरी'}</span>
          <a
            href={`/writings/${encodeURIComponent(article.slug)}`}
            onClick={handleOpen}
            className="inline-flex items-center gap-1 font-medium text-[#4F6855] dark:text-[#8AA890] hover:underline"
          >
            <span>{language === 'mr' ? 'वाचा' : 'Read'}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </article>
  );
};
