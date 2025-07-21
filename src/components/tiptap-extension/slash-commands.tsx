"use client";

import { Extension } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import { PluginKey } from "@tiptap/pm/state";
import { Suggestion } from "@tiptap/suggestion";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { Editor } from "@tiptap/react";

interface CommandItemProps {
  title: string;
  description: string;
  icon: string;
}

interface CommandsListProps {
  items: CommandItemProps[];
  command: (item: CommandItemProps) => void;
}

export interface CommandsListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

const CommandsList = forwardRef<CommandsListRef, CommandsListProps>(
  (props, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = (index: number) => {
      const item = props.items[index];
      if (item) {
        props.command(item);
      }
    };

    const upHandler = () => {
      setSelectedIndex(
        (selectedIndex + props.items.length - 1) % props.items.length,
      );
    };

    const downHandler = () => {
      setSelectedIndex((selectedIndex + 1) % props.items.length);
    };

    const enterHandler = () => {
      selectItem(selectedIndex);
    };

    useEffect(() => setSelectedIndex(0), [props.items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === "ArrowUp") {
          upHandler();
          return true;
        }

        if (event.key === "ArrowDown") {
          downHandler();
          return true;
        }

        if (event.key === "Enter") {
          enterHandler();
          return true;
        }

        return false;
      },
    }));

    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 max-w-xs">
        {props.items.length ? (
          props.items.map((item, index) => (
            <button
              className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 ${
                index === selectedIndex
                  ? "bg-gray-100 dark:bg-gray-700"
                  : "hover:bg-gray-50 dark:hover:bg-gray-750"
              }`}
              key={index}
              onClick={() => selectItem(index)}
            >
              <span className="text-lg">{item.icon}</span>
              <div>
                <div className="font-medium">{item.title}</div>
                <div className="text-gray-500 dark:text-gray-400 text-xs">
                  {item.description}
                </div>
              </div>
            </button>
          ))
        ) : (
          <div className="px-3 py-2 text-gray-500 dark:text-gray-400 text-sm">
            No results
          </div>
        )}
      </div>
    );
  },
);

CommandsList.displayName = "CommandsList";

const SlashCommand = Extension.create({
  name: "slashCommand",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        command: ({
          editor,
          range,
          props,
        }: {
          editor: Editor;
          range: any;
          props: any;
        }) => {
          props.command({ editor, range });
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: this.options.suggestion.char,
        command: this.options.suggestion.command,
        items: this.options.suggestion.items,
        render: this.options.suggestion.render,
      }),
    ];
  },
});

const getSuggestionItems = ({ query }: { query: string }) => {
  console.log("getSuggestionItems called with query:", query);
  const items = [
    {
      title: "Heading 1",
      description: "Big section heading",
      icon: "📖",
      command: ({ editor, range }: { editor: Editor; range: any }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setNode("heading", { level: 1 })
          .run();
      },
    },
    {
      title: "Heading 2",
      description: "Medium section heading",
      icon: "📑",
      command: ({ editor, range }: { editor: Editor; range: any }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setNode("heading", { level: 2 })
          .run();
      },
    },
    {
      title: "Heading 3",
      description: "Small section heading",
      icon: "📄",
      command: ({ editor, range }: { editor: Editor; range: any }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setNode("heading", { level: 3 })
          .run();
      },
    },
    {
      title: "Bullet List",
      description: "Create a bullet list",
      icon: "•",
      command: ({ editor, range }: { editor: Editor; range: any }) => {
        editor.chain().focus().deleteRange(range).toggleBulletList().run();
      },
    },
    {
      title: "Numbered List",
      description: "Create a numbered list",
      icon: "1.",
      command: ({ editor, range }: { editor: Editor; range: any }) => {
        editor.chain().focus().deleteRange(range).toggleOrderedList().run();
      },
    },
    {
      title: "Task List",
      description: "Create a task list",
      icon: "☑️",
      command: ({ editor, range }: { editor: Editor; range: any }) => {
        editor.chain().focus().deleteRange(range).toggleTaskList().run();
      },
    },
    {
      title: "Blockquote",
      description: "Create a blockquote",
      icon: "💬",
      command: ({ editor, range }: { editor: Editor; range: any }) => {
        editor.chain().focus().deleteRange(range).toggleBlockquote().run();
      },
    },
    {
      title: "Code Block",
      description: "Create a code block",
      icon: "💻",
      command: ({ editor, range }: { editor: Editor; range: any }) => {
        editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
      },
    },
    {
      title: "Horizontal Rule",
      description: "Add a horizontal divider",
      icon: "➖",
      command: ({ editor, range }: { editor: Editor; range: any }) => {
        editor.chain().focus().deleteRange(range).setHorizontalRule().run();
      },
    },
  ];

  return items
    .filter((item) => item.title.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 10);
};

const renderItems = () => {
  let component: ReactRenderer | null = null;
  let popup: any = null;

  return {
    onStart: (props: any) => {
      component = new ReactRenderer(CommandsList, {
        props,
        editor: props.editor,
      });

      if (!props.clientRect) {
        return;
      }

      popup = {
        getBoundingClientRect: () => props.clientRect(),
      };
    },

    onUpdate(props: any) {
      component?.updateProps(props);

      if (!props.clientRect) {
        return;
      }

      popup = {
        getBoundingClientRect: () => props.clientRect(),
      };
    },

    onKeyDown(props: any) {
      if (props.event.key === "Escape") {
        popup = null;
        component?.destroy();
        return true;
      }

      return (component?.ref as CommandsListRef)?.onKeyDown(props);
    },

    onExit() {
      popup = null;
      component?.destroy();
    },
  };
};

export { SlashCommand, getSuggestionItems, renderItems }; 