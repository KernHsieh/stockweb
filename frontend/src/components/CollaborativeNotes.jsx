import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  FileText,
  Plus,
  Trash2,
  Edit3,
  Tag,
  User,
  Clock,
  Check,
  X,
  Share2,
  Sparkles
} from 'lucide-react';

const SUGGESTED_TAGS = ['波段多頭', '突破季線', '投信認養', '基本面爆發', '主力洗盤', '避險防禦', '停損觀察'];

export default function CollaborativeNotes({ symbol, market }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [authorName, setAuthorName] = useState(() => localStorage.getItem('stockweb_author') || '研究員A');
  
  // New note form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);

  useEffect(() => {
    fetchNotes();
  }, [symbol]);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stocks/${encodeURIComponent(symbol)}/notes`);
      if (res.ok) {
        const data = await res.json();
        setNotes(data);
      }
    } catch (e) {
      console.warn('Failed to fetch notes:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthorChange = (name) => {
    setAuthorName(name);
    localStorage.setItem('stockweb_author', name);
  };

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const addCustomTag = () => {
    if (customTagInput.trim() && !selectedTags.includes(customTagInput.trim())) {
      setSelectedTags([...selectedTags, customTagInput.trim()]);
      setCustomTagInput('');
    }
  };

  const handleSaveNote = async () => {
    if (!title.trim() || !content.trim()) return;

    try {
      if (editingNoteId) {
        // Update
        const res = await fetch(`/api/notes/${editingNoteId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            content,
            tags: selectedTags
          })
        });
        if (res.ok) {
          setEditingNoteId(null);
          setIsCreating(false);
          resetForm();
          fetchNotes();
        }
      } else {
        // Create
        const res = await fetch(`/api/stocks/${encodeURIComponent(symbol)}/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            author: authorName || 'Anonymous',
            title,
            content,
            tags: selectedTags,
            market
          })
        });
        if (res.ok) {
          setIsCreating(false);
          resetForm();
          fetchNotes();
        }
      }
    } catch (e) {
      console.error('Failed to save note:', e);
    }
  };

  const handleDeleteNote = async (id) => {
    if (!window.confirm('確定要刪除這則協同筆記嗎？')) return;
    try {
      const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setNotes(notes.filter((n) => n.id !== id));
      }
    } catch (e) {
      console.error('Failed to delete note:', e);
    }
  };

  const startEdit = (note) => {
    setEditingNoteId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setSelectedTags(note.tags || []);
    setIsCreating(true);
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setSelectedTags([]);
    setEditingNoteId(null);
  };

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Header Bar */}
      <div className="glass-card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <User className="w-3.5 h-3.5 text-blue-500" />
            <span>你的暱稱：</span>
            <input
              type="text"
              value={authorName}
              onChange={(e) => handleAuthorChange(e.target.value)}
              className="glass-input text-xs py-1 px-2.5 w-32 bg-slate-50 border-slate-200 text-slate-800"
              placeholder="編輯者名稱"
            />
          </div>
          <span className="text-xs text-slate-500">• 多人連線修改將即時標註作者與時間</span>
        </div>

        {!isCreating && (
          <button
            onClick={() => {
              resetForm();
              setIsCreating(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>新增研究筆記 / 觀點</span>
          </button>
        )}
      </div>

      {/* Editor Box */}
      {isCreating && (
        <div className="glass-card p-5 border-blue-200 shadow-md flex flex-col gap-3 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h3 className="font-semibold text-sm text-blue-600 flex items-center gap-1.5">
              <Edit3 className="w-4 h-4" />
              <span>{editingNoteId ? '編輯研究筆記' : `為 ${symbol} 新增協同筆記`}</span>
            </h3>
            <button
              onClick={() => {
                setIsCreating(false);
                resetForm();
              }}
              className="p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="請輸入筆記標題（例：2026 Q3 季報前瞻、關鍵支撐價位）..."
            className="glass-input text-sm font-semibold py-2 px-3 w-full bg-slate-50 border-slate-200 focus:bg-white text-slate-800"
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-500">推薦標籤 / 自訂標籤：</label>
            <div className="flex flex-wrap items-center gap-1.5">
              {SUGGESTED_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                    selectedTags.includes(tag)
                      ? 'bg-blue-100 text-blue-700 font-bold border-blue-300'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  #{tag}
                </button>
              ))}

              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTag())}
                  placeholder="自訂標籤..."
                  className="glass-input text-xs py-0.5 px-2 w-24 bg-slate-50 border-slate-200 text-slate-800"
                />
                <button
                  type="button"
                  onClick={addCustomTag}
                  className="text-xs px-2 py-1 rounded bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500 flex justify-between">
              <span>詳細分析內容 (支援 Markdown 格式)：</span>
              <span className="text-slate-400">支援列表、粗體、價位區間等</span>
            </label>
            <textarea
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="輸入個人看法、進出場策略、基本面亮點或主力動態..."
              className="glass-input text-xs leading-relaxed p-3 w-full font-mono resize-y min-h-[120px] bg-slate-50 border-slate-200 focus:bg-white text-slate-800"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                resetForm();
              }}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-600 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-50"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSaveNote}
              disabled={!title.trim() || !content.trim()}
              className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              確認發布 / 儲存
            </button>
          </div>
        </div>
      )}

      {/* Notes List */}
      {loading ? (
        <div className="glass-card p-8 flex justify-center text-slate-500 text-xs">
          載入筆記中...
        </div>
      ) : notes.length === 0 ? (
        <div className="glass-card p-10 flex flex-col items-center justify-center text-slate-500 gap-2 border-dashed border-slate-300 bg-slate-50">
          <FileText className="w-8 h-8 text-slate-400" />
          <p className="text-xs text-slate-500">目前尚無 {symbol} 的研究筆記。</p>
          <p className="text-[11px] text-slate-400">點擊上方「新增研究筆記」，寫下你的觀點或與朋友協同分析！</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {notes.map((note) => (
            <div key={note.id} className="glass-card p-4 flex flex-col justify-between gap-3 group relative bg-white">
              <div>
                {/* Note Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-bold text-sm text-slate-800 group-hover:text-blue-600 transition-colors">
                    {note.title}
                  </h4>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(note)}
                      className="p-1 text-slate-400 hover:text-blue-600"
                      title="編輯筆記"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-1 text-slate-400 hover:text-rose-500"
                      title="刪除筆記"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Tags */}
                {note.tags && note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {note.tags.map((t, idx) => (
                      <span key={idx} className="badge-tag">
                         #{t}
                      </span>
                    ))}
                  </div>
                )}

                {/* Markdown Content */}
                <div className="text-xs text-slate-600 leading-relaxed max-h-48 overflow-y-auto pr-1 prose prose-sm">
                  <ReactMarkdown>{note.content}</ReactMarkdown>
                </div>
              </div>

              {/* Note Footer Info */}
              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-400" />
                  <span className="text-slate-600 font-medium">{note.author}</span>
                </div>
                <div className="flex items-center gap-1 font-mono">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{new Date(note.updated_at || note.created_at).toLocaleString('zh-TW', { hour12: false })}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
