import React, { useEffect, useRef, useState } from 'react';
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Smile,
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  onPickMedia?: () => void;
  insertImageUrl?: string | null;
  onImageInserted?: () => void;
}

const JOURNAL_EMOJIS = [
  '🕉️',
  '✨',
  '🙏',
  '🌿',
  '🌸',
  '☕',
  '📖',
  '✍️',
  '🤍',
  '🌅',
  '🕯️',
  '💫',
  '🌧️',
  '🌼',
];

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'तुमचे मनोगत येथे लिहा...',
  onPickMedia,
  insertImageUrl,
  onImageInserted,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [sourceMode, setSourceMode] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [linkPromptOpen, setLinkPromptOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const lastExternalValue = useRef<string>(value);

  useEffect(() => {
    if (
      editorRef.current &&
      !sourceMode &&
      value !== lastExternalValue.current &&
      editorRef.current.innerHTML !== value
    ) {
      editorRef.current.innerHTML = value || '';
    }
    lastExternalValue.current = value;
  }, [value, sourceMode]);

  useEffect(() => {
    if (editorRef.current && !sourceMode && editorRef.current.innerHTML === '' && value) {
      editorRef.current.innerHTML = value;
    }
  }, [sourceMode, value]);

  const emitChange = () => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    lastExternalValue.current = html;
    onChange(html);
  };

  const exec = (command: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, val);
    emitChange();
  };

  useEffect(() => {
    if (insertImageUrl && !sourceMode) {
      editorRef.current?.focus();
      document.execCommand('insertImage', false, insertImageUrl);
      emitChange();
      onImageInserted?.();
    }
  }, [insertImageUrl]);

  const handleInsertLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl.trim()) return;
    const safeUrl = linkUrl.trim().startsWith('http')
      ? linkUrl.trim()
      : `https://${linkUrl.trim()}`;
    exec('createLink', safeUrl);
    setLinkUrl('');
    setLinkPromptOpen(false);
  };

  const insertEmoji = (emoji: string) => {
    if (sourceMode) {
      onChange((value || '') + emoji);
    } else {
      exec('insertText', emoji);
    }
    setShowEmojis(false);
  };

  return (
    <div className="border border-[#D9CEBE] dark:border-[#3A3129] rounded-xl bg-[#FDFBF7] dark:bg-[#1D1814] overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 px-3 py-2 border-b border-[#E7DEC9] dark:border-[#332B24] bg-[#F5EFE4] dark:bg-[#241E19]">
        <button
          type="button"
          onClick={() => exec('formatBlock', '<h2>')}
          className="p-2 rounded-lg text-[#4A3B32] dark:text-[#D9CEBE] hover:bg-[#E7DEC9] dark:hover:bg-[#342C24] transition-colors"
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => exec('formatBlock', '<h3>')}
          className="p-2 rounded-lg text-[#4A3B32] dark:text-[#D9CEBE] hover:bg-[#E7DEC9] dark:hover:bg-[#342C24] transition-colors"
          title="Heading 3"
        >
          <Heading3 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => exec('formatBlock', '<p>')}
          className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#4A3B32] dark:text-[#D9CEBE] hover:bg-[#E7DEC9] dark:hover:bg-[#342C24] transition-colors"
          title="Paragraph"
        >
          P
        </button>

        <span className="h-5 w-px bg-[#D9CEBE] dark:bg-[#3A3129] mx-1" />

        <button
          type="button"
          onClick={() => exec('bold')}
          className="p-2 rounded-lg text-[#4A3B32] dark:text-[#D9CEBE] hover:bg-[#E7DEC9] dark:hover:bg-[#342C24] transition-colors"
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => exec('italic')}
          className="p-2 rounded-lg text-[#4A3B32] dark:text-[#D9CEBE] hover:bg-[#E7DEC9] dark:hover:bg-[#342C24] transition-colors"
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => exec('formatBlock', '<blockquote>')}
          className="p-2 rounded-lg text-[#4A3B32] dark:text-[#D9CEBE] hover:bg-[#E7DEC9] dark:hover:bg-[#342C24] transition-colors"
          title="Quote"
        >
          <Quote className="w-4 h-4" />
        </button>

        <span className="h-5 w-px bg-[#D9CEBE] dark:bg-[#3A3129] mx-1" />

        <button
          type="button"
          onClick={() => exec('insertUnorderedList')}
          className="p-2 rounded-lg text-[#4A3B32] dark:text-[#D9CEBE] hover:bg-[#E7DEC9] dark:hover:bg-[#342C24] transition-colors"
          title="Bulleted List"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => exec('insertOrderedList')}
          className="p-2 rounded-lg text-[#4A3B32] dark:text-[#D9CEBE] hover:bg-[#E7DEC9] dark:hover:bg-[#342C24] transition-colors"
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        <span className="h-5 w-px bg-[#D9CEBE] dark:bg-[#3A3129] mx-1" />

        <button
          type="button"
          onClick={() => setLinkPromptOpen((prev) => !prev)}
          className="p-2 rounded-lg text-[#4A3B32] dark:text-[#D9CEBE] hover:bg-[#E7DEC9] dark:hover:bg-[#342C24] transition-colors"
          title="Insert Link"
        >
          <LinkIcon className="w-4 h-4" />
        </button>

        {onPickMedia && (
          <button
            type="button"
            onClick={onPickMedia}
            className="p-2 rounded-lg text-[#4A3B32] dark:text-[#D9CEBE] hover:bg-[#E7DEC9] dark:hover:bg-[#342C24] transition-colors"
            title="Insert Image from Media Library"
          >
            <ImageIcon className="w-4 h-4" />
          </button>
        )}

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowEmojis((prev) => !prev)}
            className="p-2 rounded-lg text-[#4A3B32] dark:text-[#D9CEBE] hover:bg-[#E7DEC9] dark:hover:bg-[#342C24] transition-colors"
            title="Insert Emoji"
          >
            <Smile className="w-4 h-4" />
          </button>
          {showEmojis && (
            <div className="absolute left-0 top-full mt-1 z-30 p-2 bg-[#FAF6EF] dark:bg-[#241E19] border border-[#D9CEBE] dark:border-[#3A3129] rounded-xl shadow-lg grid grid-cols-7 gap-1 w-60">
              {JOURNAL_EMOJIS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => insertEmoji(em)}
                  className="p-1.5 text-lg rounded hover:bg-[#E7DEC9] dark:hover:bg-[#342C24]"
                >
                  {em}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setSourceMode((prev) => !prev)}
          className={`ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            sourceMode
              ? 'bg-[#4F6855] text-white'
              : 'text-[#6E5B50] dark:text-[#B8AA98] hover:bg-[#E7DEC9] dark:hover:bg-[#342C24]'
          }`}
          title="Toggle HTML Source"
        >
          <Code className="w-3.5 h-3.5" />
          <span>{sourceMode ? 'Visual' : 'HTML'}</span>
        </button>
      </div>

      {linkPromptOpen && (
        <form
          onSubmit={handleInsertLink}
          className="flex items-center gap-2 px-3 py-2 bg-[#FAF6EF] dark:bg-[#191511] border-b border-[#E7DEC9] dark:border-[#332B24]"
        >
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://example.com"
            className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-[#D9CEBE] dark:border-[#3A3129] bg-white dark:bg-[#241E19] focus:outline-none focus:ring-2 focus:ring-[#4F6855]"
          />
          <button
            type="submit"
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#4F6855] text-white hover:bg-[#3F5544]"
          >
            Add Link
          </button>
          <button
            type="button"
            onClick={() => setLinkPromptOpen(false)}
            className="px-2 py-1.5 text-xs text-[#6E5B50] dark:text-[#B8AA98]"
          >
            Cancel
          </button>
        </form>
      )}

      {/* Writing Canvas */}
      {sourceMode ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={14}
          className="w-full p-5 font-mono text-sm bg-transparent text-[#2B211C] dark:text-[#EFE8DC] focus:outline-none resize-y"
          placeholder="<p>...</p>"
        />
      ) : (
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={emitChange}
          data-placeholder={placeholder}
          className="journal-prose min-h-[320px] max-h-[620px] overflow-y-auto p-6 focus:outline-none text-[#2B211C] dark:text-[#EFE8DC] empty:before:content-[attr(data-placeholder)] empty:before:text-[#9C8B7E]"
        />
      )}
    </div>
  );
};
