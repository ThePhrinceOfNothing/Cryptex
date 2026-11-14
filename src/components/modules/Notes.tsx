import React, { useState, useEffect, useRef } from 'react';
import { useVault } from '../../context/VaultContext';
import { Search, Plus, FileText, Folder, FolderOpen, Trash2, ChevronRight, ChevronDown, Download } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Mention from '@tiptap/extension-mention';
import { common, createLowlight } from 'lowlight';
import html2pdf from 'html2pdf.js';

import { EmptyState } from '../ui/EmptyState';
import { ConfirmModal } from '../modals/ConfirmModal';
import { SlashCommands, slashSuggestion } from '../editor/SlashCommand';
import { getNoteMentionSuggestion } from '../editor/NoteLink';

import 'highlight.js/styles/github-dark.css';

import { PromptModal } from '../modals/PromptModal';

const lowlight = createLowlight(common);

// ---- NotesList (Middle Pane - Folders & Notes) ----
export const NotesList: React.FC<{ selectedId: string | null; onSelect: (id: string) => void }> = ({ selectedId, onSelect }) => {
  const { vaultData, updateVaultData } = useVault();
  const [searchQuery, setSearchQuery] = useState('');
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  
  const folders = vaultData?.noteFolders || [];
  const notes = vaultData?.notes || [];

  const handleCreateNote = async (folderId?: string) => {
    const newId = crypto.randomUUID();
    const newNote = { id: newId, title: 'Untitled Note', content: '', updatedAt: Date.now(), folderId };
    await updateVaultData({ notes: [...notes, newNote] });
    onSelect(newId);
  };

  const handleCreateFolder = async (name: string) => {
    const newFolder = { id: crypto.randomUUID(), name, isExpanded: true };
    await updateVaultData({ noteFolders: [...folders, newFolder] });
  };

  const toggleFolder = async (id: string) => {
    const updated = folders.map(f => f.id === id ? { ...f, isExpanded: !f.isExpanded } : f);
    await updateVaultData({ noteFolders: updated });
  };

  const renderItems = (parentId?: string, depth = 0) => {
    const currentFolders = folders.filter(f => f.parentId === parentId);
    const currentNotes = notes.filter(n => n.folderId === parentId);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchedNotes = notes.filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q));
      return matchedNotes.map(note => (
        <NoteItem key={note.id} note={note} selectedId={selectedId} onSelect={onSelect} depth={0} />
      ));
    }

    return (
      <div className="space-y-0.5">
        {currentFolders.map(folder => (
          <div key={folder.id}>
            <div 
              onClick={() => toggleFolder(folder.id)}
              className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800/60 cursor-pointer text-gray-700 dark:text-zinc-300 active:scale-[0.98] transition-colors"
              style={{ paddingLeft: `${(depth * 12) + 8}px` }}
            >
              {folder.isExpanded ? <ChevronDown size={13} className="opacity-50" strokeWidth={1.75} /> : <ChevronRight size={13} className="opacity-50" strokeWidth={1.75} />}
              {folder.isExpanded ? <FolderOpen size={15} strokeWidth={1.75} className="text-zinc-700 dark:text-zinc-300" /> : <Folder size={15} strokeWidth={1.75} className="text-zinc-500 dark:text-zinc-400" />}
              <span className="font-medium text-xs flex-1 truncate">{folder.name}</span>
            </div>
            {folder.isExpanded && renderItems(folder.id, depth + 1)}
          </div>
        ))}
        {currentNotes.map(note => (
          <NoteItem key={note.id} note={note} selectedId={selectedId} onSelect={onSelect} depth={depth} />
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#111113]">
      <PromptModal
        isOpen={isPromptOpen}
        onClose={() => setIsPromptOpen(false)}
        onSubmit={handleCreateFolder}
        title="New Folder"
        placeholder="Enter folder name..."
      />
      <div className="h-14 flex items-center justify-between px-4 sm:px-5 border-b border-gray-200 dark:border-[#262626] shrink-0">
        <h2 className="font-semibold text-xs text-gray-900 dark:text-zinc-100 uppercase tracking-wider">Notes</h2>
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => setIsPromptOpen(true)} 
            className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md transition-colors text-gray-500 dark:text-zinc-400 active:scale-[0.95]" 
            title="New Folder"
          >
            <Folder size={14} strokeWidth={1.75} />
          </button>
          <button 
            onClick={() => handleCreateNote()} 
            className="w-7 h-7 flex items-center justify-center bg-white dark:bg-[#141416] border border-gray-200 dark:border-[#262626] hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-md transition-colors text-gray-700 dark:text-zinc-300 shadow-2xs active:scale-[0.95]" 
            title="New Note"
          >
            <Plus size={15} strokeWidth={1.75} />
          </button>
        </div>
      </div>
      
      <div className="p-3 border-b border-gray-200 dark:border-[#262626] shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 w-3.5 h-3.5" strokeWidth={1.75} />
          <input 
            type="text" 
            placeholder="Search notes..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-gray-50 dark:bg-[#141416] border border-gray-200 dark:border-[#262626] rounded-md text-xs text-gray-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {folders.length === 0 && notes.length === 0 ? (
          <p className="text-gray-400 dark:text-zinc-600 text-xs text-center py-8 font-normal">No notes yet.</p>
        ) : (
          renderItems(undefined, 0)
        )}
      </div>
    </div>
  );
};

const NoteItem = ({ note, selectedId, onSelect, depth }: any) => (
  <button
    onClick={() => onSelect(note.id)}
    className={`w-full text-left p-2 rounded-md flex items-center gap-2 transition-colors active:scale-[0.98] ${
      selectedId === note.id 
        ? 'bg-zinc-100 dark:bg-white/10 text-gray-900 dark:text-white shadow-2xs' 
        : 'hover:bg-gray-50 dark:hover:bg-zinc-800/50 text-gray-700 dark:text-zinc-300'
    }`}
    style={{ paddingLeft: `${(depth * 12) + 8}px` }}
  >
    <FileText size={14} strokeWidth={1.75} className={selectedId === note.id ? "text-gray-900 dark:text-white" : "opacity-50"} />
    <span className="font-medium text-xs truncate flex-1">{note.title || 'Untitled Note'}</span>
  </button>
);

// ---- NotesEditor (Right Pane) ----
export const NotesEditor: React.FC<{ selectedId: string | null; onSelect: (id: string) => void }> = ({ selectedId, onSelect }) => {
  const { vaultData, updateVaultData } = useVault();
  const notes = vaultData?.notes || [];
  const selectedNote = notes.find(n => n.id === selectedId);
  const editorRef = useRef<HTMLDivElement>(null);
  
  const [title, setTitle] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Type '/' for commands or '[[' to link a note..." }),
      Image,
      CodeBlockLowlight.configure({ lowlight }),
      SlashCommands.configure({ suggestion: slashSuggestion }),
      Mention.configure({ 
        suggestion: getNoteMentionSuggestion(notes),
        HTMLAttributes: {
          class: 'mention bg-zinc-200 dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 px-1.5 py-0.5 rounded cursor-pointer hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors font-medium text-xs',
        },
      })
    ],
    content: selectedNote?.content || '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[350px] text-xs sm:text-sm leading-relaxed',
      },
      handleDOMEvents: {
        click: (_, event) => {
          if (!event.ctrlKey && !event.metaKey) return false;

          let target = event.target as Node | null;
          while (target) {
            if (target instanceof HTMLElement && target.classList.contains('mention')) {
              const id = target.getAttribute('data-id');
              if (id) {
                onSelect(id);
                event.preventDefault();
                return true;
              }
            }
            target = target.parentNode;
          }
          return false;
        }
      }
    },
    onUpdate: ({ editor }) => {
      handleSaveContent(editor.getHTML());
    },
  }, [selectedId]);

  useEffect(() => {
    if (selectedNote) {
      setTitle(selectedNote.title);
    }
  }, [selectedNote?.id]);

  const handleSaveTitle = async (newTitle: string) => {
    setTitle(newTitle);
    if (!selectedId) return;
    const updated = notes.map(n => n.id === selectedId ? { ...n, title: newTitle, updatedAt: Date.now() } : n);
    await updateVaultData({ notes: updated });
  };

  const handleSaveContent = async (html: string) => {
    if (!selectedId) return;
    const updated = notes.map(n => n.id === selectedId ? { ...n, content: html, updatedAt: Date.now() } : n);
    await updateVaultData({ notes: updated });
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    const updated = notes.filter(n => n.id !== selectedId);
    await updateVaultData({ notes: updated });
    setIsDeleteModalOpen(false);
  };

  const exportPDF = () => {
    if (!editorRef.current) return;
    const opt = {
      margin: 1,
      filename: `${title || 'note'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(editorRef.current).save();
  };

  if (!selectedNote) {
    return (
      <EmptyState 
        icon={FileText}
        title="Notes"
        subtitle="Select a note from the list to start writing, or create a new one."
      />
    );
  }

  return (
    <>
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Note"
        message={`Are you sure you want to permanently delete "${selectedNote.title}"?`}
      />
      
      <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto w-full overflow-y-auto">
        {/* Toolbar */}
        <div className="flex justify-end items-center pb-4 shrink-0 gap-2">
          <button 
            onClick={exportPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white dark:bg-[#141416] border border-gray-200 dark:border-[#262626] hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-md transition-colors text-gray-700 dark:text-zinc-300 shadow-2xs active:scale-[0.97]"
          >
            <Download size={13} strokeWidth={1.75} /> 
            <span>Export PDF</span>
          </button>
          <button 
            onClick={() => setIsDeleteModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white dark:bg-[#141416] border border-gray-200 dark:border-[#262626] hover:bg-red-50 dark:hover:bg-red-950/20 text-gray-500 hover:text-rose-500 dark:hover:text-rose-400 rounded-md transition-colors shadow-2xs active:scale-[0.97]"
          >
            <Trash2 size={13} strokeWidth={1.75} /> 
            <span>Delete</span>
          </button>
        </div>

        {/* Editor Area */}
        <div className="flex-1" ref={editorRef}>
          <input
            type="text"
            value={title}
            onChange={(e) => handleSaveTitle(e.target.value)}
            placeholder="Untitled Note"
            className="w-full text-2xl sm:text-3xl font-bold bg-transparent text-gray-900 dark:text-white focus:outline-none mb-6 placeholder-gray-300 dark:placeholder-zinc-700 tracking-tight text-balance"
          />
          <div className="min-h-[400px]">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
    </>
  );
};
