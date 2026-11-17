import React, { useRef, useState } from 'react';
import { CheckCircle2, Instagram, Linkedin, Mail, Send } from 'lucide-react';
import { useApp, useDocumentMeta } from '../context/AppContext.tsx';

export const ContactPage: React.FC = () => {
  const { language, settings, t } = useApp();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const renderedAtRef = useRef(Date.now());

  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [feedback, setFeedback] = useState('');

  useDocumentMeta(
    language === 'mr'
      ? 'संपर्क — मधुच्या जाणीवा | माधुरी'
      : 'Contact — Madhuchya Janiva | माधुरी',
    language === 'mr'
      ? 'मधुच्या जाणीवा आणि लेखिका माधुरी यांच्याशी संवाद साधण्यासाठी संपर्क पान.'
      : 'Write a personal note or message to माधुरी at Madhuchya Janiva.'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setFeedback('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          subject,
          message,
          honeypot,
          formRenderedAt: renderedAtRef.current,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not send message.');
      setStatus('success');
      setFeedback(t.contactSuccess);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (err: unknown) {
      setStatus('error');
      setFeedback(
        err instanceof Error ? err.message : 'Unable to send your message.'
      );
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Left Warm Introduction & Social Links */}
        <div className="lg:col-span-5 space-y-8">
          <header className="space-y-3">
            <p className="text-xs tracking-widest uppercase font-medium text-[#4F6855] dark:text-[#8AA890]">
              {t.brandName}
            </p>
            <h1 className="font-editorial text-4xl sm:text-5xl font-semibold text-[#2B211C] dark:text-[#FAF6EF]">
              {t.contactTitle}
            </h1>
            <p className="text-base text-[#5C4B42] dark:text-[#C5B7A4] leading-relaxed">
              {t.contactSubtitle}
            </p>
          </header>

          <div className="p-6 rounded-2xl border border-[#E5DCCD] dark:border-[#302821] bg-[#F3ECE1]/65 dark:bg-[#1E1915] space-y-4">
            <h2 className="font-editorial text-xl font-medium text-[#2B211C] dark:text-[#FAF6EF]">
              {t.socialLinksTitle}
            </h2>

            {settings.instagram_url ||
            settings.linkedin_url ||
            settings.contact_email ? (
              <div className="space-y-3 text-sm">
                {settings.instagram_url && (
                  <a
                    href={settings.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-[#4F6855] dark:text-[#8AA890] hover:underline"
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
                    className="flex items-center gap-3 text-[#4F6855] dark:text-[#8AA890] hover:underline"
                  >
                    <Linkedin className="w-4 h-4" />
                    <span>LinkedIn</span>
                  </a>
                )}
                {settings.contact_email && (
                  <a
                    href={`mailto:${settings.contact_email}`}
                    className="flex items-center gap-3 text-[#4F6855] dark:text-[#8AA890] hover:underline"
                  >
                    <Mail className="w-4 h-4" />
                    <span>{settings.contact_email}</span>
                  </a>
                )}
              </div>
            ) : (
              <p className="text-sm text-[#6E5B50] dark:text-[#B8AA98]">
                {language === 'mr'
                  ? 'सोशल मीडिया लिंक्स अ‍ॅडमिन सेटिंग्जमधून कधीही जोडता येतील.'
                  : 'Social links (Instagram, LinkedIn) can be configured anytime from Admin Settings.'}
              </p>
            )}
          </div>
        </div>

        {/* Right Contact Form */}
        <div className="lg:col-span-7">
          <form
            onSubmit={handleSubmit}
            className="p-6 sm:p-8 rounded-2xl border border-[#E5DCCD] dark:border-[#302821] bg-[#FDFBF7] dark:bg-[#1E1915] space-y-5"
          >
            {/* Invisible Spam Honeypot */}
            <input
              type="text"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              className="hidden"
              aria-hidden="true"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-medium text-[#5C4B42] dark:text-[#C5B7A4] mb-1.5">
                  {t.contactName} *
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] bg-[#FAF6EF] dark:bg-[#161310] focus:outline-none focus:ring-2 focus:ring-[#4F6855]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#5C4B42] dark:text-[#C5B7A4] mb-1.5">
                  {t.contactEmail} *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] bg-[#FAF6EF] dark:bg-[#161310] focus:outline-none focus:ring-2 focus:ring-[#4F6855]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#5C4B42] dark:text-[#C5B7A4] mb-1.5">
                {t.contactSubject} *
              </label>
              <input
                type="text"
                required
                minLength={2}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-2.5 text-sm rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] bg-[#FAF6EF] dark:bg-[#161310] focus:outline-none focus:ring-2 focus:ring-[#4F6855]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#5C4B42] dark:text-[#C5B7A4] mb-1.5">
                {t.contactMessage} *
              </label>
              <textarea
                required
                minLength={10}
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-4 py-2.5 text-sm rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] bg-[#FAF6EF] dark:bg-[#161310] focus:outline-none focus:ring-2 focus:ring-[#4F6855]"
              />
            </div>

            <button
              type="submit"
              disabled={status === 'submitting'}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#4F6855] hover:bg-[#3F5544] text-white text-sm font-medium transition-colors disabled:opacity-60"
            >
              <Send className="w-4 h-4" />
              <span>
                {status === 'submitting' ? t.contactSending : t.contactSend}
              </span>
            </button>

            {feedback && (
              <div
                className={`flex items-center gap-2 p-3.5 rounded-lg text-sm ${
                  status === 'error'
                    ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/50'
                    : 'bg-[#4F6855]/10 text-[#3B5240] dark:text-[#9EC0A5] border border-[#4F6855]/30'
                }`}
              >
                {status === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                <span>{feedback}</span>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
