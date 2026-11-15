import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ArrowRight, CheckSquare, StickyNote, Trash2, Copy, X } from 'lucide-react';
import { useVault } from '../../context/VaultContext';
import { useToast } from '../../context/ToastContext';
import { playKeyClick, playCoinClink } from '../../lib/soundEngine';
import type { ScratchpadItem } from '../../lib/vault';

interface QuickScratchpadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTab?: (tab: string) => void;
}

export const QuickScratchpadModal: React.FC<QuickScratchpadModalProps> = ({
  isOpen,
  onClose,
  onNavigateToTab,
}) => {
  const { vaultData, updateVaultData } = useVault();
  const { showToast } = useToast();
  const [content, setContent] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [isOpen]);

  const handleClose = () => {
    setContent('');
    onClose();
  };

  if (!isOpen) return null;

  const scratchpadList: ScratchpadItem[] = vaultData?.scratchpad || [];

  const handleSaveSnippet = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;

    playKeyClick();
    const newItem: ScratchpadItem = {
      id: `scratch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      content: trimmed,
      createdAt: Date.now(),
    };

    const updated = [newItem, ...scratchpadList];
    await updateVaultData({ scratchpad: updated });
    setContent('');
    showToast('Saved to scratchpad', 'success');
  };

  const handleConvertToTask = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;

    playCoinClink();
    const currentTasks = vaultData?.tasks || [];
    const newTask = {
      id: `task-${Date.now()}`,
      title: trimmed.split('\n')[0].substring(0, 80),
      description: trimmed,
      status: 'todo' as const,
      priority: 'medium' as const,
      subtasks: [],
      createdAt: Date.now(),
    };

    await updateVaultData({
      tasks: [newTask, ...currentTasks],
    });
    setContent('');
    showToast('Captured as new task', 'success');
    if (onNavigateToTab) onNavigateToTab('Tasks');
    handleClose();
  };

  const handleConvertToNote = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;

    playCoinClink();
    const currentNotes = vaultData?.notes || [];
    const lines = trimmed.split('\n');
    const title = lines[0].substring(0, 60) || 'Untitled Scratchpad Note';
    const newNote = {
      id: `note-${Date.now()}`,
      title,
      content: trimmed,
      updatedAt: Date.now(),
    };

    await updateVaultData({
      notes: [newNote, ...currentNotes],
    });
    setContent('');
    showToast('Captured as new note', 'success');
    if (onNavigateToTab) onNavigateToTab('Notes');
    handleClose();
  };

  const handleDeleteSnippet = async (id: string) => {
    playKeyClick();
    const updated = scratchpadList.filter((item) => item.id !== id);
    await updateVaultData({ scratchpad: updated });
  };

  const handleCopySnippet = (text: string) => {
    navigator.clipboard.writeText(text);
    playKeyClick();
    showToast('Copied to clipboard', 'info');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSaveSnippet();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/50 backdrop-blur-xs">
      <div
        className="w-full max-w-lg bg-white dark:bg-[#121214] border border-gray-200 dark:border-[#27272a] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/40">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-xs font-semibold text-gray-900 dark:text-zinc-100">
              Quick Capture Scratchpad
            </span>
            <span className="text-[10px] bg-gray-200 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 px-1.5 py-0.5 rounded font-mono">
              Ctrl+Shift+Space
            </span>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Input */}
        <div className="p-3">
          <textarea
            ref={inputRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
            placeholder="Jot down a fleeting thought, task, or snippet... (Ctrl+Enter to save)"
            className="w-full bg-transparent resize-none text-xs text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none"
          />

          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-zinc-800/80">
            <span className="text-[10px] text-gray-400">Esc to close</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleConvertToTask}
                disabled={!content.trim()}
                className="px-2.5 py-1 text-[11px] font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded flex items-center gap-1 disabled:opacity-40"
                title="Convert to Task"
              >
                <CheckSquare className="w-3.5 h-3.5 text-accent" />
                As Task
              </button>
              <button
                onClick={handleConvertToNote}
                disabled={!content.trim()}
                className="px-2.5 py-1 text-[11px] font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded flex items-center gap-1 disabled:opacity-40"
                title="Convert to Note"
              >
                <StickyNote className="w-3.5 h-3.5 text-accent" />
                As Note
              </button>
              <button
                onClick={handleSaveSnippet}
                disabled={!content.trim()}
                className="px-3 py-1 text-[11px] font-semibold bg-accent text-white rounded hover:opacity-95 flex items-center gap-1 disabled:opacity-40 shadow-xs"
              >
                <span>Save Snippet</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Recent scratchpad list */}
        {scratchpadList.length > 0 && (
          <div className="px-3 pb-3 border-t border-gray-100 dark:border-zinc-800/80 pt-2 space-y-1.5 max-h-48 overflow-y-auto">
            <span className="text-[10px] font-medium uppercase tracking-wider text-gray-400 px-1">
              Recent Captures ({scratchpadList.length})
            </span>
            {scratchpadList.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="group flex items-start justify-between p-2 rounded-lg bg-gray-50 dark:bg-zinc-900/60 border border-gray-100 dark:border-zinc-800/80 text-xs text-gray-800 dark:text-zinc-200"
              >
                <p className="line-clamp-2 pr-2 text-[11px] whitespace-pre-wrap">{item.content}</p>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => handleCopySnippet(item.content)}
                    className="p-1 hover:text-accent rounded"
                    title="Copy text"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleDeleteSnippet(item.id)}
                    className="p-1 hover:text-red-400 rounded"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
