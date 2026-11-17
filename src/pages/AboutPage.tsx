import React from 'react';
import { BookOpen, Mail } from 'lucide-react';
import { useApp, useDocumentMeta } from '../context/AppContext.tsx';
import { ResilientImage } from '../components/ResilientImage.tsx';
import { BrandLogo } from '../components/BrandLogo.tsx';
import { EDITORIAL_IMAGES } from '../lib/editorialAssets.ts';

export const AboutPage: React.FC = () => {
  const { language, navigate, t } = useApp();

  useDocumentMeta(
    language === 'mr'
      ? 'माधुरीबद्दल — मधुच्या जाणीवा | माधुरी'
      : 'About माधुरी — Madhuchya Janiva',
    language === 'mr'
      ? 'माधुरी यांचा वैयक्तिक परिचय, लेखनाशी असलेलं नातं आणि विठूरायाप्रती कृतज्ञता.'
      : 'Personal introduction to माधुरी, her relationship with writing, reflections on life, and gratitude.'
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Left Vertical Editorial Portrait / Writing Space */}
        <div className="lg:col-span-5">
          <div className="aspect-[3/4] rounded-2xl overflow-hidden border border-[#E5DCCD] dark:border-[#302821] sticky top-24">
            <ResilientImage
              src={EDITORIAL_IMAGES.aboutWindow}
              alt="माधुरी यांच्या लेखनाची शांत जागा — खिडकी, दिवा आणि तुळस"
              fallbackLabel="माधुरी"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Right Personal Story & Authentic Reflections */}
        <div className="lg:col-span-7 space-y-10">
          <header className="space-y-4 border-b border-[#E5DCCD] dark:border-[#2C251F] pb-8">
            <div className="flex items-center gap-3.5">
              <BrandLogo size="lg" />
              <div>
                <p className="font-editorial text-xl sm:text-2xl font-semibold text-[#2B211C] dark:text-[#FAF6EF] leading-tight">
                  मधुच्या जाणीवा ✨
                </p>
                <p className="text-xs tracking-wide text-[#4F6855] dark:text-[#8AA890] mt-0.5">
                  {t.brandTagline}
                </p>
              </div>
            </div>
            <h1 className="font-editorial text-4xl sm:text-5xl font-semibold text-[#2B211C] dark:text-[#FAF6EF]">
              {language === 'mr' ? 'नमस्कार, मी माधुरी' : 'Namaskar, I am माधुरी'}
            </h1>
            <p className="text-base text-[#6E5B50] dark:text-[#B8AA98]">
              {t.aboutSubtitle}
            </p>
          </header>

          {language === 'mr' ? (
            <div className="space-y-8 text-base sm:text-lg text-[#3D2F28] dark:text-[#DFD4C3] leading-[1.9]">
              <section className="space-y-3">
                <h2 className="font-editorial text-2xl font-semibold text-[#2B211C] dark:text-[#FAF6EF]">
                  मी आणि माझं लेखन
                </h2>
                <p>
                  नमस्कार! मी माधुरी — ‘मधुच्या जाणीवा’ मागची व्यक्ती. माझ्यासाठी लेखन
                  म्हणजे केवळ शब्दांची जुळवाजुळव नाही, तर मनात आलेल्या खऱ्या भावनांना
                  शांतपणे कागदावर उतरवण्याचा एक प्रामाणिक मार्ग आहे.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="font-editorial text-2xl font-semibold text-[#2B211C] dark:text-[#FAF6EF]">
                  लेखन का सुरू झालं?
                </h2>
                <p>
                  कधीकधी आयुष्यात असे क्षण येतात की जे आपल्याला जाणवतं, ते शब्दांशिवाय
                  सांगता येत नाही — किंवा ते कोणाशी तरी शांतपणे शेअर करावंसं वाटतं.
                  मनाच्या डायरीतून असेच काही विचार, अनुभव आणि भावना हळूहळू शब्दांत
                  उतरत गेल्या. इतरांच्या मनालाही आधार किंवा आपुलकी वाटेल या भावनेतून
                  ‘मधुच्या जाणीवा’ हे घर उभं राहिलं.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="font-editorial text-2xl font-semibold text-[#2B211C] dark:text-[#FAF6EF]">
                  माणसं, अनुभव आणि आयुष्याबद्दल
                </h2>
                <p>
                  आयुष्य आपल्याला अनेक माणसं, नाती, एकटेपणाचे क्षण आणि नवे अनुभव
                  देऊन जातं. या प्रत्येक अनुभवातून आपल्याला स्वतःला नव्याने समजून
                  घ्यायला मिळतं. इथलं प्रत्येक लिखाण हे कोणतीही कृत्रिमता न ठेवता,
                  माणूस म्हणून आलेल्या सच्च्या जाणीवांचं प्रतिबिंब आहे.
                </p>
              </section>

              <section className="space-y-4 pt-6 border-t border-[#E5DCCD] dark:border-[#2C251F]">
                <h2 className="font-editorial text-2xl font-semibold text-[#2B211C] dark:text-[#FAF6EF]">
                  श्रद्धा आणि विठूरायाप्रती कृतज्ञता
                </h2>
                <p>
                  माझ्या लेखनामागची सगळ्यात मोठी ताकद आणि शांती म्हणजे माझी श्रद्धा.
                  जेव्हा मन शांत असतं, तेव्हाच खरे शब्द सुचतात असं मला वाटतं.
                </p>
                <blockquote className="my-6 py-6 border-y border-[#D4C7B4] dark:border-[#3A3129] font-editorial text-2xl text-[#2B211C] dark:text-[#FAF6EF] leading-relaxed">
                  “माझ्या मनाच्या डायरीतुन लिहीलेला प्रत्येक शब्द हा माझ्या विठूरायाचा आशीर्वाद आहे आणि मी आयुष्यभरासाठी त्याची ऋणी आहे!🕉️✨”
                </blockquote>
              </section>
            </div>
          ) : (
            <div className="space-y-8 text-base sm:text-lg text-[#3D2F28] dark:text-[#DFD4C3] leading-[1.85]">
              <section className="space-y-3">
                <h2 className="font-editorial text-2xl font-semibold text-[#2B211C] dark:text-[#FAF6EF]">
                  Who I Am & My Relationship with Writing
                </h2>
                <p>
                  Namaskar! I am माधुरी — the person behind ‘Madhuchya Janiva’. For me,
                  writing is not about ornate prose; it is an honest, unhurried space
                  where thoughts and emotions find their natural voice on paper.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="font-editorial text-2xl font-semibold text-[#2B211C] dark:text-[#FAF6EF]">
                  Why I Started Writing
                </h2>
                <p>
                  There are quiet moments in life when feelings stay unspoken inside
                  us. Writing began in the pages of a personal diary — capturing everyday
                  feelings, quiet gratitude, and lived truths. ‘Madhuchya Janiva’ grew
                  from the wish to offer those sincere words as a calm sanctuary for
                  readers.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="font-editorial text-2xl font-semibold text-[#2B211C] dark:text-[#FAF6EF]">
                  On People, Experiences & Life
                </h2>
                <p>
                  Life brings us people, relationships, moments of solitude, and deep
                  reflections. Every piece shared here aims to stay grounded in warmth,
                  empathy, and human truth — written from the heart, for people.
                </p>
              </section>

              <section className="space-y-4 pt-6 border-t border-[#E5DCCD] dark:border-[#2C251F]">
                <h2 className="font-editorial text-2xl font-semibold text-[#2B211C] dark:text-[#FAF6EF]">
                  Spirituality & Gratitude
                </h2>
                <p>
                  My deepest stillness and strength come from faith. Every thought
                  that reaches the page feels like grace rather than effort.
                </p>
                <blockquote className="my-6 py-6 border-y border-[#D4C7B4] dark:border-[#3A3129] font-editorial text-2xl text-[#2B211C] dark:text-[#FAF6EF] leading-relaxed">
                  “माझ्या मनाच्या डायरीतुन लिहीलेला प्रत्येक शब्द हा माझ्या विठूरायाचा आशीर्वाद आहे आणि मी आयुष्यभरासाठी त्याची ऋणी आहे!🕉️✨”
                </blockquote>
              </section>
            </div>
          )}

          <div className="flex flex-wrap gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate('/writings')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#4F6855] hover:bg-[#3F5544] text-white text-sm font-medium transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              <span>{t.readWritingsBtn}</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/contact')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] bg-[#F3ECE1] dark:bg-[#221C17] text-sm font-medium hover:border-[#4F6855] transition-colors"
            >
              <Mail className="w-4 h-4" />
              <span>{t.navContact}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
