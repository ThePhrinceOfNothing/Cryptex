import { ReactRenderer } from '@tiptap/react';
import tippy from 'tippy.js';
import React, { forwardRef, useImperativeHandle, useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import type { Note } from '../../lib/vault';

interface MentionListProps {
  items: Note[];
  command: (props: { id: string; label: string }) => void;
}

const MentionList = forwardRef((props: MentionListProps, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command({ id: item.id, label: item.title });
    }
  };

  useEffect(() => setSelectedIndex(0), [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: any) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
        return true;
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((selectedIndex + 1) % props.items.length);
        return true;
      }
      if (event.key === 'Enter') {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  if (!props.items.length) return (
    <div className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/10 rounded-lg shadow-2xl overflow-hidden w-64 flex flex-col p-3 text-sm text-gray-500 italic text-center">
      No matching notes found
    </div>
  );

  return (
    <div className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/10 rounded-lg shadow-2xl overflow-hidden w-64 flex flex-col py-1 max-h-60 overflow-y-auto">
      {props.items.map((item, index) => (
        <button
          className={`flex items-center gap-2 px-3 py-2 text-left w-full transition-colors ${
            index === selectedIndex 
              ? 'bg-accent/10 text-accent' 
              : 'text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900/50'
          }`}
          key={index}
          onClick={() => selectItem(index)}
          onMouseDown={(e) => e.preventDefault()}
        >
          <FileText size={14} className="shrink-0" />
          <span className="text-sm font-medium truncate">{item.title}</span>
        </button>
      ))}
    </div>
  );
});

export const getNoteMentionSuggestion = (notes: Note[]) => {
  return {
    char: '[[',
    items: ({ query }: { query: string }) => {
      return notes
        .filter(item => item.title.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 10);
    },
    render: () => {
      let component: ReactRenderer;
      let popup: any;

      return {
        onStart: (props: any) => {
          component = new ReactRenderer(MentionList, {
            props,
            editor: props.editor,
          });

          if (!props.clientRect) {
            return;
          }

          popup = tippy('body', {
            getReferenceClientRect: props.clientRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
          });
        },
        onUpdate(props: any) {
          component.updateProps(props);
          if (!props.clientRect) {
            return;
          }
          popup[0].setProps({
            getReferenceClientRect: props.clientRect,
          });
        },
        onKeyDown(props: any) {
          if (props.event.key === 'Escape') {
            popup[0].hide();
            return true;
          }
          return component.ref?.onKeyDown(props);
        },
        onExit() {
          popup[0].destroy();
          component.destroy();
        },
      };
    },
  };
};

