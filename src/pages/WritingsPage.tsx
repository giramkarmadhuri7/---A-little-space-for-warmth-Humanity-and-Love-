import React, { useEffect, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { ArticleSummary } from '../types/index.ts';
import { useApp, useDocumentMeta } from '../context/AppContext.tsx';
import { ArticleCard } from '../components/ArticleCard.tsx';

export const WritingsPage: React.FC = () => {
  const { language, categories, currentSearch, navigate, t } = useApp();

  const params = new URLSearchParams(currentSearch);
  const initialCat = params.get('category') || 'all';
  const initialFeatured = params.get('featured') === 'true';

  const [selectedCategory, setSelectedCategory] = useState(initialCat);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('latest');
  const [featuredOnly, setFeaturedOnly] = useState(initialFeatured);
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useDocumentMeta(
    language === 'mr'
      ? 'लेखन दालन — मधुच्या जाणीवा | माधुरी'
      : 'Writings Library — Madhuchya Janiva | माधुरी',
    language === 'mr'
      ? 'मधुच्या जाणीवा मधील सर्व मराठी व इंग्रजी लेख, कथा आणि मनाच्या डायरीतील विचार.'
      : 'Browse all Marathi and English writings, stories, and reflections by माधुरी.'
  );

  useEffect(() => {
    const p = new URLSearchParams(currentSearch);
    setSelectedCategory(p.get('category') || 'all');
    setFeaturedOnly(p.get('featured') === 'true');
  }, [currentSearch]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    let active = true;
    async function fetchArticles() {
      setLoading(true);
      setError('');
      try {
        const qs = new URLSearchParams();
        if (selectedCategory && selectedCategory !== 'all') {
          qs.set('category', selectedCategory);
        }
        if (debouncedSearch) qs.set('search', debouncedSearch);
        if (featuredOnly) qs.set('featured', 'true');
        qs.set('sort', sortOrder);

        const res = await fetch(`/api/articles?${qs.toString()}`, {
          cache: 'no-store',
        });
        if (!res.ok) throw new Error('Unable to load writings.');
        const data = await res.json();
        if (active) setArticles(data.articles || []);
      } catch (err: unknown) {
        if (active) {
          setError(
            err instanceof Error ? err.message : 'Error loading writings.'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchArticles();
    return () => {
      active = false;
    };
  }, [selectedCategory, debouncedSearch, sortOrder, featuredOnly]);

  const selectCategory = (slug: string) => {
    setSelectedCategory(slug);
    const qs = new URLSearchParams();
    if (slug !== 'all') qs.set('category', slug);
    if (featuredOnly) qs.set('featured', 'true');
    const queryStr = qs.toString();
    navigate(queryStr ? `/writings?${queryStr}` : '/writings');
  };

  const resetAll = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setSortOrder('latest');
    setFeaturedOnly(false);
    setSelectedCategory('all');
    navigate('/writings');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
      <header className="max-w-2xl mb-10 space-y-3">
        <p className="text-xs tracking-widest uppercase font-medium text-[#4F6855] dark:text-[#8AA890]">
          {t.brandName}
        </p>
        <h1 className="font-editorial text-4xl sm:text-5xl font-semibold text-[#2B211C] dark:text-[#FAF6EF]">
          {language === 'mr' ? 'लेखन दालन' : 'Writings Library'}
        </h1>
        <p className="text-base text-[#6E5B50] dark:text-[#B8AA98]">
          {language === 'mr'
            ? 'मनातलं, माणसांसाठी — विविध विषयांवरचे विचार, अनुभव आणि कथा.'
            : 'Reflections, stories, and heartfelt notes organized across gentle life themes.'}
        </p>
      </header>

      {/* Search, Sort & Featured Controls */}
      <div className="flex flex-col md:flex-row gap-4 pb-6 border-b border-[#E5DCCD] dark:border-[#2C251F]">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#8A776A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] bg-[#FDFBF7] dark:bg-[#1E1915] focus:outline-none focus:ring-2 focus:ring-[#4F6855]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[#6E5B50] dark:text-[#B8AA98]" />
            <select
              value={sortOrder}
              onChange={(e) =>
                setSortOrder(e.target.value === 'oldest' ? 'oldest' : 'latest')
              }
              aria-label="Sort articles"
              className="px-3.5 py-2.5 text-sm rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] bg-[#FDFBF7] dark:bg-[#1E1915] focus:outline-none focus:ring-2 focus:ring-[#4F6855]"
            >
              <option value="latest">{t.sortLatest}</option>
              <option value="oldest">{t.sortOldest}</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setFeaturedOnly((prev) => !prev)}
            className={`px-4 py-2.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              featuredOnly
                ? 'bg-[#4F6855] border-[#4F6855] text-white'
                : 'border-[#D4C7B4] dark:border-[#3A3129] bg-[#FDFBF7] dark:bg-[#1E1915] text-[#4A3B32] dark:text-[#D9CEBE] hover:border-[#4F6855]'
            }`}
          >
            {t.featuredOnly}
          </button>
        </div>
      </div>

      {/* Interactive Category Filter Buttons */}
      <div
        role="tablist"
        aria-label="Filter by category"
        className="flex flex-wrap items-center gap-2 py-6"
      >
        <button
          type="button"
          onClick={() => selectCategory('all')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
            selectedCategory === 'all'
              ? 'bg-[#2B211C] dark:bg-[#EFE8DC] text-[#FAF6EF] dark:text-[#161310]'
              : 'bg-[#F3ECE1] dark:bg-[#221C17] text-[#5C4B42] dark:text-[#C5B7A4] hover:text-[#2B211C] dark:hover:text-[#FAF6EF]'
          }`}
        >
          {t.allCategories}
        </button>

        {categories.map((cat) => {
          const active = selectedCategory === cat.slug;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => selectCategory(cat.slug)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-[#4F6855] text-white'
                  : 'bg-[#F3ECE1] dark:bg-[#221C17] text-[#5C4B42] dark:text-[#C5B7A4] hover:text-[#2B211C] dark:hover:text-[#FAF6EF]'
              }`}
            >
              {language === 'en' ? cat.nameEn : cat.nameMr}
            </button>
          );
        })}
      </div>

      {/* Results */}
      {error ? (
        <div className="p-8 text-center rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-2">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="h-80 rounded-xl bg-[#EFE8DC] dark:bg-[#221C17] animate-pulse"
            />
          ))}
        </div>
      ) : articles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-2">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      ) : (
        <div className="py-16 px-6 text-center rounded-2xl border border-[#E5DCCD] dark:border-[#302821] bg-[#FDFBF7] dark:bg-[#1E1915] space-y-4">
          <p className="text-base text-[#6E5B50] dark:text-[#B8AA98]">
            {t.noArticlesFound}
          </p>
          <button
            type="button"
            onClick={resetAll}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] hover:border-[#4F6855]"
          >
            <X className="w-3.5 h-3.5" />
            <span>{t.clearFilters}</span>
          </button>
        </div>
      )}
    </div>
  );
};
