import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useVault } from '../context/VaultContext';
import { Search, Plus, FileText, Trash2, ShieldCheck, Clock, Check, Bold, Italic, Heading1, Heading2, List, ListOrdered, Quote, Code } from 'lucide-react';
import { motion } from 'framer-motion';
import { EmptyState } from './EmptyState';
import type { Note } from '../lib/vault';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';

// ---- NotesList (Middle Pane) ----

interface NotesListProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreateNew: () => void;
}

export const NotesList: React.FC<NotesListProps> = ({ selectedId, onSelect, onCreateNew }) => {
  const { vaultData } = useVault();
  const [searchQuery, setSearchQuery] = useState('');
  
  const notes: Note[] = vaultData?.notes || [];
  
  const filteredNotes = useMemo(() => {
    const sorted = [...notes].sort((a, b) => b.updatedAt - a.updatedAt);
    if (!searchQuery.trim()) return sorted;
    const query = searchQuery.toLowerCase();
    return sorted.filter(n => n.title.toLowerCase().includes(query) || n.content.toLowerCase().includes(query));
  }, [notes, searchQuery]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#121214]">
      <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200 dark:border-white/10 shrink-0">
        <h2 className="font-semibold text-gray-900 dark:text-zinc-100">Secure Notes</h2>
        <motion.button 
          onClick={onCreateNew}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-8 h-8 flex items-center justify-center bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/10 hover:border-accent hover:text-accent rounded-md text-gray-600 dark:text-zinc-400 transition-colors shadow-sm"
          title="New Note"
        >
          <Plus size={16} />
        </motion.button>
      </div>
      
      <div className="p-4 border-b border-gray-200 dark:border-white/10 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search notes..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-white/10 rounded-md text-sm text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent focus:bg-white dark:bg-[#121214] transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredNotes.length === 0 ? (
          <p className="text-gray-400 text-xs text-center mt-6">No notes found.</p>
        ) : (
          filteredNotes.map(note => (
            <button
              key={note.id}
              onClick={() => onSelect(note.id)}
              className={`w-full text-left p-3 rounded-md border flex items-start gap-3 transition-colors ${
                selectedId === note.id 
                  ? 'bg-accent/5 border-accent shadow-sm' 
                  : 'bg-white dark:bg-[#121214] border-transparent hover:border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-zinc-900 dark:bg-zinc-900/50'
              }`}
            >
              <div className={`mt-0.5 shrink-0 ${selectedId === note.id ? 'text-accent' : 'text-gray-400'}`}>
                <FileText size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`font-medium text-sm truncate ${selectedId === note.id ? 'text-accent' : 'text-gray-900 dark:text-zinc-100'}`}>
                  {note.title || 'Untitled Note'}
                </p>
                <p className="text-xs text-gray-500 dark:text-zinc-500 truncate mt-1">
                  {note.content.replace(/<[^>]*>?/gm, '').substring(0, 40) || 'No additional text...'}
                </p>
                <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                  <Clock size={10} />
                  {new Date(note.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};


// ---- NotesEditor (Main Workspace) ----

interface NotesEditorProps {
  selectedId: string | null;
  isCreating: boolean;
  onSaveComplete: (id: string) => void;
  onDeleteComplete: () => void;
}

export const NotesEditor: React.FC<NotesEditorProps> = ({ selectedId, isCreating, onSaveComplete, onDeleteComplete }) => {
  const { vaultData, updateVaultData } = useVault();
  const notes: Note[] = vaultData?.notes || [];
  
  const selectedNote = notes.find(n => n.id === selectedId);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  
  const [isDirty, setIsDirty] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start writing securely...',
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML());
      setIsDirty(true);
    },
  });

  useEffect(() => {
    if (isCreating) {
      setTitle('');
      setContent('');
      setUpdatedAt(null);
      setIsDirty(false);
      if (editor) editor.commands.setContent('');
    } else if (selectedNote) {
      setTitle(selectedNote.title);
      setContent(selectedNote.content);
      setUpdatedAt(selectedNote.updatedAt);
      setIsDirty(false);
      if (editor) editor.commands.setContent(selectedNote.content);
    }
  }, [selectedId, isCreating, selectedNote, editor]);

  const handleSave = async (currentTitle: string, currentContent: string) => {
    if (!currentTitle.trim() && !currentContent.trim()) return;

    const now = Date.now();
    if (isCreating) {
      const newId = crypto.randomUUID();
      const newNote: Note = { id: newId, title: currentTitle.trim(), content: currentContent, updatedAt: now };
      await updateVaultData({ notes: [...notes, newNote] });
      onSaveComplete(newId);
      setUpdatedAt(now);
    } else if (selectedId) {
      const updatedNotes = notes.map(n => 
        n.id === selectedId ? { ...n, title: currentTitle.trim(), content: currentContent, updatedAt: now } : n
      );
      await updateVaultData({ notes: updatedNotes });
      setUpdatedAt(now);
    }
    setIsDirty(false);
  };

  useEffect(() => {
    if (!isDirty) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      handleSave(title, content);
    }, 1000);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [title, content, isDirty]);

  const handleDelete = async () => {
    if (!selectedId) return;
    if (confirm('Are you sure you want to delete this note?')) {
      const updated = notes.filter(n => n.id !== selectedId);
      await updateVaultData({ notes: updated });
      onDeleteComplete();
    }
  };

  if (!isCreating && !selectedNote) {
    return (
      <EmptyState 
        icon={ShieldCheck}
        title="Secure Notes"
        subtitle="Your notes are encrypted in memory. Select a note from the sidebar or create a new one."
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#121214] relative">
      {/* Top Header / Actions */}
      <div className="absolute top-4 right-8 flex items-center gap-4 z-10">
        <span className="text-xs text-gray-400 flex items-center gap-1.5">
          {isDirty ? (
            <>
              <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
              Unsaved changes
            </>
          ) : (
            <>
              <Check className="w-3 h-3" />
              Saved
            </>
          )}
        </span>
        
        {!isCreating && (
          <motion.button 
            onClick={handleDelete}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
            title="Delete Note"
          >
            <Trash2 className="w-4 h-4" />
          </motion.button>
        )}
      </div>

      <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto p-10 pt-16">
        <input
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setIsDirty(true);
          }}
          placeholder="Note Title"
          className="w-full text-4xl font-bold text-gray-900 dark:text-zinc-100 bg-transparent border-none focus:outline-none focus:ring-0 placeholder-gray-300 mb-2"
        />
        {updatedAt && !isCreating && (
          <p className="text-xs text-gray-400 mb-4 flex items-center gap-1">
            <Clock size={12} />
            Last edited {new Date(updatedAt).toLocaleString()}
          </p>
        )}

        {/* Formatting Toolbar */}
        {editor && (
          <div className="flex flex-wrap items-center gap-1 mb-4 p-1.5 bg-gray-50 dark:bg-zinc-900/50 border border-gray-200 dark:border-white/10 rounded-lg shrink-0">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-1.5 rounded transition-colors ${editor.isActive('bold') ? 'bg-white dark:bg-[#121214] text-accent shadow-sm' : 'text-gray-500 dark:text-zinc-500 hover:bg-gray-200 dark:hover:bg-zinc-700 dark:bg-zinc-800 hover:text-gray-900 dark:text-zinc-100'}`}
              title="Bold"
            >
              <Bold size={16} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-1.5 rounded transition-colors ${editor.isActive('italic') ? 'bg-white dark:bg-[#121214] text-accent shadow-sm' : 'text-gray-500 dark:text-zinc-500 hover:bg-gray-200 dark:hover:bg-zinc-700 dark:bg-zinc-800 hover:text-gray-900 dark:text-zinc-100'}`}
              title="Italic"
            >
              <Italic size={16} />
            </button>
            <div className="w-px h-4 bg-gray-300 mx-1" />
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={`p-1.5 rounded transition-colors ${editor.isActive('heading', { level: 1 }) ? 'bg-white dark:bg-[#121214] text-accent shadow-sm' : 'text-gray-500 dark:text-zinc-500 hover:bg-gray-200 dark:hover:bg-zinc-700 dark:bg-zinc-800 hover:text-gray-900 dark:text-zinc-100'}`}
              title="Heading 1"
            >
              <Heading1 size={16} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`p-1.5 rounded transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-white dark:bg-[#121214] text-accent shadow-sm' : 'text-gray-500 dark:text-zinc-500 hover:bg-gray-200 dark:hover:bg-zinc-700 dark:bg-zinc-800 hover:text-gray-900 dark:text-zinc-100'}`}
              title="Heading 2"
            >
              <Heading2 size={16} />
            </button>
            <div className="w-px h-4 bg-gray-300 mx-1" />
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`p-1.5 rounded transition-colors ${editor.isActive('bulletList') ? 'bg-white dark:bg-[#121214] text-accent shadow-sm' : 'text-gray-500 dark:text-zinc-500 hover:bg-gray-200 dark:hover:bg-zinc-700 dark:bg-zinc-800 hover:text-gray-900 dark:text-zinc-100'}`}
              title="Bullet List"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`p-1.5 rounded transition-colors ${editor.isActive('orderedList') ? 'bg-white dark:bg-[#121214] text-accent shadow-sm' : 'text-gray-500 dark:text-zinc-500 hover:bg-gray-200 dark:hover:bg-zinc-700 dark:bg-zinc-800 hover:text-gray-900 dark:text-zinc-100'}`}
              title="Ordered List"
            >
              <ListOrdered size={16} />
            </button>
            <div className="w-px h-4 bg-gray-300 mx-1" />
            <button
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={`p-1.5 rounded transition-colors ${editor.isActive('blockquote') ? 'bg-white dark:bg-[#121214] text-accent shadow-sm' : 'text-gray-500 dark:text-zinc-500 hover:bg-gray-200 dark:hover:bg-zinc-700 dark:bg-zinc-800 hover:text-gray-900 dark:text-zinc-100'}`}
              title="Blockquote"
            >
              <Quote size={16} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              className={`p-1.5 rounded transition-colors ${editor.isActive('codeBlock') ? 'bg-white dark:bg-[#121214] text-accent shadow-sm' : 'text-gray-500 dark:text-zinc-500 hover:bg-gray-200 dark:hover:bg-zinc-700 dark:bg-zinc-800 hover:text-gray-900 dark:text-zinc-100'}`}
              title="Code Block"
            >
              <Code size={16} />
            </button>
          </div>
        )}
        
        <div className="flex-1 overflow-y-auto">
          <EditorContent editor={editor} className="w-full h-full" />
        </div>
      </div>
    </div>
  );
};
