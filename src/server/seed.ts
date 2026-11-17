import { count, eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  articles,
  articleTranslations,
  categories,
  siteSettings,
} from '../db/schema.ts';

const INITIAL_CATEGORIES = [
  {
    slug: 'manatalam',
    nameMr: 'मनातलं',
    nameEn: 'From the Heart',
    descriptionMr: 'मनाच्या तळाशी दडलेले शांत विचार आणि अंतर्मनातील भावना.',
    descriptionEn: 'Quiet thoughts and unspoken feelings held deep within the heart.',
    sortOrder: 1,
  },
  {
    slug: 'manasam',
    nameMr: 'माणसं',
    nameEn: 'People',
    descriptionMr: 'आपल्या आयुष्याला अर्थ देणारी माणसं आणि त्यांच्या संवेदनशील गोष्टी.',
    descriptionEn: 'The people who bring warmth and meaning to our everyday lives.',
    sortOrder: 2,
  },
  {
    slug: 'nati',
    nameMr: 'नाती',
    nameEn: 'Relationships',
    descriptionMr: 'नात्यांमधला ओलावा, समजूतदारपणा आणि न बोलता समजणारी भाषा.',
    descriptionEn: 'Tenderness, understanding, and the unspoken language of bonds.',
    sortOrder: 3,
  },
  {
    slug: 'ektepana',
    nameMr: 'एकटेपणा',
    nameEn: 'Solitude',
    descriptionMr: 'एकांतात स्वतःशी झालेली भेट आणि शांततेचा शोध.',
    descriptionEn: 'Meeting oneself in quiet moments of solitude and stillness.',
    sortOrder: 4,
  },
  {
    slug: 'ayushya',
    nameMr: 'आयुष्य',
    nameEn: 'Life',
    descriptionMr: 'आयुष्याच्या वळणावर सापडलेले छोटे पण मोलाचे अर्थ.',
    descriptionEn: 'Gentle truths discovered along the winding paths of life.',
    sortOrder: 5,
  },
  {
    slug: 'anubhav',
    nameMr: 'अनुभव',
    nameEn: 'Experiences',
    descriptionMr: 'जगताना आलेले सच्चे अनुभव आणि त्यातून शिकलेले धडे.',
    descriptionEn: 'Honest lived experiences and the quiet wisdom they leave behind.',
    sortOrder: 6,
  },
  {
    slug: 'athavani',
    nameMr: 'आठवणी',
    nameEn: 'Memories',
    descriptionMr: 'काळाच्या कप्प्यात जपलेल्या हळव्या आणि सुगंधी आठवणी.',
    descriptionEn: 'Tender, fragrant memories kept safely in the folds of time.',
    sortOrder: 7,
  },
  {
    slug: 'krutadnyata',
    nameMr: 'कृतज्ञता',
    nameEn: 'Gratitude',
    descriptionMr: 'मिळालेल्या प्रत्येक क्षणाबद्दल आणि माणसांबद्दल मनापासूनची कृतज्ञता.',
    descriptionEn: 'Deep thankfulness for every breath, blessing, and kind soul.',
    sortOrder: 8,
  },
  {
    slug: 'adhyatma',
    nameMr: 'अध्यात्म',
    nameEn: 'Spirituality',
    descriptionMr: 'आत्मिक शांती, श्रद्धा आणि अंतर्मनाचा प्रवास.',
    descriptionEn: 'Inner peace, quiet faith, and the inward spiritual journey.',
    sortOrder: 9,
  },
  {
    slug: 'vitthal-bhakti',
    nameMr: 'विठ्ठल भक्ती',
    nameEn: 'Vitthal Devotion',
    descriptionMr: 'विठूरायाच्या चरणी अर्पिलेले भावपूर्ण शब्द आणि भक्तीभाव.',
    descriptionEn: 'Heartfelt devotion and words offered at the feet of Vithuraya.',
    sortOrder: 10,
  },
  {
    slug: 'career-ani-pravas',
    nameMr: 'करिअर आणि प्रवास',
    nameEn: 'Career & Journey',
    descriptionMr: 'कामाचा प्रवास, संघर्ष, स्वप्नं आणि पुढे जाण्याची उमेद.',
    descriptionEn: 'Steps of growth, work, perseverance, and quiet aspirations.',
    sortOrder: 11,
  },
  {
    slug: 'swatahshi-samvad',
    nameMr: 'स्वतःशी संवाद',
    nameEn: 'Conversations with Self',
    descriptionMr: 'आरशासमोर उभं राहून स्वतःशीच केलेला प्रामाणिक संवाद.',
    descriptionEn: 'Honest, gentle dialogues held with one’s own quiet self.',
    sortOrder: 12,
  },
  {
    slug: 'apaar-ani-prerana',
    nameMr: 'अपार आणि प्रेरणा',
    nameEn: 'Boundless Hope & Inspiration',
    descriptionMr: 'अंधारातही आशेचा दिवा जपणारे सकारात्मक विचार.',
    descriptionEn: 'Gentle light and resilience that keeps hope alive through storms.',
    sortOrder: 13,
  },
];

const INITIAL_SETTINGS: Record<string, string> = {
  instagram_url: '',
  linkedin_url: '',
  contact_email: '',
  journal_note_mr:
    'आजही सकाळच्या शांत प्रहरी डायरी उघडली की मनातले शब्द आपोआप कागदावर उतरू लागतात. इथला प्रत्येक शब्द तुमचा आणि माझा संवाद आहे.',
  journal_note_en:
    'Even today, whenever I open my diary in the quiet morning hours, words begin to flow naturally onto the page. Every word here is a quiet conversation between you and me.',
};

const SAMPLE_ARTICLES = [
  {
    slug: 'sample-diary-morning-tea-and-stillness',
    categorySlug: 'manatalam',
    titleMr: '[नमुना लेख] सकाळचा चहा आणि स्वतःशी झालेला शांत संवाद',
    excerptMr:
      'हा एक नमुना (Sample) लेख आहे. मधुच्या जाणीवा मधील लेखन मांडणी कशी दिसेल हे पाहण्यासाठी हा नमुना दिला आहे — अ‍ॅडमिन डॅशबोर्डमधून तुम्ही तुमचा मूळ लेख जोडू शकता किंवा हे नमुना लेख काढू शकता.',
    contentMr: `<p><em>(सूचना: हा एक नमुना लेख / Sample Template आहे. माधुरी यांनी लिहिलेले मूळ लेख अ‍ॅडमिन डॅशबोर्डमधून प्रकाशित केल्यानंतर हे नमुना लेख तुम्ही एका क्लिकवर काढून टाकू शकता.)</em></p>
<p>सकाळची कोवळी किरणं खिडकीतून आत येतात, तेव्हा संपूर्ण घर अजून शांत असतं. अशा वेळी हातात गरम चहाचा कप आणि समोर कोरी डायरी असली की मनाला एक वेगळीच शांतता लाभते.</p>
<blockquote>कधीकधी मोठ्या आवाजात बोलण्यापेक्षा, स्वतःशी शांतपणे केलेला संवाद आपल्याला अधिक समजून घेतो.</blockquote>
<p>दिवसभराच्या धावपळीत आपण अनेकांशी बोलतो, पण आपल्याच मनाचं ऐकायला विसरून जातो. 'मधुच्या जाणीवा' हे असंच एक शांत आश्रयस्थान आहे — जिथे शब्द मनातून येतात आणि थेट माणसांच्या मनापर्यंत पोहोचतात.</p>`,
    featuredImageUrl: '/src/assets/images/hero_journal_morning_1794570847641.jpg',
    featuredImageAlt: 'सकाळचा चहा आणि खुली डायरी — नमुना छायाचित्र',
    isFeatured: true,
    readingTimeMinutes: 2,
    translationEn: {
      title: '[Sample Preview] Morning Tea and a Quiet Conversation Within',
      excerpt:
        'This is a clearly marked sample template showing how bilingual Marathi & English articles appear on Madhuchya Janiva. You can edit or remove sample templates anytime from the Admin Dashboard.',
      content: `<p><em>(Note: This is a sample layout preview template. Original writings by माधुरी can be published directly from the Admin Dashboard.)</em></p>
<p>When the soft morning light enters through the window, the whole house is still quiet. Holding a warm cup of tea beside an open diary brings a gentle stillness to the heart.</p>
<blockquote>Sometimes, a quiet conversation with oneself understands us far better than a hundred spoken words.</blockquote>
<p>Amidst the rush of everyday life, we speak to many people yet forget to listen to our own heart. Madhuchya Janiva is meant to be a peaceful sanctuary for those unspoken reflections.</p>`,
    },
  },
  {
    slug: 'sample-gratitude-mogra-and-tulsi',
    categorySlug: 'krutadnyata',
    titleMr: '[नमुना लेख] मोगऱ्याचा सुगंध आणि कृतज्ञतेची भावना',
    excerptMr:
      'कृतज्ञता ही मोठ्या गोष्टींपेक्षा छोट्या-छोट्या क्षणांची जाणीव ठेवण्यात असते. हा एक नमुना लेख मांडणी दाखवण्यासाठी दिला आहे.',
    contentMr: `<p><em>(सूचना: हा एक नमुना लेख / Sample Template आहे. अ‍ॅडमिन मधून तुम्ही तुमचे अस्सल मराठी अनुभव लिहू शकता.)</em></p>
<p>तुळशीजवळ लावलेला दिवा आणि शेजारी ठेवलेली मोगऱ्याची ताजी फुलं — या छोट्याशा गोष्टी आपल्याला आठवण करून देतात की आनंद नेहमीच आपल्या आजूबाजूला असतो.</p>
<p>आयुष्याने आपल्याला जे दिलं आहे, त्याबद्दल मनापासून आभार मानले की मन हलकं होतं आणि प्रत्येक दिवसाकडे पाहण्याची दृष्टी अधिक प्रेमळ होते. ✨</p>`,
    featuredImageUrl: '/src/assets/images/diary_gratitude_flowers_1794570849341.jpg',
    featuredImageAlt: 'मोगऱ्याची फुले आणि डायरी — नमुना छायाचित्र',
    isFeatured: true,
    readingTimeMinutes: 2,
    translationEn: {
      title: '[Sample Preview] Fragrance of Mogra and Quiet Gratitude',
      excerpt:
        'Gratitude lives in noticing small everyday blessings. This sample preview demonstrates the reading experience and bilingual toggle.',
      content: `<p><em>(Note: This is a sample layout preview template. Replace or remove it from the Admin Dashboard when publishing original stories.)</em></p>
<p>A tiny lamp beside the tulsi plant and fresh white mogra blossoms remind us that peace and joy often reside in the simplest moments.</p>
<p>When we pause to feel thankful for what life has gently placed in our hands, the heart grows lighter and kinder. ✨</p>`,
    },
  },
  {
    slug: 'sample-morning-path-of-hope',
    categorySlug: 'vitthal-bhakti',
    titleMr: '[नमुना लेख] पहाटेची शांत वाट आणि विठूरायावरील अढळ श्रद्धा',
    excerptMr:
      'मनातली श्रद्धा जेव्हा शब्दांत उतरते, तेव्हा प्रत्येक पावलावर एक अदृश्य सोबत जाणवते. हा नमुना लेख देवभक्ती व अध्यात्म श्रेणीसाठी आहे.',
    contentMr: `<p><em>(सूचना: हा एक नमुना लेख / Sample Template आहे. तुमचे मूळ लेख जोडण्यासाठी अ‍ॅडमिन डॅशबोर्ड वापरा.)</em></p>
<p>पहाटेच्या धुक्यातून वाट काढताना जसा समोरचा रस्ता हळूहळू स्पष्ट होत जातो, तसंच आयुष्यातही श्रद्धेचा दिवा आपल्याला योग्य दिशा दाखवतो.</p>
<p>विठूरायाचं नाव ओठांवर आलं की मनातली सगळी अस्वस्थता शांत होते आणि पुन्हा नव्याने जगण्याची उमेद मिळते. 🕉️✨</p>`,
    featuredImageUrl: '/src/assets/images/nature_reflection_path_1794570857248.jpg',
    featuredImageAlt: 'पहाटेची हिरवीगार वाट — नमुना छायाचित्र',
    isFeatured: false,
    readingTimeMinutes: 2,
    translationEn: null, // Intentionally omit English translation on 3rd sample so user can also test "English translation unavailable — showing Marathi original" gracefully!
  },
];

let seedPromise: Promise<void> | null = null;

export async function ensureInitialDataSeeded(): Promise<void> {
  if (seedPromise) return seedPromise;

  seedPromise = (async () => {
    try {
      const [{ value: catCount }] = await db
        .select({ value: count() })
        .from(categories);

      if (catCount === 0) {
        await db.insert(categories).values(INITIAL_CATEGORIES).onConflictDoNothing();
      }

      const [{ value: settingsCount }] = await db
        .select({ value: count() })
        .from(siteSettings);

      if (settingsCount === 0) {
        await db
          .insert(siteSettings)
          .values(
            Object.entries(INITIAL_SETTINGS).map(([key, value]) => ({
              key,
              value,
            }))
          )
          .onConflictDoNothing();
      }

      const [{ value: articleCount }] = await db
        .select({ value: count() })
        .from(articles);

      if (articleCount === 0) {
        const allCats = await db.select().from(categories);
        const catMap = new Map(allCats.map((c) => [c.slug, c.id]));

        for (const sample of SAMPLE_ARTICLES) {
          const categoryId = catMap.get(sample.categorySlug) ?? null;
          const [inserted] = await db
            .insert(articles)
            .values({
              slug: sample.slug,
              titleMr: sample.titleMr,
              excerptMr: sample.excerptMr,
              contentMr: sample.contentMr,
              featuredImageUrl: sample.featuredImageUrl,
              featuredImageAlt: sample.featuredImageAlt,
              categoryId,
              authorName: 'माधुरी',
              status: 'published',
              isFeatured: sample.isFeatured,
              isSample: true,
              readingTimeMinutes: sample.readingTimeMinutes,
              publishedAt: new Date(),
            })
            .onConflictDoNothing()
            .returning();

          if (inserted && sample.translationEn) {
            await db
              .insert(articleTranslations)
              .values({
                articleId: inserted.id,
                language: 'en',
                title: sample.translationEn.title,
                excerpt: sample.translationEn.excerpt,
                content: sample.translationEn.content,
                isPublished: true,
              })
              .onConflictDoNothing();
          }
        }
      }
    } catch (error) {
      seedPromise = null;
      console.error('Error seeding initial data:', error);
      throw error;
    }
  })();

  return seedPromise;
}

export async function publishDueScheduledArticles(): Promise<void> {
  try {
    const now = new Date();
    const scheduled = await db
      .select({ id: articles.id, scheduledAt: articles.scheduledAt })
      .from(articles)
      .where(eq(articles.status, 'scheduled'));

    for (const item of scheduled) {
      if (item.scheduledAt && item.scheduledAt <= now) {
        await db
          .update(articles)
          .set({
            status: 'published',
            publishedAt: item.scheduledAt,
            updatedAt: now,
          })
          .where(eq(articles.id, item.id));
      }
    }
  } catch (error) {
    console.error('Failed to check scheduled articles:', error);
  }
}
