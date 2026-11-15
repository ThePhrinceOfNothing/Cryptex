import React, { useState, useEffect, useRef } from 'react';
import { useVault } from '../../context/VaultContext';
import { useToast } from '../../context/ToastContext';
import { 
  Search, 
  Plus, 
  FileText, 
  Folder, 
  FolderOpen, 
  Trash2, 
  ChevronRight, 
  ChevronDown, 
  Download,
  Flame,
  Clock,
  Lock,
  Unlock,
  Share2,
  Calendar,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
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
import { PromptModal } from '../modals/PromptModal';
import { NoteGraphView } from './NoteGraphView';
import { playVaultLock, playShredderSound, playCoinClink, playKeyClick } from '../../lib/soundEngine';
import { addExperience, unlockBadge } from '../../lib/gamification';

import 'highlight.js/styles/github-dark.css';

const lowlight = createLowlight(common);

// ---- NotesList (Middle Pane - Folders & Notes) ----
export const NotesList: React.FC<{ 
  selectedId: string | null; 
  onSelect: (id: string) => void;
  onToggleGraph?: () => void;
  isGraphOpen?: boolean;
}> = ({ selectedId, onSelect, onToggleGraph, isGraphOpen }) => {
  const { vaultData, updateVaultData } = useVault();
  const [searchQuery, setSearchQuery] = useState('');
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  
  const folders = vaultData?.noteFolders || [];
  const notes = vaultData?.notes || [];

  const handleCreateNote = async (folderId?: string) => {
    playKeyClick();
    const newId = crypto.randomUUID();
    const newNote = { id: newId, title: 'Untitled Note', content: '', updatedAt: Date.now(), folderId };
    
    // Add note and award +10 XP
    const xpResult = addExperience(vaultData?.gamification, 10, vaultData?.settings?.soundEnabled ?? true);
    await updateVaultData({ 
      notes: [...notes, newNote],
      gamification: xpResult.newState
    });
    onSelect(newId);
  };

  const handleCreateFolder = async (name: string) => {
    playKeyClick();
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
          {onToggleGraph && (
            <button
              onClick={onToggleGraph}
              className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${
                isGraphOpen 
                  ? 'bg-accent text-white' 
                  : 'text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
              }`}
              title="Constellation Graph View"
            >
              <Share2 size={13} strokeWidth={1.75} />
            </button>
          )}
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

const NoteItem = ({ note, selectedId, onSelect, depth }: any) => {
  const isCapsule = Boolean(note.timeCapsuleUnlockDate && new Date(note.timeCapsuleUnlockDate).getTime() > Date.now());
  const isBurn = Boolean(note.burnAfterReading);

  return (
    <button
      onClick={() => onSelect(note.id)}
      className={`w-full text-left p-2 rounded-md flex items-center justify-between transition-colors active:scale-[0.98] ${
        selectedId === note.id 
          ? 'bg-zinc-100 dark:bg-white/10 text-gray-900 dark:text-white shadow-2xs' 
          : 'hover:bg-gray-50 dark:hover:bg-zinc-800/50 text-gray-700 dark:text-zinc-300'
      }`}
      style={{ paddingLeft: `${(depth * 12) + 8}px` }}
    >
      <div className="flex items-center gap-2 truncate flex-1">
        <FileText size={14} strokeWidth={1.75} className={selectedId === note.id ? "text-gray-900 dark:text-white" : "opacity-50"} />
        <span className="font-medium text-xs truncate">{note.title || 'Untitled Note'}</span>
      </div>

      <div className="flex items-center gap-1 shrink-0 ml-1">
        {isCapsule && (
          <Clock size={11} className="text-amber-500 shrink-0" title="Time Capsule Locked" />
        )}
        {isBurn && (
          <Flame size={11} className="text-rose-500 shrink-0" title="Burn After Reading" />
        )}
      </div>
    </button>
  );
};

// ---- NotesEditor (Right Pane) ----
export const NotesEditor: React.FC<{ 
  selectedId: string | null; 
  onSelect: (id: string) => void;
  isGraphOpen?: boolean;
  onCloseGraph?: () => void;
}> = ({ selectedId, onSelect, isGraphOpen, onCloseGraph }) => {
  const { vaultData, updateVaultData } = useVault();
  const { showToast } = useToast();
  const notes = vaultData?.notes || [];
  const selectedNote = notes.find(n => n.id === selectedId);
  const editorRef = useRef<HTMLDivElement>(null);
  
  const [title, setTitle] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCapsuleModalOpen, setIsCapsuleModalOpen] = useState(false);
  const [capsuleDateInput, setCapsuleDateInput] = useState('');
  
  // Burn after reading state
  const [burnCountdown, setBurnCountdown] = useState<number | null>(null);

  // Time capsule countdown state
  const [capsuleRemaining, setCapsuleRemaining] = useState<string | null>(null);
  const isTimeLocked = Boolean(
    selectedNote?.timeCapsuleUnlockDate &&
    new Date(selectedNote.timeCapsuleUnlockDate).getTime() > Date.now()
  );

  const getSafeHTML = (ed: any): string => {
    if (!ed || ed.isDestroyed || !ed.schema) return '';
    try {
      return ed.getHTML() || '';
    } catch {
      return '';
    }
  };

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
    editable: !isTimeLocked,
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
    onUpdate: ({ editor: ed }) => {
      const html = getSafeHTML(ed);
      handleSaveContent(html);
    },
  }, [selectedId]);

  // Keep editable in sync dynamically without tearing down the editor
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      try {
        editor.setEditable(!isTimeLocked);
      } catch {}
    }
  }, [editor, isTimeLocked]);

  useEffect(() => {
    if (selectedNote) {
      setTitle(selectedNote.title || '');
      if (editor && !editor.isDestroyed && editor.schema) {
        const cur = getSafeHTML(editor);
        if (cur !== (selectedNote.content || '')) {
          try {
            editor.commands.setContent(selectedNote.content || '', false);
          } catch {}
        }
      }

      // Check burn after reading
      if (selectedNote.burnAfterReading) {
        playShredderSound();
        setBurnCountdown(60);
      } else {
        setBurnCountdown(null);
      }
    }
  }, [selectedNote?.id, editor]);

  // Burn-after-reading countdown timer
  useEffect(() => {
    if (burnCountdown === null) return;
    if (burnCountdown <= 0) {
      handlePermanentShred();
      return;
    }

    const timer = setInterval(() => {
      setBurnCountdown(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(timer);
  }, [burnCountdown]);

  // Time capsule countdown updater
  useEffect(() => {
    if (!selectedNote?.timeCapsuleUnlockDate) {
      setCapsuleRemaining(null);
      return;
    }

    const updateTimer = () => {
      const targetTime = new Date(selectedNote.timeCapsuleUnlockDate!).getTime();
      const diff = targetTime - Date.now();

      if (diff <= 0) {
        setCapsuleRemaining(null);
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setCapsuleRemaining(`${days}d ${hours}h ${minutes}m ${seconds}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [selectedNote?.timeCapsuleUnlockDate]);

  const handlePermanentShred = async () => {
    if (!selectedId) return;
    playShredderSound();
    const updated = notes.filter(n => n.id !== selectedId);
    await updateVaultData({ notes: updated });
    setBurnCountdown(null);
    showToast('Note shredded and wiped permanently.', 'info');
  };

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

  const handleToggleBurn = async () => {
    if (!selectedNote || !selectedId) return;
    const willBurn = !selectedNote.burnAfterReading;
    const updated = notes.map(n => n.id === selectedId ? { ...n, burnAfterReading: willBurn } : n);
    await updateVaultData({ notes: updated });
    if (willBurn) {
      playShredderSound();
      setBurnCountdown(60);
      showToast('Burn-after-reading enabled: Self-destruct started.', 'warning');
    } else {
      setBurnCountdown(null);
      showToast('Burn-after-reading disabled.', 'info');
    }
  };

  const handleSealTimeCapsule = async () => {
    if (!capsuleDateInput || !selectedNote || !selectedId) return;
    playVaultLock();
    const updated = notes.map(n => n.id === selectedId ? { ...n, timeCapsuleUnlockDate: capsuleDateInput } : n);
    
    // Award Time Capsuleer badge + 25 XP
    const badgeRes = unlockBadge(vaultData?.gamification, 'time_capsuleer');
    const xpResult = addExperience(badgeRes.newState, 25, vaultData?.settings?.soundEnabled ?? true);

    await updateVaultData({
      notes: updated,
      gamification: xpResult.newState,
    });

    setIsCapsuleModalOpen(false);
    showToast('Digital time capsule sealed until future date.', 'success');
  };

  const handleUnlockCapsulePrematurely = async () => {
    if (!selectedNote || !selectedId) return;
    const updated = notes.map(n => n.id === selectedId ? { ...n, timeCapsuleUnlockDate: undefined } : n);
    await updateVaultData({ notes: updated });
    setCapsuleRemaining(null);
    showToast('Time capsule seal lifted.', 'info');
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

  if (isGraphOpen) {
    return (
      <NoteGraphView
        notes={notes}
        selectedId={selectedId}
        onSelectNote={(id) => {
          onSelect(id);
          if (onCloseGraph) onCloseGraph();
        }}
        onClose={onCloseGraph}
      />
    );
  }

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

      {/* Time Capsule Modal */}
      {isCapsuleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-[#141416] border border-gray-200 dark:border-[#27272a] rounded-xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
                Seal Time Capsule Note
              </h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              Pick a future date and time. The note will be cryptographically countdown-locked and unviewable until that moment.
            </p>
            <input
              type="datetime-local"
              value={capsuleDateInput}
              min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
              onChange={(e) => setCapsuleDateInput(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs text-gray-900 dark:text-zinc-100 focus:outline-none focus:border-accent"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setIsCapsuleModalOpen(false)}
                className="px-3 py-1.5 text-xs text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleSealTimeCapsule}
                disabled={!capsuleDateInput}
                className="px-3 py-1.5 text-xs font-semibold bg-accent text-white rounded-md hover:opacity-95 disabled:opacity-40 shadow-xs"
              >
                Seal Capsule (+25 XP)
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="h-full flex flex-col p-4 sm:p-6 lg:p-8 w-full overflow-y-auto">
        
        {/* Burn Warning Banner */}
        {burnCountdown !== null && (
          <div className="mb-4 bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 flex items-center justify-between text-xs text-rose-500">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 shrink-0 animate-bounce" />
              <span className="font-semibold">
                Burn-After-Reading Active: Self-destructing in <span className="tabular-nums font-mono">{burnCountdown}s</span>
              </span>
            </div>
            <button
              onClick={handlePermanentShred}
              className="px-2.5 py-1 bg-rose-600 text-white rounded text-[11px] font-medium hover:bg-rose-700"
            >
              Destroy Now
            </button>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex justify-between items-center pb-4 shrink-0 gap-2 border-b border-gray-100 dark:border-zinc-800/80 mb-4">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsCapsuleModalOpen(true)}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                selectedNote.timeCapsuleUnlockDate
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                  : 'bg-white dark:bg-[#141416] border-gray-200 dark:border-[#262626] text-gray-600 dark:text-zinc-400 hover:bg-gray-50'
              }`}
              title="Time Capsule Countdown Lock"
            >
              <Clock size={13} strokeWidth={1.75} />
              <span>{selectedNote.timeCapsuleUnlockDate ? 'Time Sealed' : 'Capsule'}</span>
            </button>

            <button
              onClick={handleToggleBurn}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                selectedNote.burnAfterReading
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                  : 'bg-white dark:bg-[#141416] border-gray-200 dark:border-[#262626] text-gray-600 dark:text-zinc-400 hover:bg-gray-50'
              }`}
              title="Burn-After-Reading"
            >
              <Flame size={13} strokeWidth={1.75} />
              <span>{selectedNote.burnAfterReading ? 'Burning' : 'Burn On Read'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
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
        </div>

        {/* Time-Locked Capsule View */}
        {isTimeLocked ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 text-center space-y-4">
            <div className="p-4 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500">
              <Lock className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {title || 'Untitled Time Capsule'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                Contents sealed under time-lock encryption.
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-zinc-900/80 border border-gray-200 dark:border-zinc-800 px-6 py-4 rounded-xl">
              <span className="text-[11px] text-gray-400 uppercase tracking-wider">Unlocks In</span>
              <p className="text-2xl font-mono font-bold text-amber-500 tabular-nums mt-1">
                {capsuleRemaining || 'Unlocking...'}
              </p>
              <span className="text-[10px] text-gray-400 mt-1 block">
                Target: {new Date(selectedNote.timeCapsuleUnlockDate!).toLocaleString()}
              </span>
            </div>

            <button
              onClick={handleUnlockCapsulePrematurely}
              className="text-xs text-gray-400 hover:text-gray-700 dark:hover:text-zinc-300 underline pt-2"
            >
              Emergency Override / Lift Seal
            </button>
          </div>
        ) : (
          /* Normal Editor Area */
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
        )}
      </div>
    </>
  );
};
