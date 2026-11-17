import React, { useState } from 'react';
import { Menu, Moon, Sun, X, Instagram, Linkedin, Mail } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { BrandLogo } from './BrandLogo.tsx';

export const Layout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const {
    language,
    toggleLanguage,
    theme,
    toggleTheme,
    currentPath,
    navigate,
    settings,
    t,
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [subEmail, setSubEmail] = useState('');
  const [subName, setSubName] = useState('');
  const [subState, setSubState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [subMsg, setSubMsg] = useState('');

  const navItems = [
    { path: '/', label: t.navHome },
    { path: '/writings', label: t.navWritings },
    { path: '/about', label: t.navAbout },
    { path: '/contact', label: t.navContact },
  ];

  const handleNavClick = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    navigate(path);
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subEmail.trim()) return;
    setSubState('loading');
    setSubMsg('');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: subEmail.trim(),
          name: subName.trim(),
          preferredLanguage: language,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Subscription failed');
      setSubState('success');
      setSubMsg(t.subscribedSuccess);
      setSubEmail('');
      setSubName('');
    } catch (err: unknown) {
      setSubState('error');
      setSubMsg(
        err instanceof Error ? err.message : 'Unable to subscribe right now.'
      );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF6EF] text-[#2B211C] dark:bg-[#161310] dark:text-[#EFE8DC] transition-colors duration-200">
      {/* 3-Zone Top Bar */}
      <header className="sticky top-0 z-40 border-b border-[#E5DCCD] dark:border-[#2C251F] bg-[#FAF6EF]/95 dark:bg-[#161310]/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Emblem & Wordmark */}
          <a
            href="/"
            onClick={(e) => handleNavClick(e, '/')}
            className="inline-flex items-center gap-2.5 sm:gap-3 font-editorial text-lg sm:text-2xl font-semibold tracking-tight text-[#2B211C] dark:text-[#FAF6EF] whitespace-nowrap shrink-0"
          >
            <BrandLogo size="sm" />
            <span>
              {language === 'mr' ? 'मधुच्या जाणीवा ✨' : 'Madhuchya Janiva ✨'}
            </span>
          </a>

          {/* Zone 2: Clean Single-Line Nav Links */}
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-[#5C4B42] dark:text-[#C9BCA9]"
          >
            {navItems.map((item) => {
              const active =
                item.path === '/'
                  ? currentPath === '/'
                  : currentPath.startsWith(item.path);
              return (
                <a
                  key={item.path}
                  href={item.path}
                  onClick={(e) => handleNavClick(e, item.path)}
                  className={`whitespace-nowrap shrink-0 py-1 border-b transition-colors duration-150 ${
                    active
                      ? 'text-[#2B211C] dark:text-[#FAF6EF] border-[#4F6855] dark:border-[#8AA890]'
                      : 'border-transparent hover:text-[#2B211C] dark:hover:text-[#FAF6EF]'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary Action (Language Switch) + Mobile Menu Button */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={toggleLanguage}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] bg-[#F3ECE1] dark:bg-[#221C17] text-[#2B211C] dark:text-[#EFE8DC] hover:border-[#4F6855] dark:hover:border-[#8AA890] transition-colors whitespace-nowrap shrink-0"
              aria-label="Switch Language"
            >
              {language === 'mr' ? 'English' : 'मराठी'}
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="md:hidden p-2 rounded-lg text-[#4A3B32] dark:text-[#E5DCCD] hover:bg-[#EFE7DA] dark:hover:bg-[#241E19]"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#E5DCCD] dark:border-[#2C251F] bg-[#FAF6EF] dark:bg-[#161310] px-4 py-4 space-y-2">
            {navItems.map((item) => (
              <a
                key={item.path}
                href={item.path}
                onClick={(e) => handleNavClick(e, item.path)}
                className="block py-2.5 px-3 rounded-lg text-base font-medium text-[#2B211C] dark:text-[#EFE8DC] hover:bg-[#F3ECE1] dark:hover:bg-[#221C17]"
              >
                {item.label}
              </a>
            ))}
            <div className="pt-2 border-t border-[#E5DCCD] dark:border-[#2C251F] flex items-center justify-between px-3 py-2">
              <span className="text-sm text-[#6E5B50] dark:text-[#B8AA98]">
                {t.darkModeLabel}
              </span>
              <button
                type="button"
                onClick={toggleTheme}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] text-xs font-medium"
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-4 h-4" /> Light
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4" /> Dark
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Editorial Footer */}
      <footer className="border-t border-[#E5DCCD] dark:border-[#2C251F] bg-[#F3ECE1]/70 dark:bg-[#1B1713] mt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 pb-12 border-b border-[#E2D8C7] dark:border-[#2C251F]">
            {/* Brand & Philosophy */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center gap-3">
                <BrandLogo size="md" />
                <p className="font-editorial text-2xl font-semibold text-[#2B211C] dark:text-[#FAF6EF]">
                  {language === 'mr' ? 'मधुच्या जाणीवा ✨' : 'Madhuchya Janiva ✨'}
                </p>
              </div>
              <p className="text-sm text-[#5C4B42] dark:text-[#C5B7A4] leading-relaxed max-w-md">
                {t.brandTagline}
              </p>

              {/* Social & Theme Controls */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                {settings.instagram_url && (
                  <a
                    href={settings.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-[#4F6855] dark:text-[#8AA890] hover:underline"
                  >
                    <Instagram className="w-4 h-4" />
                    <span>Instagram</span>
                  </a>
                )}
                {settings.linkedin_url && (
                  <a
                    href={settings.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-[#4F6855] dark:text-[#8AA890] hover:underline"
                  >
                    <Linkedin className="w-4 h-4" />
                    <span>LinkedIn</span>
                  </a>
                )}
                {settings.contact_email && (
                  <a
                    href={`mailto:${settings.contact_email}`}
                    className="inline-flex items-center gap-1.5 text-sm text-[#4F6855] dark:text-[#8AA890] hover:underline"
                  >
                    <Mail className="w-4 h-4" />
                    <span>{settings.contact_email}</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={toggleTheme}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] text-[#5C4B42] dark:text-[#C5B7A4] hover:text-[#2B211C] dark:hover:text-[#FAF6EF] transition-colors"
                >
                  {theme === 'dark' ? (
                    <>
                      <Sun className="w-3.5 h-3.5" />
                      <span>{language === 'mr' ? 'दिवसाचा मोड' : 'Light Mode'}</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-3.5 h-3.5" />
                      <span>{language === 'mr' ? 'रात्रीचा वाचन मोड' : 'Dark Reading'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Quiet Newsletter Subscription */}
            <div className="lg:col-span-7">
              <h3 className="font-editorial text-xl font-medium text-[#2B211C] dark:text-[#FAF6EF]">
                {t.newsletterTitle}
              </h3>
              <p className="text-sm text-[#6E5B50] dark:text-[#B8AA98] mt-1.5 mb-4">
                {t.newsletterSubtitle}
              </p>

              <form
                onSubmit={handleSubscribe}
                className="flex flex-col sm:flex-row gap-3"
              >
                <input
                  type="text"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  placeholder={t.newsletterNamePlaceholder}
                  className="sm:w-44 px-3.5 py-2.5 text-sm rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] bg-[#FAF6EF] dark:bg-[#161310] focus:outline-none focus:ring-2 focus:ring-[#4F6855]"
                />
                <input
                  type="email"
                  required
                  value={subEmail}
                  onChange={(e) => setSubEmail(e.target.value)}
                  placeholder={t.newsletterPlaceholder}
                  className="flex-1 px-3.5 py-2.5 text-sm rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] bg-[#FAF6EF] dark:bg-[#161310] focus:outline-none focus:ring-2 focus:ring-[#4F6855]"
                />
                <button
                  type="submit"
                  disabled={subState === 'loading'}
                  className="px-5 py-2.5 text-sm font-medium rounded-lg bg-[#4F6855] hover:bg-[#3F5544] text-white transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
                >
                  {t.subscribeBtn}
                </button>
              </form>
              {subMsg && (
                <p
                  className={`text-xs mt-2.5 ${
                    subState === 'error'
                      ? 'text-red-700 dark:text-red-400'
                      : 'text-[#4F6855] dark:text-[#8AA890]'
                  }`}
                >
                  {subMsg}
                </p>
              )}
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6E5B50] dark:text-[#9E907E]">
            <p>
              © {new Date().getFullYear()} {t.brandName} · {t.footerRights}
            </p>
            <div className="flex items-center gap-6">
              <a
                href="/writings"
                onClick={(e) => handleNavClick(e, '/writings')}
                className="hover:text-[#2B211C] dark:hover:text-[#FAF6EF] transition-colors"
              >
                {t.navWritings}
              </a>
              <a
                href="/about"
                onClick={(e) => handleNavClick(e, '/about')}
                className="hover:text-[#2B211C] dark:hover:text-[#FAF6EF] transition-colors"
              >
                {t.navAbout}
              </a>
              <a
                href="/contact"
                onClick={(e) => handleNavClick(e, '/contact')}
                className="hover:text-[#2B211C] dark:hover:text-[#FAF6EF] transition-colors"
              >
                {t.navContact}
              </a>
              <a
                href="/admin"
                onClick={(e) => handleNavClick(e, '/admin')}
                className="hover:text-[#4F6855] dark:hover:text-[#8AA890] transition-colors"
              >
                {t.footerAdminLink}
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
