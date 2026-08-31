import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import tippy from 'tippy.js';
import { ReactRenderer } from '@tiptap/react';
import React, { forwardRef, useImperativeHandle, useState, useEffect } from 'react';
import { Heading1, Heading2, Heading3, List, ListOrdered, Quote, CodeSquare, CheckSquare } from 'lucide-react';

interface CommandItemProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  command: (props: { editor: any, range: any }) => void;
}

const COMMAND_ITEMS: CommandItemProps[] = [
  {
    title: 'Heading 1',
    description: 'Large section heading',
    icon: <Heading1 size={18} />,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run(),
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading',
    icon: <Heading2 size={18} />,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run(),
  },
  {
    title: 'Heading 3',
    description: 'Small section heading',
    icon: <Heading3 size={18} />,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run(),
  },
  {
    title: 'Bullet List',
    description: 'Create a simple bulleted list',
    icon: <List size={18} />,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: 'Numbered List',
    description: 'Create a list with numbering',
    icon: <ListOrdered size={18} />,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: 'Quote',
    description: 'Capture a quote',
    icon: <Quote size={18} />,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    title: 'Code Block',
    description: 'Capture a code snippet',
    icon: <CodeSquare size={18} />,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  }
];

const CommandList = forwardRef((props: any, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command(item);
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

  if (!props.items.length) return null;

  return (
    <div className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/10 rounded-lg shadow-2xl overflow-hidden w-64 flex flex-col py-1">
      {props.items.map((item: CommandItemProps, index: number) => (
        <button
          className={`flex items-center gap-3 px-3 py-2 text-left w-full transition-colors ${
            index === selectedIndex 
              ? 'bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white' 
              : 'text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900/50'
          }`}
          key={index}
          onClick={() => selectItem(index)}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div className="p-1.5 bg-gray-200 dark:bg-black rounded-md text-gray-500 dark:text-zinc-400">
            {item.icon}
          </div>
          <div>
            <p className="text-sm font-medium">{item.title}</p>
            <p className="text-xs text-gray-500 dark:text-zinc-500">{item.description}</p>
          </div>
        </button>
      ))}
    </div>
  );
});

export const SlashCommands = Extension.create({
  name: 'slashCommands',
  addOptions() {
    return {
      suggestion: {
        char: '/',
        command: ({ editor, range, props }: any) => {
          props.command({ editor, range });
        },
      },
    };
  },
  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

export const slashSuggestion = {
  items: ({ query }: { query: string }) => {
    return COMMAND_ITEMS.filter(item => item.title.toLowerCase().startsWith(query.toLowerCase())).slice(0, 10);
  },
  render: () => {
    let component: ReactRenderer;
    let popup: any;

    return {
      onStart: (props: any) => {
        component = new ReactRenderer(CommandList, {
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

