import React from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { TextAlign } from "@tiptap/extension-text-align";
import { Typography } from "@tiptap/extension-typography";
import { Highlight } from "@tiptap/extension-highlight";
import { Image } from "@tiptap/extension-image";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { Link } from "@tiptap/extension-link";
import { Underline } from "@tiptap/extension-underline";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";

interface TipTapContentViewerProps {
  content: string;
  className?: string;
}

export function TipTapContentViewer({ content, className = "" }: TipTapContentViewerProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Typography,
      Highlight.configure({ multicolor: true }),
      Image,
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({ openOnClick: true }),
      Underline,
      Subscript,
      Superscript,
    ],
    content: content,
    editable: false,
    immediatelyRender: false,
  });

  React.useEffect(() => {
    if (editor && content) {
      editor.commands.setContent(content);
    }
  }, [editor, content]);

  if (!editor) {
    return (
      <div className={`animate-pulse bg-gray-200 rounded h-32 ${className}`} />
    );
  }

  return (
    <div className={`tiptap-content-viewer ${className}`}>
      <EditorContent 
        editor={editor} 
      />
    </div>
  );
} 