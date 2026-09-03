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

import 'highlight.js/styles/github-dark.css'; // Add basic highlight css

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

  // Very basic recursive renderer for 1 level for simplicity, but can be scaled
  const renderItems = (parentId?: string, depth = 0) => {
    const currentFolders = folders.filter(f => f.parentId === parentId);
    const currentNotes = notes.filter(n => n.folderId === parentId);

    // If searching, flatten everything
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchedNotes = notes.filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q));
      return matchedNotes.map(note => (
        <NoteItem key={note.id} note={note} selectedId={selectedId} onSelect={onSelect} depth={0} />
      ));
    }

    return (
      <div className="space-y-1">
        {currentFolders.map(folder => (
          <div key={folder.id}>
            <div 
              onClick={() => toggleFolder(folder.id)}
              className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-900 cursor-pointer text-gray-700 dark:text-zinc-300"
              style={{ paddingLeft: `${(depth * 12) + 8}px` }}
            >
              {folder.isExpanded ? <ChevronDown size={14} className="opacity-50" /> : <ChevronRight size={14} className="opacity-50" />}
              {folder.isExpanded ? <FolderOpen size={16} className="text-accent" /> : <Folder size={16} className="text-accent" />}
              <span className="font-medium text-sm flex-1 truncate">{folder.name}</span>
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
    <div className="flex flex-col h-full bg-white dark:bg-[#141414]">
      <PromptModal
        isOpen={isPromptOpen}
        onClose={() => setIsPromptOpen(false)}
        onSubmit={handleCreateFolder}
        title="New Folder"
        placeholder="Enter folder name..."
      />
      <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200 dark:border-[#262626] shrink-0">
        <h2 className="font-semibold text-gray-900 dark:text-zinc-100">Knowledge Graph</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsPromptOpen(true)} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-zinc-900 rounded-md transition-colors text-gray-500" title="New Folder">
            <Folder size={16} />
          </button>
          <button onClick={() => handleCreateNote()} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-[#141414] border border-gray-200 dark:border-[#262626] hover:border-accent hover:text-accent rounded-md transition-colors text-gray-500 shadow-sm" title="New Note">
            <Plus size={16} />
          </button>
        </div>
      </div>
      
      <div className="p-4 border-b border-gray-200 dark:border-[#262626] shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search notes..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#262626] rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {folders.length === 0 && notes.length === 0 ? (
          <p className="text-gray-400 text-xs text-center mt-6">No notes yet.</p>
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
    className={`w-full text-left p-2 rounded-md flex items-center gap-2 transition-colors ${
      selectedId === note.id ? 'bg-accent/10 text-accent' : 'hover:bg-gray-100 dark:hover:bg-zinc-900 text-gray-700 dark:text-zinc-300'
    }`}
    style={{ paddingLeft: `${(depth * 12) + 8}px` }}
  >
    <FileText size={16} className={selectedId === note.id ? "text-accent" : "opacity-60"} />
    <span className="font-medium text-sm truncate flex-1">{note.title || 'Untitled'}</span>
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

  // Configure Tiptap
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Type '/' for commands or '[[' to link a note. (Ctrl+Click links to open)" }),
      Image,
      CodeBlockLowlight.configure({ lowlight }),
      SlashCommands.configure({ suggestion: slashSuggestion }),
      Mention.configure({ 
        suggestion: getNoteMentionSuggestion(notes),
        HTMLAttributes: {
          class: 'mention bg-accent/20 text-accent px-1.5 py-0.5 rounded cursor-pointer hover:bg-accent/30 transition-colors font-medium',
        },
      })
    ],
    content: selectedNote?.content || '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[400px]',
      },
      handleDOMEvents: {
        click: (_, event) => {
          // Require Ctrl (Windows/Linux) or Cmd (Mac) to follow links
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
  }, [selectedId]); // Re-init when ID changes so it gets the fresh notes array for mentions

  // Sync title
  useEffect(() => {
    if (selectedNote) {
      setTitle(selectedNote.title);
      // We don't set editor content here because useEditor's dependency array handles re-mounting
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
        title="Knowledge Graph"
        subtitle="Create a new note or select one from the sidebar."
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
      
      <div className="h-full flex flex-col max-w-4xl mx-auto overflow-y-auto">
        {/* Toolbar */}
        <div className="flex justify-end items-center p-6 pb-0 shrink-0 gap-2">
          <button 
            onClick={exportPDF}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-white dark:bg-zinc-800 border border-gray-200 dark:border-[#262626] hover:border-accent hover:text-accent rounded-md transition-colors"
          >
            <Download size={14} /> PDF
          </button>
          <button 
            onClick={() => setIsDeleteModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-white dark:bg-zinc-800 border border-gray-200 dark:border-[#262626] hover:border-red-500 hover:text-red-500 rounded-md transition-colors text-gray-500"
          >
            <Trash2 size={14} /> Delete
          </button>
        </div>

        {/* Editor Wrapper */}
        <div className="p-10 pt-6 flex-1" ref={editorRef}>
          <input
            type="text"
            value={title}
            onChange={(e) => handleSaveTitle(e.target.value)}
            placeholder="Note Title"
            className="w-full text-4xl font-bold bg-transparent text-gray-900 dark:text-white focus:outline-none mb-8 placeholder-gray-300 dark:placeholder-zinc-700"
          />
          <div className="min-h-[500px]">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
    </>
  );
};



