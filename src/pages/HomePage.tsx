import React, { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, Feather, Sparkles } from 'lucide-react';
import { ArticleSummary } from '../types/index.ts';
import { useApp, useDocumentMeta } from '../context/AppContext.tsx';
import { ArticleCard } from '../components/ArticleCard.tsx';
import { ResilientImage } from '../components/ResilientImage.tsx';
import { EDITORIAL_IMAGES } from '../lib/editorialAssets.ts';

export const HomePage: React.FC = () => {
  const {
    language,
    navigate,
    categories,
    settings,
    siteDataLoading,
    refreshSiteData,
    t,
  } = useApp();
  const [featured, setFeatured] = useState<ArticleSummary[]>([]);
  const [latest, setLatest] = useState<ArticleSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useDocumentMeta(
    language === 'mr'
      ? 'मधुच्या जाणीवा — मनातलं, माणसांसाठी, प्रेमासाठी आणि आयुष्याबद्दलच्या कृतज्ञतेसाठी... | माधुरी'
      : 'Madhuchya Janiva — From the heart, for people, for love, and in gratitude for life... | माधुरी',
    language === 'mr'
      ? 'मधुच्या जाणीवा — भावना, अनुभव आणि माणुसकीचं एक शांत आश्रयस्थान. माधुरी यांचे मराठी लेखन.'
      : 'Madhuchya Janiva — A quiet sanctuary of emotions, lived experiences, and Marathi storytelling by माधुरी.'
  );

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [featRes, latRes] = await Promise.all([
          fetch('/api/articles?featured=true&limit=2', { cache: 'no-store' }),
          fetch('/api/articles?limit=6', { cache: 'no-store' }),
        ]);
        const featData = await featRes.json();
        const latData = await latRes.json();
        if (active) {
          setFeatured(featData.articles || []);
          setLatest(latData.articles || []);
        }
      } catch (err) {
        console.error('Failed to load home articles:', err);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    refreshSiteData();
    return () => {
      active = false;
    };
  }, [refreshSiteData]);

  const profileImageUrl = settings.profile_image_url?.trim() || '';
  const profileImageAlt =
    settings.profile_image_alt?.trim() ||
    'माधुरी — मधुच्या जाणीवा (लेखिका परिचय)';

  const diaryNote =
    language === 'en'
      ? settings.journal_note_en || settings.journal_note_mr
      : settings.journal_note_mr;

  return (
    <div>
      {/* 1. Editorial Hero Split */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16 lg:pt-16 lg:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
            <p className="text-xs tracking-widest uppercase font-medium text-[#4F6855] dark:text-[#8AA890]">
              {t.brandTagline}
            </p>

            <h1 className="font-editorial text-4xl sm:text-5xl lg:text-6xl font-semibold text-[#2B211C] dark:text-[#FAF6EF] leading-[1.18] text-balance">
              {t.brandName}
            </h1>

            <div className="space-y-4 text-base sm:text-lg text-[#4A3B32] dark:text-[#D9CEBE] leading-relaxed whitespace-pre-line max-w-xl">
              {t.heroIntro}
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="button"
                onClick={() => navigate('/writings')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#4F6855] hover:bg-[#3F5544] text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0"
              >
                <BookOpen className="w-4 h-4" />
                <span>{t.readWritingsBtn}</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/about')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-[#CDBEAA] dark:border-[#3D332B] bg-[#F3ECE1] dark:bg-[#221C17] text-[#2B211C] dark:text-[#EFE8DC] hover:border-[#4F6855] dark:hover:border-[#8AA890] text-sm font-medium transition-colors whitespace-nowrap shrink-0"
              >
                <Feather className="w-4 h-4" />
                <span>{t.aboutMadhuriBtn}</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div
              className={`h-full min-h-[300px] lg:min-h-[440px] rounded-2xl overflow-hidden border border-[#E5DCCD] dark:border-[#302821] ${
                profileImageUrl
                  ? 'bg-[#F3ECE1]/60 dark:bg-[#1E1915] flex items-center justify-center'
                  : ''
              }`}
            >
              {siteDataLoading && !profileImageUrl ? (
                <div
                  className="w-full h-full min-h-[300px] lg:min-h-[440px] bg-[#EFE8DC]/70 dark:bg-[#221C17] animate-pulse"
                  aria-label="Loading profile image"
                />
              ) : profileImageUrl ? (
                <ResilientImage
                  key={profileImageUrl}
                  src={profileImageUrl}
                  alt={profileImageAlt}
                  fallbackLabel={t.brandName}
                  eager
                  className="w-full h-auto lg:h-full max-h-[540px] object-contain"
                />
              ) : (
                <ResilientImage
                  key="default-hero"
                  src={EDITORIAL_IMAGES.heroJournal}
                  alt="मधुच्या जाणीवा — खुली डायरी आणि सकाळचा चहा"
                  fallbackLabel={t.brandName}
                  eager
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Featured Writings */}
      {featured.length > 0 && (
        <section className="border-t border-[#E5DCCD] dark:border-[#2C251F] py-16 lg:py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
              <div>
                <h2 className="font-editorial text-3xl font-semibold text-[#2B211C] dark:text-[#FAF6EF]">
                  {t.featuredTitle}
                </h2>
                <p className="text-sm text-[#6E5B50] dark:text-[#B8AA98] mt-1.5">
                  {t.featuredSubtitle}
                </p>
              </div>
              <a
                href="/writings?featured=true"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/writings?featured=true');
                }}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#4F6855] dark:text-[#8AA890] hover:underline whitespace-nowrap shrink-0"
              >
                <span>{t.viewAllWritings}</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {featured.map((item) => (
                <ArticleCard key={item.id} article={item} featured />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 3. मनाच्या डायरीतुन (Diary Section) */}
      <section className="bg-[#F3ECE1]/75 dark:bg-[#1C1713] border-y border-[#E5DCCD] dark:border-[#2C251F] py-16 lg:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-5">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-[#DFD4C2] dark:border-[#342B24]">
                <ResilientImage
                  src={EDITORIAL_IMAGES.diaryFlowers}
                  alt="मनाच्या डायरीतुन — मोगरा, तुळस आणि डायरी"
                  fallbackLabel={t.diarySectionTitle}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="lg:col-span-7 space-y-5">
              <p className="text-xs tracking-widest uppercase font-medium text-[#4F6855] dark:text-[#8AA890]">
                {t.diarySectionKicker}
              </p>
              <h2 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#2B211C] dark:text-[#FAF6EF]">
                {t.diarySectionTitle}
              </h2>
              <p className="font-editorial text-xl sm:text-2xl text-[#3D2F28] dark:text-[#E5DAC8] leading-relaxed italic">
                “{diaryNote}”
              </p>
              <p className="text-sm text-[#6E5B50] dark:text-[#B8AA98]">
                — माधुरी
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Latest Articles */}
      <section className="py-16 lg:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="font-editorial text-3xl font-semibold text-[#2B211C] dark:text-[#FAF6EF]">
                {t.latestTitle}
              </h2>
              <p className="text-sm text-[#6E5B50] dark:text-[#B8AA98] mt-1.5">
                {t.latestSubtitle}
              </p>
            </div>
            <a
              href="/writings"
              onClick={(e) => {
                e.preventDefault();
                navigate('/writings');
              }}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#4F6855] dark:text-[#8AA890] hover:underline whitespace-nowrap shrink-0"
            >
              <span>{t.viewAllWritings}</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-80 rounded-xl bg-[#EFE8DC] dark:bg-[#221C17] animate-pulse"
                />
              ))}
            </div>
          ) : latest.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {latest.map((item) => (
                <ArticleCard key={item.id} article={item} />
              ))}
            </div>
          ) : (
            <div className="py-14 text-center border border-[#E5DCCD] dark:border-[#302821] rounded-xl bg-[#FDFBF7] dark:bg-[#1E1915]">
              <p className="text-[#6E5B50] dark:text-[#B8AA98]">
                {t.noArticlesFound}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 5. Popular Categories */}
      <section className="border-t border-[#E5DCCD] dark:border-[#2C251F] py-16 lg:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <h2 className="font-editorial text-3xl font-semibold text-[#2B211C] dark:text-[#FAF6EF]">
              {t.categoriesTitle}
            </h2>
            <p className="text-sm text-[#6E5B50] dark:text-[#B8AA98] mt-1.5">
              {t.categoriesSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
            {categories.map((cat, idx) => (
              <button
                key={cat.id}
                type="button"
                onClick={() =>
                  navigate(`/writings?category=${encodeURIComponent(cat.slug)}`)
                }
                className="group text-left py-4 border-b border-[#E5DCCD] dark:border-[#2C251F] flex items-baseline justify-between gap-4 hover:border-[#4F6855] dark:hover:border-[#8AA890] transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-baseline gap-3">
                    <span className="text-xs font-mono tabular-nums text-[#8A776A] dark:text-[#968778]">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="font-editorial text-xl font-medium text-[#2B211C] dark:text-[#FAF6EF] group-hover:text-[#4F6855] dark:group-hover:text-[#8AA890] transition-colors">
                      {language === 'en' ? cat.nameEn : cat.nameMr}
                    </span>
                  </div>
                  <p className="text-xs text-[#6E5B50] dark:text-[#A99A88] line-clamp-1 pl-7">
                    {language === 'en' ? cat.descriptionEn : cat.descriptionMr}
                  </p>
                </div>
                <span className="text-xs tabular-nums text-[#6E5B50] dark:text-[#A99A88] shrink-0">
                  {cat.articleCount ?? 0}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Personal Note & Gratitude Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8">
        <div className="rounded-2xl overflow-hidden border border-[#E5DCCD] dark:border-[#302821] bg-[#FDFBF7] dark:bg-[#1E1915]">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
            <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-center space-y-6">
              <div className="flex items-center gap-2 text-xs tracking-widest uppercase font-medium text-[#4F6855] dark:text-[#8AA890]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t.gratitudeTitle}</span>
              </div>

              <blockquote className="font-editorial text-2xl sm:text-3xl text-[#2B211C] dark:text-[#FAF6EF] leading-relaxed">
                “{t.vitthalQuote}”
              </blockquote>

              <div className="pt-4 border-t border-[#ECE4D7] dark:border-[#2C251F] space-y-2">
                <h3 className="font-editorial text-lg font-medium text-[#2B211C] dark:text-[#FAF6EF]">
                  {t.personalNoteTitle}
                </h3>
                <p className="text-sm text-[#5C4B42] dark:text-[#C5B7A4] leading-relaxed">
                  {t.personalNoteBody}
                </p>
              </div>
            </div>

            <div className="lg:col-span-5 min-h-[260px]">
              <ResilientImage
                src={EDITORIAL_IMAGES.naturePath}
                alt="पहाटेची शांत निसर्ग वाट — कृतज्ञता व शांतता"
                fallbackLabel={t.gratitudeTitle}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
