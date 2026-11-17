import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  Eye,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Inbox,
  Lock,
  LogOut,
  MessageSquare,
  Plus,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useApp, useDocumentMeta } from '../context/AppContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';
import {
  ActivityLog,
  ArticleComment,
  ArticleSummary,
  Category,
  ContactMessage,
  MediaFile,
  SiteSettingsMap,
} from '../types/index.ts';
import { RichTextEditor } from '../components/RichTextEditor.tsx';
import { ResilientImage } from '../components/ResilientImage.tsx';
import { BrandLogo } from '../components/BrandLogo.tsx';
import { formatPublishedDate } from '../i18n/translations.ts';
import { EDITORIAL_IMAGES } from '../lib/editorialAssets.ts';
import defaultBrandLogo from '../assets/images/brand_logo_diary_sunflower_1794893111674.jpg';

const MAX_UPLOAD_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/pjpeg',
  'image/png',
  'image/webp',
]);

function validateSelectedImageFile(file: File): string | null {
  const mime = (file.type || '').toLowerCase();
  const hasAllowedExt = /\.(jpe?g|png|webp)$/i.test(file.name);
  const mimeValid =
    ALLOWED_IMAGE_MIMES.has(mime) ||
    ((!mime || mime === 'application/octet-stream') && hasAllowedExt);
  if (!mimeValid) {
    return 'Only JPG, JPEG, PNG, and WebP images are supported.';
  }
  if (file.size > MAX_UPLOAD_IMAGE_BYTES) {
    return 'Selected photo exceeds the 5 MB maximum limit. Please choose a smaller photograph.';
  }
  return null;
}

type AdminTab =
  | 'overview'
  | 'articles'
  | 'categories'
  | 'media'
  | 'messages'
  | 'settings';

interface OverviewStats {
  totalArticles: number;
  publishedArticles: number;
  draftArticles: number;
  scheduledArticles: number;
  sampleArticles: number;
  totalCategories: number;
  totalMessages: number;
  unreadMessages: number;
  totalMedia: number;
  pendingComments: number;
  subscriberCount: number;
}

interface ArticleFormState {
  id?: number;
  titleMr: string;
  slug: string;
  excerptMr: string;
  contentMr: string;
  featuredImageUrl: string;
  featuredImageAlt: string;
  categoryId: number | null;
  status: 'draft' | 'published' | 'scheduled';
  scheduledAt: string;
  isFeatured: boolean;
  isSample: boolean;
  seoTitleMr: string;
  seoDescriptionMr: string;
  tagsInput: string;
  enEnabled: boolean;
  enTitle: string;
  enExcerpt: string;
  enContent: string;
  enSeoTitle: string;
  enSeoDescription: string;
  enIsPublished: boolean;
}

const EMPTY_ARTICLE_FORM: ArticleFormState = {
  titleMr: '',
  slug: '',
  excerptMr: '',
  contentMr: '',
  featuredImageUrl: '',
  featuredImageAlt: '',
  categoryId: null,
  status: 'draft',
  scheduledAt: '',
  isFeatured: false,
  isSample: false,
  seoTitleMr: '',
  seoDescriptionMr: '',
  tagsInput: '',
  enEnabled: false,
  enTitle: '',
  enExcerpt: '',
  enContent: '',
  enSeoTitle: '',
  enSeoDescription: '',
  enIsPublished: true,
};

export const AdminPage: React.FC = () => {
  const { language, navigate, refreshSiteData } = useApp();
  const {
    firebaseUser,
    authLoading,
    adminProfile,
    adminSessionToken,
    signInWithGoogle,
    signOutAll,
    setAdminSession,
    adminFetch,
    adminUpload,
  } = useAuth();

  useDocumentMeta(
    'लेखिका स्टुडिओ (Admin) — मधुच्या जाणीवा',
    'Protected editorial studio for Madhuchya Janiva.'
  );

  // Auth / Bootstrap state
  const [setupRequired, setSetupRequired] = useState<boolean | null>(null);
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [setupDisplayName, setSetupDisplayName] = useState('माधुरी');
  const [passphraseInput, setPassphraseInput] = useState('');
  const [passphraseConfirm, setPassphraseConfirm] = useState('');

  // Dashboard tabs & data
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [bannerMsg, setBannerMsg] = useState('');
  const [bannerType, setBannerType] = useState<'success' | 'error'>('success');

  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
  const [articlesList, setArticlesList] = useState<ArticleSummary[]>([]);
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [mediaList, setMediaList] = useState<MediaFile[]>([]);
  const [messagesList, setMessagesList] = useState<ContactMessage[]>([]);
  const [commentsList, setCommentsList] = useState<ArticleComment[]>([]);
  const [settingsForm, setSettingsForm] = useState<SiteSettingsMap>({});

  // Article editor modal/view state
  const [editingArticle, setEditingArticle] = useState<ArticleFormState | null>(
    null
  );
  const [editorLangTab, setEditorLangTab] = useState<'mr' | 'en'>('mr');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [savingArticle, setSavingArticle] = useState(false);

  // Media Picker Modal for editor
  const [mediaPickerTarget, setMediaPickerTarget] = useState<
    null | 'featured' | 'contentMr' | 'contentEn'
  >(null);
  const [insertMrImageUrl, setInsertMrImageUrl] = useState<string | null>(null);
  const [insertEnImageUrl, setInsertEnImageUrl] = useState<string | null>(null);

  // Category form state
  const [catEditId, setCatEditId] = useState<number | null>(null);
  const [catNameMr, setCatNameMr] = useState('');
  const [catNameEn, setCatNameEn] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catDescMr, setCatDescMr] = useState('');
  const [catDescEn, setCatDescEn] = useState('');
  const [catOrder, setCatOrder] = useState(0);

  // Media upload state
  const [mediaAlt, setMediaAlt] = useState('');
  const [mediaCaption, setMediaCaption] = useState('');
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Article Cover Image upload state (mirrors working profile image upload pattern)
  const coverFileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingCoverFile, setPendingCoverFile] = useState<File | null>(null);
  const [pendingCoverPreviewUrl, setPendingCoverPreviewUrl] = useState<
    string | null
  >(null);
  const [pendingCoverRemove, setPendingCoverRemove] = useState(false);
  const [savingCoverOnly, setSavingCoverOnly] = useState(false);
  const [coverUploadProgress, setCoverUploadProgress] = useState<number | null>(
    null
  );
  const [coverUploadSuccess, setCoverUploadSuccess] = useState('');
  const [coverUploadError, setCoverUploadError] = useState('');

  useEffect(() => {
    return () => {
      if (pendingCoverPreviewUrl) {
        URL.revokeObjectURL(pendingCoverPreviewUrl);
      }
    };
  }, [pendingCoverPreviewUrl]);

  const resetCoverUploadState = () => {
    setPendingCoverFile(null);
    setPendingCoverPreviewUrl(null);
    setPendingCoverRemove(false);
    setCoverUploadProgress(null);
    setCoverUploadSuccess('');
    setCoverUploadError('');
    if (coverFileInputRef.current) {
      coverFileInputRef.current.value = '';
    }
  };

  // Main Dashboard Homepage Profile / Introduction Image state
  const profileFileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingProfileFile, setPendingProfileFile] = useState<File | null>(
    null
  );
  const [pendingProfilePreviewUrl, setPendingProfilePreviewUrl] = useState<
    string | null
  >(null);
  const [pendingProfileRemove, setPendingProfileRemove] = useState(false);
  const [profileAltDraft, setProfileAltDraft] = useState('');
  const [profileUploadProgress, setProfileUploadProgress] = useState<
    number | null
  >(null);
  const [savingProfileImage, setSavingProfileImage] = useState(false);
  const [profileStatusMsg, setProfileStatusMsg] = useState('');
  const [profileErrorMsg, setProfileErrorMsg] = useState('');

  useEffect(() => {
    return () => {
      if (pendingProfilePreviewUrl) {
        URL.revokeObjectURL(pendingProfilePreviewUrl);
      }
    };
  }, [pendingProfilePreviewUrl]);

  // Brand Logo (Header & About) state
  const brandLogoFileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingBrandLogoFile, setPendingBrandLogoFile] = useState<File | null>(
    null
  );
  const [pendingBrandLogoPreviewUrl, setPendingBrandLogoPreviewUrl] = useState<
    string | null
  >(null);
  const [pendingBrandLogoRemove, setPendingBrandLogoRemove] = useState(false);
  const [brandLogoUploadProgress, setBrandLogoUploadProgress] = useState<
    number | null
  >(null);
  const [savingBrandLogo, setSavingBrandLogo] = useState(false);
  const [brandLogoStatusMsg, setBrandLogoStatusMsg] = useState('');
  const [brandLogoErrorMsg, setBrandLogoErrorMsg] = useState('');

  useEffect(() => {
    return () => {
      if (pendingBrandLogoPreviewUrl) {
        URL.revokeObjectURL(pendingBrandLogoPreviewUrl);
      }
    };
  }, [pendingBrandLogoPreviewUrl]);

  const notify = (msg: string, type: 'success' | 'error' = 'success') => {
    setBannerMsg(msg);
    setBannerType(type);
    setTimeout(() => setBannerMsg(''), 5000);
  };

  useEffect(() => {
    fetch('/api/admin/bootstrap-status')
      .then((r) => r.json())
      .then((d) => setSetupRequired(Boolean(d.setupRequired)))
      .catch(() => setSetupRequired(false));
  }, []);

  const loadDashboardData = useCallback(async () => {
    if (!adminSessionToken) return;
    try {
      const [ovRes, artRes, catRes, medRes, msgRes, cmtRes, setRes] =
        await Promise.all([
          adminFetch('/api/admin/overview'),
          adminFetch('/api/admin/articles'),
          adminFetch('/api/admin/categories'),
          adminFetch('/api/admin/media'),
          adminFetch('/api/admin/messages'),
          adminFetch('/api/admin/comments'),
          adminFetch('/api/admin/settings'),
        ]);

      if (ovRes.ok) {
        const d = await ovRes.json();
        setStats(d.stats);
        setRecentActivity(d.recentActivity || []);
      }
      if (artRes.ok) setArticlesList((await artRes.json()).articles || []);
      if (catRes.ok) setCategoriesList((await catRes.json()).categories || []);
      if (medRes.ok) setMediaList((await medRes.json()).media || []);
      if (msgRes.ok) setMessagesList((await msgRes.json()).messages || []);
      if (cmtRes.ok) setCommentsList((await cmtRes.json()).comments || []);
      if (setRes.ok) {
        const loadedSettings = (await setRes.json()).settings || {};
        setSettingsForm(loadedSettings);
        setProfileAltDraft(loadedSettings.profile_image_alt || '');
      }
    } catch (err) {
      console.error('Failed loading admin dashboard:', err);
    }
  }, [adminSessionToken, adminFetch]);

  useEffect(() => {
    if (adminSessionToken) {
      loadDashboardData();
    }
  }, [adminSessionToken, loadDashboardData]);

  const handleGoogleSignIn = async () => {
    setAuthError('');
    setAuthBusy(true);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      setAuthError(
        err instanceof Error ? err.message : 'Google Sign-In failed.'
      );
    } finally {
      setAuthBusy(false);
    }
  };

  const handleInitialSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (passphraseInput.length < 8) {
      setAuthError('Passphrase must be at least 8 characters.');
      return;
    }
    if (passphraseInput !== passphraseConfirm) {
      setAuthError('Passphrases do not match.');
      return;
    }
    if (!firebaseUser) return;
    setAuthBusy(true);
    try {
      const idToken = await firebaseUser.getIdToken();
      const res = await fetch('/api/admin/initial-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          displayName: setupDisplayName.trim() || 'माधुरी',
          passphrase: passphraseInput,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Setup failed');
      setSetupRequired(false);
      setPassphraseInput('');
      setPassphraseConfirm('');
      setAdminSession(data.admin, data.adminSessionToken);
    } catch (err: unknown) {
      setAuthError(
        err instanceof Error ? err.message : 'Could not complete setup.'
      );
    } finally {
      setAuthBusy(false);
    }
  };

  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!firebaseUser) return;
    setAuthBusy(true);
    try {
      const idToken = await firebaseUser.getIdToken();
      const res = await fetch('/api/admin/unlock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ passphrase: passphraseInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      setPassphraseInput('');
      setAdminSession(data.admin, data.adminSessionToken);
    } catch (err: unknown) {
      setAuthError(
        err instanceof Error ? err.message : 'Incorrect passphrase or unauthorized account.'
      );
    } finally {
      setAuthBusy(false);
    }
  };

  // Article actions
  const openEditArticle = async (articleId: number) => {
    try {
      const res = await adminFetch(`/api/admin/articles/${articleId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load article');
      const a = data.article;
      const tr = data.translationEn;
      setEditingArticle({
        id: a.id,
        titleMr: a.titleMr,
        slug: a.slug,
        excerptMr: a.excerptMr || '',
        contentMr: a.contentMr,
        featuredImageUrl: a.featuredImageUrl || '',
        featuredImageAlt: a.featuredImageAlt || '',
        categoryId: a.categoryId ?? null,
        status: a.status,
        scheduledAt: a.scheduledAt
          ? new Date(a.scheduledAt).toISOString().slice(0, 16)
          : '',
        isFeatured: Boolean(a.isFeatured),
        isSample: Boolean(a.isSample),
        seoTitleMr: a.seoTitleMr || '',
        seoDescriptionMr: a.seoDescriptionMr || '',
        tagsInput: (data.tags || []).join(', '),
        enEnabled: Boolean(tr),
        enTitle: tr?.title || '',
        enExcerpt: tr?.excerpt || '',
        enContent: tr?.content || '',
        enSeoTitle: tr?.seoTitle || '',
        enSeoDescription: tr?.seoDescription || '',
        enIsPublished: tr?.isPublished ?? true,
      });
      setEditorLangTab('mr');
      resetCoverUploadState();
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Could not open article', 'error');
    }
  };

  const handleCoverImageFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !editingArticle) return;

    setCoverUploadError('');
    setCoverUploadSuccess('');

    const validationError = validateSelectedImageFile(file);
    if (validationError) {
      setCoverUploadError(validationError);
      notify(validationError, 'error');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setPendingCoverFile(file);
    setPendingCoverPreviewUrl(previewUrl);
    setPendingCoverRemove(false);
    setCoverUploadSuccess(
      editingArticle.id
        ? 'Cover photo preview ready. Tap "Save Cover Photo" or save/publish your writing to apply.'
        : 'Cover photo preview ready. Save or publish your writing to upload and attach it.'
    );
  };

  const handleRemoveCoverImage = () => {
    if (!editingArticle) return;
    setCoverUploadError('');
    setCoverUploadProgress(null);

    if (pendingCoverFile || pendingCoverPreviewUrl) {
      setPendingCoverFile(null);
      setPendingCoverPreviewUrl(null);
      setPendingCoverRemove(false);
      setCoverUploadSuccess('Selected cover preview cleared.');
      return;
    }

    if (editingArticle.featuredImageUrl) {
      setEditingArticle({
        ...editingArticle,
        featuredImageUrl: '',
        featuredImageAlt: '',
      });
      setPendingCoverRemove(true);
      setCoverUploadSuccess(
        editingArticle.id
          ? 'Cover photo cleared. Tap "Save Cover Photo" or save your writing to restore placeholder.'
          : 'Cover photo removed.'
      );
    }
    if (coverFileInputRef.current) {
      coverFileInputRef.current.value = '';
    }
  };

  const resolveCoverImageForSave = async (): Promise<{
    url: string;
    alt: string;
  }> => {
    if (!editingArticle) {
      return { url: '', alt: '' };
    }

    let nextUrl = pendingCoverRemove ? '' : editingArticle.featuredImageUrl;
    let nextAlt = pendingCoverRemove ? '' : editingArticle.featuredImageAlt.trim();

    if (pendingCoverFile) {
      setCoverUploadProgress(0);
      const fd = new FormData();
      fd.append('file', pendingCoverFile);
      fd.append('purpose', 'cover');
      fd.append('altText', nextAlt || editingArticle.titleMr || '');

      const uploadRes = await adminUpload(
        '/api/admin/media?purpose=cover',
        fd,
        (percent) => setCoverUploadProgress(percent)
      );
      const uploadData = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok || !uploadData?.media?.url) {
        throw new Error(uploadData.error || 'Could not upload cover image.');
      }

      nextUrl = uploadData.media.url;
      if (!nextAlt) {
        nextAlt = editingArticle.titleMr || uploadData.media.originalName || '';
      }
    }

    return { url: nextUrl, alt: nextAlt };
  };

  const handleSaveCoverOnly = async () => {
    if (!editingArticle?.id) return;
    setCoverUploadError('');
    setCoverUploadSuccess('');
    setSavingCoverOnly(true);
    try {
      const { url, alt } = await resolveCoverImageForSave();
      const res = await adminFetch(
        `/api/admin/articles/${editingArticle.id}/cover`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            featuredImageUrl: url,
            featuredImageAlt: alt,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Could not save cover photo.');
      }

      setEditingArticle((prev) =>
        prev
          ? {
              ...prev,
              featuredImageUrl: url,
              featuredImageAlt: alt,
            }
          : prev
      );
      setPendingCoverFile(null);
      setPendingCoverPreviewUrl(null);
      setPendingCoverRemove(false);

      const msg = url
        ? 'Article cover photo saved permanently!'
        : 'Article cover photo removed (placeholder restored).';
      setCoverUploadSuccess(msg);
      notify(msg);
      await Promise.all([loadDashboardData(), refreshSiteData()]);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Unable to save cover photo.';
      setCoverUploadError(msg);
      notify(msg, 'error');
    } finally {
      setCoverUploadProgress(null);
      setSavingCoverOnly(false);
    }
  };

  const handleProfileImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setProfileErrorMsg('');
    setProfileStatusMsg('');

    const validationError = validateSelectedImageFile(file);
    if (validationError) {
      setProfileErrorMsg(validationError);
      notify(validationError, 'error');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setPendingProfileFile(file);
    setPendingProfilePreviewUrl(previewUrl);
    setPendingProfileRemove(false);
    setProfileStatusMsg(
      'Photo preview ready. Tap "Save Profile Image" to publish it on the homepage.'
    );
  };

  const handleRemoveProfileImage = () => {
    setProfileErrorMsg('');
    if (pendingProfileFile || pendingProfilePreviewUrl) {
      setPendingProfileFile(null);
      setPendingProfilePreviewUrl(null);
      setPendingProfileRemove(false);
      setProfileStatusMsg('Selected preview cleared.');
      return;
    }
    if (settingsForm.profile_image_url) {
      setPendingProfileRemove(true);
      setProfileStatusMsg(
        'Profile photo marked for removal. Tap "Save Profile Image" to restore the default homepage image.'
      );
    }
  };

  const handleSaveProfileImage = async () => {
    setProfileErrorMsg('');
    setProfileStatusMsg('');
    setSavingProfileImage(true);
    try {
      let nextUrl = settingsForm.profile_image_url || '';
      let nextAlt = profileAltDraft.trim();

      if (pendingProfileFile) {
        setProfileUploadProgress(0);
        const fd = new FormData();
        fd.append('file', pendingProfileFile);
        fd.append('purpose', 'profile');
        fd.append('altText', nextAlt || 'मधुच्या जाणीवा — माधुरी');

        const uploadRes = await adminUpload(
          '/api/admin/media?purpose=profile',
          fd,
          (pct) => setProfileUploadProgress(pct)
        );
        const uploadData = await uploadRes.json().catch(() => ({}));
        if (!uploadRes.ok || !uploadData?.media?.url) {
          throw new Error(
            uploadData.error || 'Could not upload profile photograph.'
          );
        }
        nextUrl = uploadData.media.url;
        if (!nextAlt) {
          nextAlt = 'मधुच्या जाणीवा — माधुरी';
        }
      } else if (pendingProfileRemove) {
        nextUrl = '';
        nextAlt = '';
      }

      const saveRes = await adminFetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_image_url: nextUrl,
          profile_image_alt: nextAlt,
        }),
      });
      const saveData = await saveRes.json().catch(() => ({}));
      if (!saveRes.ok) {
        throw new Error(saveData.error || 'Could not save profile image.');
      }

      setSettingsForm(saveData.settings || {});
      setPendingProfileFile(null);
      setPendingProfilePreviewUrl(null);
      setPendingProfileRemove(false);
      setProfileAltDraft(saveData.settings?.profile_image_alt || '');

      const msg = nextUrl
        ? 'Homepage profile image saved permanently!'
        : 'Default homepage image restored.';
      setProfileStatusMsg(msg);
      notify(msg);
      await Promise.all([loadDashboardData(), refreshSiteData()]);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Unable to save profile image.';
      setProfileErrorMsg(msg);
      notify(msg, 'error');
    } finally {
      setProfileUploadProgress(null);
      setSavingProfileImage(false);
    }
  };

  const handleBrandLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setBrandLogoErrorMsg('');
    setBrandLogoStatusMsg('');

    const validationError = validateSelectedImageFile(file);
    if (validationError) {
      setBrandLogoErrorMsg(validationError);
      notify(validationError, 'error');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setPendingBrandLogoFile(file);
    setPendingBrandLogoPreviewUrl(previewUrl);
    setPendingBrandLogoRemove(false);
    setBrandLogoStatusMsg(
      'Logo preview ready. Tap "Save Brand Logo" to apply it across the header, footer, and About section.'
    );
  };

  const handleRemoveBrandLogo = () => {
    setBrandLogoErrorMsg('');
    if (pendingBrandLogoFile || pendingBrandLogoPreviewUrl) {
      setPendingBrandLogoFile(null);
      setPendingBrandLogoPreviewUrl(null);
      setPendingBrandLogoRemove(false);
      setBrandLogoStatusMsg('Selected logo preview cleared.');
      return;
    }
    if (settingsForm.brand_logo_url) {
      setPendingBrandLogoRemove(true);
      setBrandLogoStatusMsg(
        'Custom logo marked for removal. Tap "Save Brand Logo" to restore the default diary & sunflower emblem.'
      );
    }
  };

  const handleSaveBrandLogo = async () => {
    setBrandLogoErrorMsg('');
    setBrandLogoStatusMsg('');
    setSavingBrandLogo(true);
    try {
      let nextUrl = settingsForm.brand_logo_url || '';

      if (pendingBrandLogoFile) {
        setBrandLogoUploadProgress(0);
        const fd = new FormData();
        fd.append('file', pendingBrandLogoFile);
        fd.append('purpose', 'brand_logo');
        fd.append('altText', 'मधुच्या जाणीवा ✨ — ब्रँड लोगो');

        const uploadRes = await adminUpload(
          '/api/admin/media?purpose=brand_logo',
          fd,
          (pct) => setBrandLogoUploadProgress(pct)
        );
        const uploadData = await uploadRes.json().catch(() => ({}));
        if (!uploadRes.ok || !uploadData?.media?.url) {
          throw new Error(
            uploadData.error || 'Could not upload brand logo image.'
          );
        }
        nextUrl = uploadData.media.url;
      } else if (pendingBrandLogoRemove) {
        nextUrl = '';
      }

      const saveRes = await adminFetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_logo_url: nextUrl,
        }),
      });
      const saveData = await saveRes.json().catch(() => ({}));
      if (!saveRes.ok) {
        throw new Error(saveData.error || 'Could not save brand logo.');
      }

      setSettingsForm(saveData.settings || {});
      setPendingBrandLogoFile(null);
      setPendingBrandLogoPreviewUrl(null);
      setPendingBrandLogoRemove(false);

      const msg = nextUrl
        ? 'Primary brand logo saved permanently!'
        : 'Default diary & sunflower brand logo restored.';
      setBrandLogoStatusMsg(msg);
      notify(msg);
      await Promise.all([loadDashboardData(), refreshSiteData()]);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Unable to save brand logo.';
      setBrandLogoErrorMsg(msg);
      notify(msg, 'error');
    } finally {
      setBrandLogoUploadProgress(null);
      setSavingBrandLogo(false);
    }
  };

  const handleSaveArticle = async (overrideStatus?: 'draft' | 'published' | 'scheduled') => {
    if (!editingArticle) return;
    if (!editingArticle.titleMr.trim() || !editingArticle.contentMr.trim()) {
      notify('Please enter both a Marathi title and writing content.', 'error');
      return;
    }

    const finalStatus = overrideStatus ?? editingArticle.status;
    if (finalStatus === 'scheduled' && !editingArticle.scheduledAt) {
      notify('Please pick a scheduled date and time.', 'error');
      return;
    }

    setSavingArticle(true);
    setCoverUploadError('');
    try {
      const { url: resolvedCoverUrl, alt: resolvedCoverAlt } =
        await resolveCoverImageForSave();

      const payload = {
        titleMr: editingArticle.titleMr,
        slug: editingArticle.slug || undefined,
        excerptMr: editingArticle.excerptMr,
        contentMr: editingArticle.contentMr,
        featuredImageUrl: resolvedCoverUrl,
        featuredImageAlt: resolvedCoverAlt,
        categoryId: editingArticle.categoryId,
        status: finalStatus,
        scheduledAt:
          finalStatus === 'scheduled' && editingArticle.scheduledAt
            ? new Date(editingArticle.scheduledAt).toISOString()
            : null,
        isFeatured: editingArticle.isFeatured,
        isSample: editingArticle.isSample,
        seoTitleMr: editingArticle.seoTitleMr,
        seoDescriptionMr: editingArticle.seoDescriptionMr,
        tags: editingArticle.tagsInput
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        englishTranslation: {
          enabled: editingArticle.enEnabled,
          title: editingArticle.enTitle,
          excerpt: editingArticle.enExcerpt,
          content: editingArticle.enContent,
          seoTitle: editingArticle.enSeoTitle,
          seoDescription: editingArticle.enSeoDescription,
          isPublished: editingArticle.enIsPublished,
        },
      };

      const url = editingArticle.id
        ? `/api/admin/articles/${editingArticle.id}`
        : '/api/admin/articles';
      const method = editingArticle.id ? 'PUT' : 'POST';

      const res = await adminFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save article');

      notify(
        finalStatus === 'published'
          ? 'लेख प्रकाशित झाला! (Article published!)'
          : 'लेख सुरक्षित झाला! (Article saved!)'
      );
      resetCoverUploadState();
      setEditingArticle(null);
      await Promise.all([loadDashboardData(), refreshSiteData()]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      setCoverUploadError(msg);
      notify(msg, 'error');
    } finally {
      setCoverUploadProgress(null);
      setSavingArticle(false);
    }
  };

  const handleQuickToggleStatus = async (art: ArticleSummary) => {
    try {
      const detailRes = await adminFetch(`/api/admin/articles/${art.id}`);
      const detail = await detailRes.json();
      if (!detailRes.ok) throw new Error('Load failed');
      const a = detail.article;
      const nextStatus = a.status === 'published' ? 'draft' : 'published';
      const res = await adminFetch(`/api/admin/articles/${art.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titleMr: a.titleMr,
          slug: a.slug,
          excerptMr: a.excerptMr,
          contentMr: a.contentMr,
          featuredImageUrl: a.featuredImageUrl,
          featuredImageAlt: a.featuredImageAlt,
          categoryId: a.categoryId,
          status: nextStatus,
          isFeatured: a.isFeatured,
          isSample: a.isSample,
          seoTitleMr: a.seoTitleMr,
          seoDescriptionMr: a.seoDescriptionMr,
          tags: detail.tags || [],
        }),
      });
      if (!res.ok) throw new Error('Update failed');
      notify(nextStatus === 'published' ? 'Published article.' : 'Moved to drafts.');
      await Promise.all([loadDashboardData(), refreshSiteData()]);
    } catch {
      notify('Could not update status.', 'error');
    }
  };

  const handleDeleteArticle = async (id: number) => {
    try {
      const res = await adminFetch(`/api/admin/articles/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Delete failed');
      notify('Article deleted.');
      await Promise.all([loadDashboardData(), refreshSiteData()]);
    } catch {
      notify('Could not delete article.', 'error');
    }
  };

  const handleClearSamples = async () => {
    try {
      const res = await adminFetch('/api/admin/sample-articles', {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed');
      notify('Sample template articles removed.');
      await Promise.all([loadDashboardData(), refreshSiteData()]);
    } catch {
      notify('Could not remove sample articles.', 'error');
    }
  };

  // Category actions
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = catEditId
        ? `/api/admin/categories/${catEditId}`
        : '/api/admin/categories';
      const method = catEditId ? 'PUT' : 'POST';
      const res = await adminFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nameMr: catNameMr,
          nameEn: catNameEn,
          slug: catSlug || undefined,
          descriptionMr: catDescMr,
          descriptionEn: catDescEn,
          sortOrder: Number(catOrder) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setCatEditId(null);
      setCatNameMr('');
      setCatNameEn('');
      setCatSlug('');
      setCatDescMr('');
      setCatDescEn('');
      setCatOrder(0);
      notify('Category saved.');
      await Promise.all([loadDashboardData(), refreshSiteData()]);
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Save category failed', 'error');
    }
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      const res = await adminFetch(`/api/admin/categories/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Delete failed');
      notify('Category deleted.');
      await Promise.all([loadDashboardData(), refreshSiteData()]);
    } catch {
      notify('Could not delete category.', 'error');
    }
  };

  // Media actions
  const handleUploadMedia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const validationError = validateSelectedImageFile(file);
    if (validationError) {
      notify(validationError, 'error');
      return;
    }
    setUploadingMedia(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('altText', mediaAlt);
      fd.append('caption', mediaCaption);
      const res = await adminUpload('/api/admin/media', fd);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setMediaAlt('');
      setMediaCaption('');
      notify('Image uploaded to Media Library.');
      await loadDashboardData();
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Upload failed', 'error');
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleUpdateMediaAlt = async (id: number, altText: string) => {
    try {
      const res = await adminFetch(`/api/admin/media/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ altText }),
      });
      if (!res.ok) throw new Error('Failed');
      notify('Alt text updated.');
      await loadDashboardData();
    } catch {
      notify('Could not update alt text.', 'error');
    }
  };

  const handleReplaceMediaFile = async (
    id: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await adminFetch(`/api/admin/media/${id}`, {
        method: 'PUT',
        body: fd,
      });
      if (!res.ok) throw new Error('Replace failed');
      notify('Image file replaced.');
      await loadDashboardData();
    } catch {
      notify('Could not replace image.', 'error');
    }
  };

  const handleDeleteMedia = async (id: number) => {
    try {
      const res = await adminFetch(`/api/admin/media/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed');
      notify('Image deleted.');
      await loadDashboardData();
    } catch {
      notify('Could not delete image.', 'error');
    }
  };

  // Messages & Comments actions
  const handleToggleMessage = async (
    id: number,
    patch: { isRead?: boolean; isSpam?: boolean }
  ) => {
    await adminFetch(`/api/admin/messages/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    await loadDashboardData();
  };

  const handleDeleteMessage = async (id: number) => {
    await adminFetch(`/api/admin/messages/${id}`, { method: 'DELETE' });
    notify('Message deleted.');
    await loadDashboardData();
  };

  const handleModerateComment = async (
    id: number,
    status: 'approved' | 'rejected'
  ) => {
    await adminFetch(`/api/admin/comments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    notify(`Reflection ${status}.`);
    await loadDashboardData();
  };

  const handleDeleteComment = async (id: number) => {
    await adminFetch(`/api/admin/comments/${id}`, { method: 'DELETE' });
    await loadDashboardData();
  };

  // Settings actions
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await adminFetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsForm),
      });
      if (!res.ok) throw new Error('Failed');
      notify('Site settings saved.');
      await refreshSiteData();
    } catch {
      notify('Could not save settings.', 'error');
    }
  };

  // ============================================================================
  // UNAUTHENTICATED / TWO-LAYER ADMIN SECURITY GATE
  // ============================================================================

  if (authLoading || setupRequired === null) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center text-sm text-[#6E5B50] dark:text-[#B8AA98]">
        Checking secure session...
      </div>
    );
  }

  if (!firebaseUser || !adminSessionToken) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 sm:py-24">
        <div className="p-8 rounded-2xl border border-[#E5DCCD] dark:border-[#302821] bg-[#FDFBF7] dark:bg-[#1E1915] space-y-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-[#4F6855] dark:text-[#8AA890]">
              <ShieldCheck className="w-4 h-4" />
              <span>लेखिका स्टुडिओ · Author Studio</span>
            </div>
            <h1 className="font-editorial text-3xl font-semibold text-[#2B211C] dark:text-[#FAF6EF]">
              {setupRequired
                ? 'Initial Admin Setup'
                : 'Authorized Admin Sign-In'}
            </h1>
            <p className="text-sm text-[#6E5B50] dark:text-[#B8AA98] leading-relaxed">
              {setupRequired
                ? 'No administrator is registered yet. Sign in with your Google account and set a private Admin Passphrase to lock your studio.'
                : 'Sign in with your authorized Google account and enter your private Admin Passphrase.'}
            </p>
          </div>

          {!firebaseUser ? (
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={authBusy}
              className="w-full py-3 px-5 rounded-lg bg-[#4F6855] hover:bg-[#3F5544] text-white text-sm font-medium transition-colors disabled:opacity-60"
            >
              {authBusy ? 'Connecting...' : 'Sign in with Google'}
            </button>
          ) : setupRequired ? (
            <form onSubmit={handleInitialSetupSubmit} className="space-y-4">
              <div className="p-3 rounded-lg bg-[#F3ECE1] dark:bg-[#241E19] text-xs text-[#5C4B42] dark:text-[#C5B7A4] flex items-center justify-between">
                <span className="truncate">{firebaseUser.email}</span>
                <button
                  type="button"
                  onClick={signOutAll}
                  className="underline ml-2 shrink-0"
                >
                  Switch
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#5C4B42] dark:text-[#C5B7A4] mb-1">
                  Author Display Name
                </label>
                <input
                  type="text"
                  required
                  value={setupDisplayName}
                  onChange={(e) => setSetupDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] bg-[#FAF6EF] dark:bg-[#161310]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#5C4B42] dark:text-[#C5B7A4] mb-1">
                  Create Admin Passphrase (min 8 chars)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={passphraseInput}
                  onChange={(e) => setPassphraseInput(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] bg-[#FAF6EF] dark:bg-[#161310]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#5C4B42] dark:text-[#C5B7A4] mb-1">
                  Confirm Admin Passphrase
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={passphraseConfirm}
                  onChange={(e) => setPassphraseConfirm(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] bg-[#FAF6EF] dark:bg-[#161310]"
                />
              </div>

              <button
                type="submit"
                disabled={authBusy}
                className="w-full py-3 px-5 rounded-lg bg-[#4F6855] hover:bg-[#3F5544] text-white text-sm font-medium transition-colors disabled:opacity-60"
              >
                {authBusy ? 'Securing Studio...' : 'Complete Admin Setup'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleUnlockSubmit} className="space-y-4">
              <div className="p-3 rounded-lg bg-[#F3ECE1] dark:bg-[#241E19] text-xs text-[#5C4B42] dark:text-[#C5B7A4] flex items-center justify-between">
                <span className="truncate">{firebaseUser.email}</span>
                <button
                  type="button"
                  onClick={signOutAll}
                  className="underline ml-2 shrink-0"
                >
                  Sign out
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#5C4B42] dark:text-[#C5B7A4] mb-1">
                  Admin Passphrase
                </label>
                <input
                  type="password"
                  required
                  value={passphraseInput}
                  onChange={(e) => setPassphraseInput(e.target.value)}
                  placeholder="Enter your studio passphrase"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] bg-[#FAF6EF] dark:bg-[#161310]"
                />
              </div>

              <button
                type="submit"
                disabled={authBusy}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-lg bg-[#4F6855] hover:bg-[#3F5544] text-white text-sm font-medium transition-colors disabled:opacity-60"
              >
                <Lock className="w-4 h-4" />
                <span>{authBusy ? 'Verifying...' : 'Unlock Author Studio'}</span>
              </button>
            </form>
          )}

          {authError && (
            <p className="text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg border border-red-200 dark:border-red-900/50">
              {authError}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // AUTHENTICATED ADMIN DASHBOARD
  // ============================================================================

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'articles', label: 'Articles', icon: <FileText className="w-4 h-4" /> },
    { id: 'categories', label: 'Categories', icon: <FolderOpen className="w-4 h-4" /> },
    { id: 'media', label: 'Media Library', icon: <ImageIcon className="w-4 h-4" /> },
    {
      id: 'messages',
      label: `Inbox${stats?.unreadMessages ? ` (${stats.unreadMessages})` : ''}`,
      icon: <Inbox className="w-4 h-4" />,
    },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E5DCCD] dark:border-[#2C251F]">
        <div className="flex items-center gap-3.5">
          {settingsForm.profile_image_url ? (
            <span className="inline-flex w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-[#DFD4C2] dark:border-[#3A3129] bg-[#FAF6EF]">
              <ResilientImage
                src={settingsForm.profile_image_url}
                alt={settingsForm.profile_image_alt || 'माधुरी'}
                className="w-full h-full object-cover"
              />
            </span>
          ) : (
            <BrandLogo size="md" />
          )}
          <div>
            <p className="text-xs tracking-widest uppercase font-medium text-[#4F6855] dark:text-[#8AA890]">
              मधुच्या जाणीवा ✨ · Author Studio
            </p>
            <h1 className="font-editorial text-3xl font-semibold text-[#2B211C] dark:text-[#FAF6EF] mt-1">
              नमस्कार, {adminProfile?.displayName || 'माधुरी'}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              resetCoverUploadState();
              setActiveTab('articles');
              setEditingArticle({
                ...EMPTY_ARTICLE_FORM,
                categoryId: categoriesList[0]?.id ?? null,
              });
              setEditorLangTab('mr');
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#4F6855] hover:bg-[#3F5544] text-white text-xs font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Write New Article</span>
          </button>

          <button
            type="button"
            onClick={signOutAll}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] text-xs font-medium hover:border-red-400 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Status Toast */}
      {bannerMsg && (
        <div
          className={`mt-5 p-3.5 rounded-xl text-sm flex items-center justify-between ${
            bannerType === 'error'
              ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/50'
              : 'bg-[#4F6855]/10 text-[#3B5240] dark:text-[#9EC0A5] border border-[#4F6855]/30'
          }`}
        >
          <span>{bannerMsg}</span>
          <button type="button" onClick={() => setBannerMsg('')}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 py-5 border-b border-[#E5DCCD] dark:border-[#2C251F]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveTab(tab.id);
              if (tab.id !== 'articles') setEditingArticle(null);
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeTab === tab.id
                ? 'bg-[#2B211C] dark:bg-[#EFE8DC] text-[#FAF6EF] dark:text-[#161310]'
                : 'bg-[#F3ECE1] dark:bg-[#221C17] text-[#5C4B42] dark:text-[#C5B7A4] hover:text-[#2B211C]'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && stats && (
        <div className="py-8 space-y-10">
          {stats.sampleArticles > 0 && (
            <div className="p-5 rounded-xl border border-[#D4C7B4] dark:border-[#3A3129] bg-[#F3ECE1] dark:bg-[#221C17] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-[#2B211C] dark:text-[#FAF6EF]">
                  {stats.sampleArticles} Sample Template Preview(s) Active
                </p>
                <p className="text-xs text-[#6E5B50] dark:text-[#B8AA98]">
                  These clearly marked sample writings demonstrate the bilingual layout. You can remove all sample previews with one click whenever you publish your own writing.
                </p>
              </div>
              <button
                type="button"
                onClick={handleClearSamples}
                className="px-4 py-2 rounded-lg border border-[#B88A44] text-xs font-medium text-[#7B5A24] dark:text-[#DFB676] hover:bg-[#B88A44]/10 whitespace-nowrap shrink-0"
              >
                Remove Sample Previews
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'Total Writings', val: stats.totalArticles },
              { label: 'Published', val: stats.publishedArticles },
              { label: 'Drafts', val: stats.draftArticles },
              { label: 'Categories', val: stats.totalCategories },
              { label: 'Unread Messages', val: stats.unreadMessages },
              { label: 'Media Images', val: stats.totalMedia },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="p-5 rounded-xl border border-[#E5DCCD] dark:border-[#302821] bg-[#FDFBF7] dark:bg-[#1E1915]"
              >
                <p className="text-xs text-[#6E5B50] dark:text-[#B8AA98]">
                  {kpi.label}
                </p>
                <p className="font-editorial text-3xl font-semibold text-[#2B211C] dark:text-[#FAF6EF] mt-1 tabular-nums">
                  {kpi.val}
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 p-6 rounded-xl border border-[#E5DCCD] dark:border-[#302821] bg-[#FDFBF7] dark:bg-[#1E1915] space-y-4">
              <h2 className="font-editorial text-xl font-semibold">
                Recent Studio Activity
              </h2>
              {recentActivity.length > 0 ? (
                <ul className="divide-y divide-[#ECE4D7] dark:divide-[#2C251F]">
                  {recentActivity.map((act) => (
                    <li
                      key={act.id}
                      className="py-3 flex items-baseline justify-between gap-4 text-sm"
                    >
                      <span className="text-[#3D2F28] dark:text-[#DFD4C3]">
                        {act.summary}
                      </span>
                      <span className="text-xs text-[#8A776A] whitespace-nowrap shrink-0">
                        {formatPublishedDate(act.createdAt, language)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[#6E5B50]">No recent activity recorded.</p>
              )}
            </div>

            <div className="lg:col-span-5 p-6 rounded-xl border border-[#E5DCCD] dark:border-[#302821] bg-[#FDFBF7] dark:bg-[#1E1915] space-y-4">
              <h2 className="font-editorial text-xl font-semibold">
                Community Overview
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-[#ECE4D7] dark:border-[#2C251F]">
                  <span className="text-[#6E5B50] dark:text-[#B8AA98]">
                    Scheduled Articles
                  </span>
                  <span className="font-medium tabular-nums">
                    {stats.scheduledArticles}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-[#ECE4D7] dark:border-[#2C251F]">
                  <span className="text-[#6E5B50] dark:text-[#B8AA98]">
                    Pending Reader Reflections
                  </span>
                  <span className="font-medium tabular-nums">
                    {stats.pendingComments}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-[#6E5B50] dark:text-[#B8AA98]">
                    Newsletter Subscribers
                  </span>
                  <span className="font-medium tabular-nums">
                    {stats.subscriberCount}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Dashboard Homepage Profile / Introduction Image Manager */}
          <div className="p-6 rounded-xl border border-[#E5DCCD] dark:border-[#302821] bg-[#FDFBF7] dark:bg-[#1E1915]">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-5">
                <div className="rounded-xl overflow-hidden border border-[#E5DCCD] dark:border-[#302821] bg-[#F3ECE1]/60 dark:bg-[#161310] flex items-center justify-center min-h-[220px]">
                  <ResilientImage
                    src={
                      pendingProfilePreviewUrl
                        ? pendingProfilePreviewUrl
                        : pendingProfileRemove
                          ? EDITORIAL_IMAGES.heroJournal
                          : settingsForm.profile_image_url ||
                            EDITORIAL_IMAGES.heroJournal
                    }
                    alt={profileAltDraft || 'Homepage Author & Admin Profile Image'}
                    fallbackLabel="माधुरी"
                    className={
                      pendingProfilePreviewUrl ||
                      (!pendingProfileRemove && settingsForm.profile_image_url)
                        ? 'w-full h-auto max-h-72 object-contain'
                        : 'w-full h-64 object-cover'
                    }
                  />
                </div>
              </div>

              <div className="lg:col-span-7 space-y-4">
                <div>
                  <h2 className="font-editorial text-2xl font-semibold text-[#2B211C] dark:text-[#FAF6EF]">
                    Homepage Author & Admin Profile Image
                  </h2>
                  <p className="text-xs text-[#6E5B50] dark:text-[#B8AA98] mt-1">
                    Displayed in your Admin Studio profile and in the large author introduction section on the homepage · JPG, JPEG, PNG or WebP · Max 5 MB
                  </p>
                </div>

                <input
                  ref={profileFileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                  onChange={handleProfileImageSelect}
                  className="hidden"
                  aria-label="Upload author profile photo from gallery"
                />

                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    disabled={savingProfileImage}
                    onClick={() => profileFileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-lg bg-[#4F6855] hover:bg-[#3F5544] disabled:opacity-60 text-white transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 shrink-0" />
                    <span>Upload from Gallery</span>
                  </button>

                  <button
                    type="button"
                    disabled={
                      savingProfileImage ||
                      (!pendingProfileFile &&
                        (!settingsForm.profile_image_url || pendingProfileRemove))
                    }
                    onClick={handleRemoveProfileImage}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] text-[#5C4B42] dark:text-[#C5B7A4] hover:border-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-45 disabled:pointer-events-none transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Remove Selected Photo</span>
                  </button>

                  <button
                    type="button"
                    disabled={
                      savingProfileImage ||
                      (!pendingProfileFile &&
                        !pendingProfileRemove &&
                        profileAltDraft.trim() ===
                          (settingsForm.profile_image_alt || '').trim())
                    }
                    onClick={handleSaveProfileImage}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium rounded-lg bg-[#2B211C] dark:bg-[#EFE8DC] text-[#FAF6EF] dark:text-[#161310] disabled:opacity-45 disabled:pointer-events-none transition-colors"
                  >
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {savingProfileImage ? 'Saving...' : 'Save Profile Image'}
                    </span>
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#5C4B42] dark:text-[#C5B7A4] mb-1">
                    Profile Photo Alt Text (Optional)
                  </label>
                  <input
                    type="text"
                    value={profileAltDraft}
                    onChange={(e) => setProfileAltDraft(e.target.value)}
                    placeholder="उदा. माधुरी — मधुच्या जाणीवा लेखिका"
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] bg-[#FAF6EF] dark:bg-[#161310]"
                  />
                </div>

                {profileUploadProgress !== null && (
                  <div className="space-y-1.5" role="status" aria-live="polite">
                    <div className="flex items-center justify-between text-[11px] text-[#4F6855] dark:text-[#8AA890] font-medium">
                      <span>Uploading profile photo...</span>
                      <span className="tabular-nums">{profileUploadProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#E5DCCD] dark:bg-[#302821] overflow-hidden">
                      <div
                        className="h-full bg-[#4F6855] transition-all duration-150"
                        style={{ width: `${profileUploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {profileStatusMsg && (
                  <p
                    role="status"
                    className="text-xs px-3 py-2 rounded-lg border border-[#C6D6C7] dark:border-[#3B5240] bg-[#EDF4ED] dark:bg-[#1E2A21] text-[#354E3A] dark:text-[#B4D1B8]"
                  >
                    {profileStatusMsg}
                  </p>
                )}

                {profileErrorMsg && (
                  <p
                    role="alert"
                    className="text-xs px-3 py-2 rounded-lg border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300"
                  >
                    {profileErrorMsg}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Primary Brand Logo (Header, Footer & About Section) Manager */}
          <div className="p-6 rounded-xl border border-[#E5DCCD] dark:border-[#302821] bg-[#FDFBF7] dark:bg-[#1E1915]">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-4 flex items-center justify-center">
                <div className="w-36 h-36 rounded-2xl overflow-hidden border border-[#E5DCCD] dark:border-[#302821] bg-[#FAF6EF] flex items-center justify-center p-2">
                  <ResilientImage
                    src={
                      pendingBrandLogoPreviewUrl
                        ? pendingBrandLogoPreviewUrl
                        : pendingBrandLogoRemove
                          ? defaultBrandLogo
                          : settingsForm.brand_logo_url || defaultBrandLogo
                    }
                    alt="मधुच्या जाणीवा ✨ — ब्रँड लोगो"
                    fallbackLabel="मधुच्या जाणीवा ✨"
                    className={
                      pendingBrandLogoPreviewUrl ||
                      (!pendingBrandLogoRemove && settingsForm.brand_logo_url)
                        ? 'w-full h-full object-contain'
                        : 'w-full h-full object-cover scale-[1.22]'
                    }
                  />
                </div>
              </div>

              <div className="lg:col-span-8 space-y-4">
                <div>
                  <h2 className="font-editorial text-2xl font-semibold text-[#2B211C] dark:text-[#FAF6EF]">
                    Brand Logo (मधुच्या जाणीवा ✨)
                  </h2>
                  <p className="text-xs text-[#6E5B50] dark:text-[#B8AA98] mt-1">
                    Displayed in the website header, footer, and About section · Open Diary & Sunflower identity · JPG, JPEG, PNG or WebP · Max 5 MB
                  </p>
                </div>

                <input
                  ref={brandLogoFileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                  onChange={handleBrandLogoSelect}
                  className="hidden"
                  aria-label="Choose brand logo from gallery"
                />

                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    disabled={savingBrandLogo}
                    onClick={() => brandLogoFileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-lg bg-[#4F6855] hover:bg-[#3F5544] disabled:opacity-60 text-white transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 shrink-0" />
                    <span>Choose Logo from Gallery</span>
                  </button>

                  <button
                    type="button"
                    disabled={
                      savingBrandLogo ||
                      (!pendingBrandLogoFile &&
                        (!settingsForm.brand_logo_url || pendingBrandLogoRemove))
                    }
                    onClick={handleRemoveBrandLogo}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] text-[#5C4B42] dark:text-[#C5B7A4] hover:border-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-45 disabled:pointer-events-none transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Remove Custom Logo</span>
                  </button>

                  <button
                    type="button"
                    disabled={
                      savingBrandLogo ||
                      (!pendingBrandLogoFile && !pendingBrandLogoRemove)
                    }
                    onClick={handleSaveBrandLogo}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium rounded-lg bg-[#2B211C] dark:bg-[#EFE8DC] text-[#FAF6EF] dark:text-[#161310] disabled:opacity-45 disabled:pointer-events-none transition-colors"
                  >
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {savingBrandLogo ? 'Saving...' : 'Save Brand Logo'}
                    </span>
                  </button>
                </div>

                {brandLogoUploadProgress !== null && (
                  <div className="space-y-1.5" role="status" aria-live="polite">
                    <div className="flex items-center justify-between text-[11px] text-[#4F6855] dark:text-[#8AA890] font-medium">
                      <span>Uploading brand logo...</span>
                      <span className="tabular-nums">{brandLogoUploadProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#E5DCCD] dark:bg-[#302821] overflow-hidden">
                      <div
                        className="h-full bg-[#4F6855] transition-all duration-150"
                        style={{ width: `${brandLogoUploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {brandLogoStatusMsg && (
                  <p
                    role="status"
                    className="text-xs px-3 py-2 rounded-lg border border-[#C6D6C7] dark:border-[#3B5240] bg-[#EDF4ED] dark:bg-[#1E2A21] text-[#354E3A] dark:text-[#B4D1B8]"
                  >
                    {brandLogoStatusMsg}
                  </p>
                )}

                {brandLogoErrorMsg && (
                  <p
                    role="alert"
                    className="text-xs px-3 py-2 rounded-lg border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300"
                  >
                    {brandLogoErrorMsg}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ARTICLES MANAGEMENT & EDITOR */}
      {activeTab === 'articles' && !editingArticle && (
        <div className="py-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-editorial text-2xl font-semibold">
              All Writings ({articlesList.length})
            </h2>
            <button
              type="button"
              onClick={() => {
                resetCoverUploadState();
                setEditingArticle({
                  ...EMPTY_ARTICLE_FORM,
                  categoryId: categoriesList[0]?.id ?? null,
                });
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#4F6855] text-white text-xs font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>New Article</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#E5DCCD] dark:border-[#302821] bg-[#FDFBF7] dark:bg-[#1E1915]">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#E5DCCD] dark:border-[#302821] text-xs text-[#6E5B50] dark:text-[#B8AA98] bg-[#F5EFE4] dark:bg-[#241E19]">
                <tr>
                  <th className="py-3 px-4 font-medium">Title (Marathi)</th>
                  <th className="py-3 px-4 font-medium">Category</th>
                  <th className="py-3 px-4 font-medium">Languages</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECE4D7] dark:divide-[#2C251F]">
                {articlesList.map((art) => (
                  <tr key={art.id} className="hover:bg-[#FAF6EF]/70 dark:hover:bg-[#241E19]/60">
                    <td className="py-3.5 px-4">
                      <p className="font-medium text-[#2B211C] dark:text-[#FAF6EF]">
                        {art.titleMr}
                      </p>
                      <p className="text-xs text-[#8A776A] mt-0.5">
                        /writings/{art.slug}
                        {art.isSample ? ' · Sample Template' : ''}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[#5C4B42] dark:text-[#C5B7A4]">
                      {art.categoryNameMr || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      MR {art.hasEnglishTranslation ? '· EN' : ''}
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <span
                        className={`font-medium ${
                          art.status === 'published'
                            ? 'text-[#4F6855] dark:text-[#8AA890]'
                            : art.status === 'scheduled'
                              ? 'text-[#9A702E] dark:text-[#CFA86A]'
                              : 'text-[#6E5B50] dark:text-[#A99A88]'
                        }`}
                      >
                        {art.status === 'published'
                          ? 'Published'
                          : art.status === 'scheduled'
                            ? 'Scheduled'
                            : 'Draft'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openEditArticle(art.id)}
                        className="px-2.5 py-1 text-xs rounded border border-[#D4C7B4] dark:border-[#3A3129] hover:border-[#4F6855]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickToggleStatus(art)}
                        className="px-2.5 py-1 text-xs rounded border border-[#D4C7B4] dark:border-[#3A3129] hover:border-[#4F6855]"
                      >
                        {art.status === 'published' ? 'Unpublish' : 'Publish'}
                      </button>
                      {art.status === 'published' && (
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/writings/${encodeURIComponent(art.slug)}`)
                          }
                          className="px-2.5 py-1 text-xs rounded border border-[#D4C7B4] dark:border-[#3A3129]"
                        >
                          View
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteArticle(art.id)}
                        className="p-1.5 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ARTICLE EDITOR WORKSPACE */}
      {activeTab === 'articles' && editingArticle && (
        <div className="py-8 space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-editorial text-2xl font-semibold">
              {editingArticle.id ? 'Edit Writing' : 'Compose New Writing'}
            </h2>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg border border-[#D4C7B4] dark:border-[#3A3129]"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview</span>
              </button>
              <button
                type="button"
                disabled={
                  savingArticle ||
                  savingCoverOnly ||
                  coverUploadProgress !== null
                }
                onClick={() => handleSaveArticle('draft')}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] bg-[#F3ECE1] dark:bg-[#221C17] disabled:opacity-50"
              >
                Save Draft
              </button>
              <button
                type="button"
                disabled={
                  savingArticle ||
                  savingCoverOnly ||
                  coverUploadProgress !== null
                }
                onClick={() => handleSaveArticle('published')}
                className="px-5 py-2 text-xs font-medium rounded-lg bg-[#4F6855] hover:bg-[#3F5544] text-white disabled:opacity-50"
              >
                {savingArticle
                  ? 'Saving...'
                  : editingArticle.id && editingArticle.status === 'published'
                    ? 'Save Changes'
                    : 'Publish Immediately'}
              </button>
              <button
                type="button"
                onClick={() => {
                  resetCoverUploadState();
                  setEditingArticle(null);
                }}
                className="px-3 py-2 text-xs text-[#6E5B50] hover:underline"
              >
                Cancel
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Main Writing Pane */}
            <div className="lg:col-span-8 space-y-6">
              {/* Language Switcher for Bilingual Content */}
              <div className="flex items-center gap-2 border-b border-[#E5DCCD] dark:border-[#2C251F] pb-3">
                <button
                  type="button"
                  onClick={() => setEditorLangTab('mr')}
                  className={`px-4 py-2 rounded-lg text-xs font-medium ${
                    editorLangTab === 'mr'
                      ? 'bg-[#4F6855] text-white'
                      : 'bg-[#F3ECE1] dark:bg-[#221C17] text-[#5C4B42] dark:text-[#C5B7A4]'
                  }`}
                >
                  मराठी मूळ लेख (Original Marathi)
                </button>
                <button
                  type="button"
                  onClick={() => setEditorLangTab('en')}
                  className={`px-4 py-2 rounded-lg text-xs font-medium ${
                    editorLangTab === 'en'
                      ? 'bg-[#4F6855] text-white'
                      : 'bg-[#F3ECE1] dark:bg-[#221C17] text-[#5C4B42] dark:text-[#C5B7A4]'
                  }`}
                >
                  English Translation (Optional)
                </button>
              </div>

              {editorLangTab === 'mr' ? (
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-medium text-[#5C4B42] dark:text-[#C5B7A4] mb-1.5">
                      लेखाचे शीर्षक (Marathi Title) *
                    </label>
                    <input
                      type="text"
                      value={editingArticle.titleMr}
                      onChange={(e) =>
                        setEditingArticle({
                          ...editingArticle,
                          titleMr: e.target.value,
                        })
                      }
                      placeholder="येथे मराठी शीर्षक लिहा..."
                      className="w-full px-4 py-3 text-lg font-editorial rounded-xl border border-[#D4C7B4] dark:border-[#3A3129] bg-[#FDFBF7] dark:bg-[#1E1915]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#5C4B42] dark:text-[#C5B7A4] mb-1.5">
                      थोडक्यात ओळख / सारांश (Excerpt)
                    </label>
                    <textarea
                      rows={2}
                      value={editingArticle.excerptMr}
                      onChange={(e) =>
                        setEditingArticle({
                          ...editingArticle,
                          excerptMr: e.target.value,
                        })
                      }
                      placeholder="लेखाची १-२ ओळींची ओळख..."
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-[#D4C7B4] dark:border-[#3A3129] bg-[#FDFBF7] dark:bg-[#1E1915]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#5C4B42] dark:text-[#C5B7A4] mb-1.5">
                      मूळ लेखन (Marathi Content) *
                    </label>
                    <RichTextEditor
                      value={editingArticle.contentMr}
                      onChange={(html) =>
                        setEditingArticle((prev) =>
                          prev ? { ...prev, contentMr: html } : prev
                        )
                      }
                      onPickMedia={() => setMediaPickerTarget('contentMr')}
                      insertImageUrl={insertMrImageUrl}
                      onImageInserted={() => setInsertMrImageUrl(null)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-medium text-[#5C4B42] dark:text-[#C5B7A4] mb-1">
                        SEO Title (Optional)
                      </label>
                      <input
                        type="text"
                        value={editingArticle.seoTitleMr}
                        onChange={(e) =>
                          setEditingArticle({
                            ...editingArticle,
                            seoTitleMr: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 text-xs rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] bg-[#FDFBF7] dark:bg-[#1E1915]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#5C4B42] dark:text-[#C5B7A4] mb-1">
                        SEO Meta Description (Optional)
                      </label>
                      <input
                        type="text"
                        value={editingArticle.seoDescriptionMr}
                        onChange={(e) =>
                          setEditingArticle({
                            ...editingArticle,
                            seoDescriptionMr: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 text-xs rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] bg-[#FDFBF7] dark:bg-[#1E1915]"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <label className="flex items-center gap-2.5 p-4 rounded-xl border border-[#E5DCCD] dark:border-[#302821] bg-[#F3ECE1]/60 dark:bg-[#221C17] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingArticle.enEnabled}
                      onChange={(e) =>
                        setEditingArticle({
                          ...editingArticle,
                          enEnabled: e.target.checked,
                        })
                      }
                      className="rounded"
                    />
                    <span className="text-sm font-medium">
                      Provide a separate English translation for this article (never alters Marathi original)
                    </span>
                  </label>

                  {editingArticle.enEnabled && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-[#5C4B42] dark:text-[#C5B7A4] mb-1.5">
                          English Title
                        </label>
                        <input
                          type="text"
                          value={editingArticle.enTitle}
                          onChange={(e) =>
                            setEditingArticle({
                              ...editingArticle,
                              enTitle: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 text-lg font-editorial rounded-xl border border-[#D4C7B4] dark:border-[#3A3129] bg-[#FDFBF7] dark:bg-[#1E1915]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#5C4B42] dark:text-[#C5B7A4] mb-1.5">
                          English Excerpt
                        </label>
                        <textarea
                          rows={2}
                          value={editingArticle.enExcerpt}
                          onChange={(e) =>
                            setEditingArticle({
                              ...editingArticle,
                              enExcerpt: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2.5 text-sm rounded-xl border border-[#D4C7B4] dark:border-[#3A3129] bg-[#FDFBF7] dark:bg-[#1E1915]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#5C4B42] dark:text-[#C5B7A4] mb-1.5">
                          English Content
                        </label>
                        <RichTextEditor
                          value={editingArticle.enContent}
                          onChange={(html) =>
                            setEditingArticle((prev) =>
                              prev ? { ...prev, enContent: html } : prev
                            )
                          }
                          placeholder="Write the English version here..."
                          onPickMedia={() => setMediaPickerTarget('contentEn')}
                          insertImageUrl={insertEnImageUrl}
                          onImageInserted={() => setInsertEnImageUrl(null)}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Right Metadata Sidebar */}
            <div className="lg:col-span-4 space-y-5">
              <div className="p-5 rounded-xl border border-[#E5DCCD] dark:border-[#302821] bg-[#FDFBF7] dark:bg-[#1E1915] space-y-4">
                <h3 className="font-editorial text-lg font-medium">
                  Publishing Settings
                </h3>

                <div>
                  <label className="block text-xs font-medium text-[#5C4B42] dark:text-[#C5B7A4] mb-1">
                    Category
                  </label>
                  <select
                    value={editingArticle.categoryId ?? ''}
                    onChange={(e) =>
                      setEditingArticle({
                        ...editingArticle,
                        categoryId: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] bg-[#FAF6EF] dark:bg-[#161310]"
                  >
                    <option value="">Select Category</option>
                    {categoriesList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nameMr} ({c.nameEn})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#5C4B42] dark:text-[#C5B7A4] mb-1">
                    URL Slug (Optional)
                  </label>
                  <input
                    type="text"
                    value={editingArticle.slug}
                    onChange={(e) =>
                      setEditingArticle({
                        ...editingArticle,
                        slug: e.target.value,
                      })
                    }
                    placeholder="auto-generated-if-blank"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] bg-[#FAF6EF] dark:bg-[#161310]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#5C4B42] dark:text-[#C5B7A4] mb-1">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={editingArticle.tagsInput}
                    onChange={(e) =>
                      setEditingArticle({
                        ...editingArticle,
                        tagsInput: e.target.value,
                      })
                    }
                    placeholder="मनातलं, डायरी, कृतज्ञता"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] bg-[#FAF6EF] dark:bg-[#161310]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#5C4B42] dark:text-[#C5B7A4] mb-1">
                    Status
                  </label>
                  <select
                    value={editingArticle.status}
                    onChange={(e) =>
                      setEditingArticle({
                        ...editingArticle,
                        status: e.target.value as 'draft' | 'published' | 'scheduled',
                      })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] bg-[#FAF6EF] dark:bg-[#161310]"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="scheduled">Scheduled</option>
                  </select>
                </div>

                {editingArticle.status === 'scheduled' && (
                  <div>
                    <label className="block text-xs font-medium text-[#5C4B42] dark:text-[#C5B7A4] mb-1">
                      Schedule Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={editingArticle.scheduledAt}
                      onChange={(e) =>
                        setEditingArticle({
                          ...editingArticle,
                          scheduledAt: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-xs rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] bg-[#FAF6EF] dark:bg-[#161310]"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveArticle('scheduled')}
                      className="mt-2 w-full py-2 text-xs font-medium rounded-lg bg-[#B88A44] text-white"
                    >
                      Save Scheduled Publication
                    </button>
                  </div>
                )}

                <label className="flex items-center gap-2 text-xs cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={editingArticle.isFeatured}
                    onChange={(e) =>
                      setEditingArticle({
                        ...editingArticle,
                        isFeatured: e.target.checked,
                      })
                    }
                  />
                  <span>Feature on Homepage</span>
                </label>

                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingArticle.isSample}
                    onChange={(e) =>
                      setEditingArticle({
                        ...editingArticle,
                        isSample: e.target.checked,
                      })
                    }
                  />
                  <span>Mark as Sample Preview</span>
                </label>
              </div>

              {/* Upload Cover Image Box */}
              <div className="p-5 rounded-xl border border-[#E5DCCD] dark:border-[#302821] bg-[#FDFBF7] dark:bg-[#1E1915] space-y-3.5">
                <div>
                  <h3 className="font-editorial text-lg font-medium">
                    Upload Cover Image
                  </h3>
                  <p className="text-[11px] text-[#6E5B50] dark:text-[#B8AA98] mt-0.5">
                    JPG, JPEG, PNG or WebP · Max 5 MB
                  </p>
                </div>

                {/* Live Cover Preview (staged preview before saving, saved photo, or placeholder) */}
                {(pendingCoverPreviewUrl ||
                  (!pendingCoverRemove && editingArticle.featuredImageUrl)) ? (
                  <div className="rounded-lg overflow-hidden border border-[#E5DCCD] dark:border-[#302821] bg-[#F3ECE1]/70 dark:bg-[#161310] flex items-center justify-center">
                    <ResilientImage
                      src={
                        pendingCoverPreviewUrl ||
                        editingArticle.featuredImageUrl
                      }
                      alt={editingArticle.featuredImageAlt || 'Cover image preview'}
                      fallbackLabel={editingArticle.titleMr || 'मधुच्या जाणीवा'}
                      className="w-full h-auto max-h-64 object-contain"
                    />
                  </div>
                ) : (
                  <div className="aspect-[4/3] rounded-lg overflow-hidden border border-dashed border-[#D4C7B4] dark:border-[#3A3129]">
                    <ResilientImage
                      src=""
                      alt="No cover image uploaded"
                      fallbackLabel={editingArticle.titleMr || 'मधुच्या जाणीवा'}
                      className="w-full h-full"
                    />
                  </div>
                )}

                {/* Native device file/gallery picker */}
                <input
                  ref={coverFileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                  onChange={handleCoverImageFileSelect}
                  className="hidden"
                  aria-label="Choose cover photo from gallery"
                />

                {/* Explicit Cover Image Actions (matching working Profile Image flow) */}
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    disabled={savingArticle || savingCoverOnly}
                    onClick={() => coverFileInputRef.current?.click()}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-medium rounded-lg bg-[#4F6855] hover:bg-[#3F5544] disabled:opacity-60 text-white transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 shrink-0" />
                    <span>Choose Cover Photo from Gallery</span>
                  </button>

                  <button
                    type="button"
                    disabled={
                      savingArticle ||
                      savingCoverOnly ||
                      (!pendingCoverFile &&
                        (pendingCoverRemove || !editingArticle.featuredImageUrl))
                    }
                    onClick={handleRemoveCoverImage}
                    className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] text-[#5C4B42] dark:text-[#C5B7A4] hover:border-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-45 disabled:pointer-events-none transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Remove Selected Photo</span>
                  </button>

                  {editingArticle.id && (
                    <button
                      type="button"
                      disabled={
                        savingArticle ||
                        savingCoverOnly ||
                        (!pendingCoverFile && !pendingCoverRemove)
                      }
                      onClick={handleSaveCoverOnly}
                      className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-medium rounded-lg bg-[#2B211C] dark:bg-[#EFE8DC] text-[#FAF6EF] dark:text-[#161310] disabled:opacity-45 disabled:pointer-events-none transition-colors"
                    >
                      <Check className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        {savingCoverOnly ? 'Saving...' : 'Save Cover Photo'}
                      </span>
                    </button>
                  )}
                </div>

                {/* Upload Progress Bar */}
                {coverUploadProgress !== null && (
                  <div className="space-y-1.5 pt-1" role="status" aria-live="polite">
                    <div className="flex items-center justify-between text-[11px] text-[#4F6855] dark:text-[#8AA890] font-medium">
                      <span>Uploading cover photo...</span>
                      <span className="tabular-nums">{coverUploadProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#E5DCCD] dark:bg-[#302821] overflow-hidden">
                      <div
                        className="h-full bg-[#4F6855] transition-all duration-150"
                        style={{ width: `${coverUploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Upload Success / Error Feedback */}
                {coverUploadSuccess && (
                  <p
                    role="status"
                    className="text-xs px-3 py-2 rounded-lg border border-[#C6D6C7] dark:border-[#3B5240] bg-[#EDF4ED] dark:bg-[#1E2A21] text-[#354E3A] dark:text-[#B4D1B8]"
                  >
                    {coverUploadSuccess}
                  </p>
                )}

                {coverUploadError && (
                  <p
                    role="alert"
                    className="text-xs px-3 py-2 rounded-lg border border-red-300 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300"
                  >
                    {coverUploadError}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => setMediaPickerTarget('featured')}
                  className="w-full py-2 px-3 text-xs font-medium rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] hover:border-[#4F6855] transition-colors"
                >
                  Choose from Media Library
                </button>

                <input
                  type="text"
                  value={editingArticle.featuredImageUrl}
                  onChange={(e) => {
                    setCoverUploadError('');
                    setPendingCoverFile(null);
                    setPendingCoverPreviewUrl(null);
                    setPendingCoverRemove(false);
                    setEditingArticle({
                      ...editingArticle,
                      featuredImageUrl: e.target.value,
                    });
                  }}
                  placeholder="/api/media/1/file or image path"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] bg-[#FAF6EF] dark:bg-[#161310]"
                />
                <input
                  type="text"
                  value={editingArticle.featuredImageAlt}
                  onChange={(e) =>
                    setEditingArticle({
                      ...editingArticle,
                      featuredImageAlt: e.target.value,
                    })
                  }
                  placeholder="Descriptive cover image alt text"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] bg-[#FAF6EF] dark:bg-[#161310]"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CATEGORIES MANAGEMENT */}
      {activeTab === 'categories' && (
        <div className="py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <form
            onSubmit={handleSaveCategory}
            className="lg:col-span-4 p-6 rounded-xl border border-[#E5DCCD] dark:border-[#302821] bg-[#FDFBF7] dark:bg-[#1E1915] space-y-4 h-fit"
          >
            <h2 className="font-editorial text-xl font-semibold">
              {catEditId ? 'Edit Category' : 'Add Category'}
            </h2>
            <div>
              <label className="block text-xs font-medium mb-1">
                Marathi Name *
              </label>
              <input
                type="text"
                required
                value={catNameMr}
                onChange={(e) => setCatNameMr(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] bg-[#FAF6EF] dark:bg-[#161310]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                English Name *
              </label>
              <input
                type="text"
                required
                value={catNameEn}
                onChange={(e) => setCatNameEn(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] bg-[#FAF6EF] dark:bg-[#161310]"
              />
            </div>
            {!catEditId && (
              <div>
                <label className="block text-xs font-medium mb-1">
                  Slug (optional)
                </label>
                <input
                  type="text"
                  value={catSlug}
                  onChange={(e) => setCatSlug(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] bg-[#FAF6EF] dark:bg-[#161310]"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium mb-1">
                Marathi Description
              </label>
              <textarea
                rows={2}
                value={catDescMr}
                onChange={(e) => setCatDescMr(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] bg-[#FAF6EF] dark:bg-[#161310]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                English Description
              </label>
              <textarea
                rows={2}
                value={catDescEn}
                onChange={(e) => setCatDescEn(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] bg-[#FAF6EF] dark:bg-[#161310]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Sort Order
              </label>
              <input
                type="number"
                value={catOrder}
                onChange={(e) => setCatOrder(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] bg-[#FAF6EF] dark:bg-[#161310]"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 text-xs font-medium rounded-lg bg-[#4F6855] text-white"
              >
                {catEditId ? 'Update Category' : 'Create Category'}
              </button>
              {catEditId && (
                <button
                  type="button"
                  onClick={() => {
                    setCatEditId(null);
                    setCatNameMr('');
                    setCatNameEn('');
                    setCatDescMr('');
                    setCatDescEn('');
                    setCatOrder(0);
                  }}
                  className="px-3 py-2 text-xs text-[#6E5B50]"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div className="lg:col-span-8 space-y-3">
            {categoriesList.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-xl border border-[#E5DCCD] dark:border-[#302821] bg-[#FDFBF7] dark:bg-[#1E1915] flex items-start justify-between gap-4"
              >
                <div>
                  <p className="font-editorial text-lg font-medium">
                    {c.nameMr} ·{' '}
                    <span className="text-sm text-[#6E5B50] dark:text-[#B8AA98]">
                      {c.nameEn}
                    </span>
                  </p>
                  <p className="text-xs text-[#6E5B50] dark:text-[#B8AA98] mt-1">
                    {c.descriptionMr}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setCatEditId(c.id);
                      setCatNameMr(c.nameMr);
                      setCatNameEn(c.nameEn);
                      setCatDescMr(c.descriptionMr);
                      setCatDescEn(c.descriptionEn);
                      setCatOrder(c.sortOrder);
                    }}
                    className="px-2.5 py-1 text-xs rounded border border-[#D4C7B4] dark:border-[#3A3129]"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(c.id)}
                    className="p-1.5 text-red-700 dark:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: MEDIA LIBRARY */}
      {activeTab === 'media' && (
        <div className="py-8 space-y-8">
          <div className="p-6 rounded-xl border border-[#E5DCCD] dark:border-[#302821] bg-[#FDFBF7] dark:bg-[#1E1915] space-y-4">
            <h2 className="font-editorial text-xl font-semibold">
              Upload New Image (PNG, JPEG, WEBP, GIF — max 5MB)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-medium mb-1">
                  Alt Text (SEO & Accessibility)
                </label>
                <input
                  type="text"
                  value={mediaAlt}
                  onChange={(e) => setMediaAlt(e.target.value)}
                  placeholder="Describe the image..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] bg-[#FAF6EF] dark:bg-[#161310]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Caption (Optional)
                </label>
                <input
                  type="text"
                  value={mediaCaption}
                  onChange={(e) => setMediaCaption(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] bg-[#FAF6EF] dark:bg-[#161310]"
                />
              </div>
              <div>
                <label className="inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#4F6855] hover:bg-[#3F5544] text-white text-xs font-medium cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>{uploadingMedia ? 'Uploading...' : 'Select Image File'}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={handleUploadMedia}
                    disabled={uploadingMedia}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {mediaList.map((m) => (
              <div
                key={m.id}
                className="rounded-xl border border-[#E5DCCD] dark:border-[#302821] bg-[#FDFBF7] dark:bg-[#1E1915] overflow-hidden flex flex-col"
              >
                <div className="aspect-[4/3] bg-[#EFE8DC] dark:bg-[#26201A]">
                  <ResilientImage
                    src={m.url}
                    alt={m.altText || m.originalName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-xs font-medium truncate">{m.originalName}</p>
                    <p className="text-[11px] text-[#8A776A] mt-0.5">
                      {Math.round(m.sizeBytes / 1024)} KB · {m.url}
                    </p>
                  </div>

                  <input
                    type="text"
                    defaultValue={m.altText}
                    onBlur={(e) => {
                      if (e.target.value !== m.altText) {
                        handleUpdateMediaAlt(m.id, e.target.value);
                      }
                    }}
                    placeholder="Edit alt text..."
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-[#D4C7B4] dark:border-[#3A3129] bg-[#FAF6EF] dark:bg-[#161310]"
                  />

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <label className="text-xs text-[#4F6855] dark:text-[#8AA890] cursor-pointer hover:underline">
                      Replace
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        onChange={(e) => handleReplaceMediaFile(m.id, e)}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(m.url);
                        notify('Image URL copied.');
                      }}
                      className="text-xs text-[#5C4B42] dark:text-[#C5B7A4] hover:underline"
                    >
                      Copy URL
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteMedia(m.id)}
                      className="text-xs text-red-700 dark:text-red-400 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: MESSAGES & READER REFLECTIONS */}
      {activeTab === 'messages' && (
        <div className="py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-4">
            <h2 className="font-editorial text-2xl font-semibold">
              Contact Messages ({messagesList.length})
            </h2>
            {messagesList.length === 0 ? (
              <p className="text-sm text-[#6E5B50]">No messages yet.</p>
            ) : (
              messagesList.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-5 rounded-xl border ${
                    msg.isRead
                      ? 'border-[#E5DCCD] dark:border-[#302821] bg-[#FDFBF7] dark:bg-[#1E1915]'
                      : 'border-[#4F6855] bg-[#F3ECE1]/70 dark:bg-[#221C17]'
                  } space-y-2`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-sm">
                        {msg.subject}{' '}
                        {msg.isSpam && (
                          <span className="text-xs text-red-600">(Spam)</span>
                        )}
                      </p>
                      <p className="text-xs text-[#6E5B50] dark:text-[#B8AA98]">
                        {msg.name} · {msg.email} ·{' '}
                        {formatPublishedDate(msg.createdAt, language)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          handleToggleMessage(msg.id, { isRead: !msg.isRead })
                        }
                        className="px-2.5 py-1 text-xs rounded border border-[#D4C7B4] dark:border-[#3A3129]"
                      >
                        {msg.isRead ? 'Mark Unread' : 'Mark Read'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="p-1 text-red-700 dark:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-[#3D2F28] dark:text-[#DFD4C3] whitespace-pre-line pt-1">
                    {msg.message}
                  </p>
                </div>
              ))
            )}
          </div>

          <div className="lg:col-span-5 space-y-4">
            <h2 className="font-editorial text-2xl font-semibold flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              <span>Reader Reflections ({commentsList.length})</span>
            </h2>
            {commentsList.length === 0 ? (
              <p className="text-sm text-[#6E5B50]">No reflections submitted yet.</p>
            ) : (
              commentsList.map((cm) => (
                <div
                  key={cm.id}
                  className="p-4 rounded-xl border border-[#E5DCCD] dark:border-[#302821] bg-[#FDFBF7] dark:bg-[#1E1915] space-y-2"
                >
                  <div className="flex items-center justify-between text-xs text-[#6E5B50] dark:text-[#B8AA98]">
                    <span className="font-medium text-[#2B211C] dark:text-[#FAF6EF]">
                      {cm.authorName}
                    </span>
                    <span className="capitalize">{cm.status}</span>
                  </div>
                  <p className="text-xs text-[#8A776A]">
                    On: {cm.articleTitleMr || 'Article'}
                  </p>
                  <p className="text-sm">{cm.content}</p>
                  <div className="flex items-center gap-2 pt-1">
                    {cm.status !== 'approved' && (
                      <button
                        type="button"
                        onClick={() => handleModerateComment(cm.id, 'approved')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-[#4F6855] text-white"
                      >
                        <Check className="w-3 h-3" /> Approve
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteComment(cm.id)}
                      className="px-2.5 py-1 text-xs rounded text-red-700 dark:text-red-400 border border-[#D4C7B4] dark:border-[#3A3129]"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 6: SITE SETTINGS */}
      {activeTab === 'settings' && (
        <form
          onSubmit={handleSaveSettings}
          className="py-8 max-w-2xl space-y-6"
        >
          <h2 className="font-editorial text-2xl font-semibold">
            Site & Social Settings
          </h2>

          <div className="p-6 rounded-xl border border-[#E5DCCD] dark:border-[#302821] bg-[#FDFBF7] dark:bg-[#1E1915] space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1">
                Instagram Profile URL
              </label>
              <input
                type="url"
                value={settingsForm.instagram_url || ''}
                onChange={(e) =>
                  setSettingsForm({
                    ...settingsForm,
                    instagram_url: e.target.value,
                  })
                }
                placeholder="https://instagram.com/..."
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] bg-[#FAF6EF] dark:bg-[#161310]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">
                LinkedIn Profile URL
              </label>
              <input
                type="url"
                value={settingsForm.linkedin_url || ''}
                onChange={(e) =>
                  setSettingsForm({
                    ...settingsForm,
                    linkedin_url: e.target.value,
                  })
                }
                placeholder="https://linkedin.com/in/..."
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] bg-[#FAF6EF] dark:bg-[#161310]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">
                Public Contact Email (Optional)
              </label>
              <input
                type="email"
                value={settingsForm.contact_email || ''}
                onChange={(e) =>
                  setSettingsForm({
                    ...settingsForm,
                    contact_email: e.target.value,
                  })
                }
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] bg-[#FAF6EF] dark:bg-[#161310]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">
                “मनाच्या डायरीतुन” Homepage Note (Marathi)
              </label>
              <textarea
                rows={3}
                value={settingsForm.journal_note_mr || ''}
                onChange={(e) =>
                  setSettingsForm({
                    ...settingsForm,
                    journal_note_mr: e.target.value,
                  })
                }
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] bg-[#FAF6EF] dark:bg-[#161310]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">
                “From the Heart's Diary” Homepage Note (English)
              </label>
              <textarea
                rows={3}
                value={settingsForm.journal_note_en || ''}
                onChange={(e) =>
                  setSettingsForm({
                    ...settingsForm,
                    journal_note_en: e.target.value,
                  })
                }
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-[#D4C7B4] dark:border-[#3A3129] bg-[#FAF6EF] dark:bg-[#161310]"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 text-xs font-medium rounded-lg bg-[#4F6855] hover:bg-[#3F5544] text-white"
            >
              Save Settings
            </button>
          </div>
        </form>
      )}

      {/* MEDIA PICKER MODAL */}
      {mediaPickerTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="max-w-3xl w-full max-h-[85vh] flex flex-col rounded-2xl bg-[#FAF6EF] dark:bg-[#1B1713] border border-[#D4C7B4] dark:border-[#3A3129] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E5DCCD] dark:border-[#2C251F] flex items-center justify-between">
              <h3 className="font-editorial text-xl font-semibold">
                Select Image from Media Library
              </h3>
              <button
                type="button"
                onClick={() => setMediaPickerTarget(null)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
              {mediaList.length === 0 ? (
                <p className="text-sm text-[#6E5B50]">
                  No uploaded images yet. Upload images in the Media Library tab first, or use a built-in journal image below.
                </p>
              ) : null}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  ...mediaList.map((m) => ({
                    url: m.url,
                    alt: m.altText || m.originalName,
                  })),
                  {
                    url: EDITORIAL_IMAGES.heroJournal,
                    alt: 'Morning journal and chai',
                  },
                  {
                    url: EDITORIAL_IMAGES.diaryFlowers,
                    alt: 'Mogra jasmine blossoms and diary',
                  },
                  {
                    url: EDITORIAL_IMAGES.naturePath,
                    alt: 'Peaceful misty path in hills',
                  },
                ].map((item) => (
                  <button
                    key={item.url}
                    type="button"
                    onClick={() => {
                      if (mediaPickerTarget === 'featured' && editingArticle) {
                        setPendingCoverFile(null);
                        setPendingCoverPreviewUrl(null);
                        setPendingCoverRemove(false);
                        setCoverUploadError('');
                        setCoverUploadSuccess(
                          'Cover photo selected from Media Library. Save or publish to apply.'
                        );
                        setEditingArticle({
                          ...editingArticle,
                          featuredImageUrl: item.url,
                          featuredImageAlt:
                            editingArticle.featuredImageAlt || item.alt,
                        });
                      } else if (mediaPickerTarget === 'contentMr') {
                        setInsertMrImageUrl(item.url);
                      } else if (mediaPickerTarget === 'contentEn') {
                        setInsertEnImageUrl(item.url);
                      }
                      setMediaPickerTarget(null);
                    }}
                    className="group text-left rounded-xl overflow-hidden border border-[#E5DCCD] dark:border-[#302821] hover:border-[#4F6855]"
                  >
                    <div className="aspect-[4/3] bg-[#EFE8DC]/75 dark:bg-[#221C17] flex items-center justify-center overflow-hidden">
                      <ResilientImage
                        src={item.url}
                        alt={item.alt}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <p className="p-2 text-[11px] truncate text-[#5C4B42] dark:text-[#C5B7A4]">
                      {item.alt}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW MODAL BEFORE PUBLISHING */}
      {previewOpen && editingArticle && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="max-w-3xl w-full max-h-[90vh] flex flex-col rounded-2xl bg-[#FAF6EF] dark:bg-[#161310] border border-[#D4C7B4] dark:border-[#3A3129] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E5DCCD] dark:border-[#2C251F] flex items-center justify-between">
              <span className="text-xs font-medium text-[#4F6855]">
                Reader Preview ({editorLangTab === 'en' ? 'English' : 'मराठी'})
              </span>
              <button type="button" onClick={() => setPreviewOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-8 overflow-y-auto space-y-6">
              <h1 className="font-editorial text-3xl sm:text-4xl font-semibold">
                {editorLangTab === 'en' && editingArticle.enEnabled
                  ? editingArticle.enTitle || editingArticle.titleMr
                  : editingArticle.titleMr}
              </h1>
              {(pendingCoverPreviewUrl ||
                (!pendingCoverRemove && editingArticle.featuredImageUrl)) && (
                <div className="rounded-xl overflow-hidden border border-[#E5DCCD] dark:border-[#302821] bg-[#F3ECE1]/60 dark:bg-[#1E1915] flex items-center justify-center">
                  <ResilientImage
                    src={
                      pendingCoverPreviewUrl || editingArticle.featuredImageUrl
                    }
                    alt={editingArticle.featuredImageAlt || 'Preview'}
                    className="w-full h-auto max-h-[70vh] object-contain"
                  />
                </div>
              )}
              <div
                className="journal-prose"
                dangerouslySetInnerHTML={{
                  __html:
                    editorLangTab === 'en' && editingArticle.enEnabled
                      ? editingArticle.enContent || editingArticle.contentMr
                      : editingArticle.contentMr,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
