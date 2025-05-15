import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Color from '@tiptap/extension-color';
import { useState, useEffect } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  placeholder = 'Write your thoughts...',
}) => {
  const [isMounted, setIsMounted] = useState(false);

  // Initialize the editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
      Image,
      Link.configure({
        openOnClick: false,
      }),
      Color,
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Handle client-side rendering
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Update content when it changes externally
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!isMounted) {
    return null;
  }

  return (
    <div className="rich-text-editor">
      <div className="toolbar bg-slate-100 dark:bg-slate-700 rounded-t-lg p-2 flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-600">
        <button
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className={`p-1 rounded ${
            editor?.isActive('bold')
              ? 'bg-slate-300 dark:bg-slate-600'
              : 'hover:bg-slate-200 dark:hover:bg-slate-600'
          }`}
          title="Bold"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" className="w-5 h-5">
            <path fill="none" d="M0 0h24v24H0z" />
            <path d="M8 11h4.5a2.5 2.5 0 1 0 0-5H8v5zm10 4.5a4.5 4.5 0 0 1-4.5 4.5H6V4h6.5a4.5 4.5 0 0 1 3.256 7.606A4.498 4.498 0 0 1 18 15.5zM8 13v5h5.5a2.5 2.5 0 1 0 0-5H8z" fill="currentColor" />
          </svg>
        </button>
        
        <button
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className={`p-1 rounded ${
            editor?.isActive('italic')
              ? 'bg-slate-300 dark:bg-slate-600'
              : 'hover:bg-slate-200 dark:hover:bg-slate-600'
          }`}
          title="Italic"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" className="w-5 h-5">
            <path fill="none" d="M0 0h24v24H0z" />
            <path d="M15 20H7v-2h2.927l2.116-12H9V4h8v2h-2.927l-2.116 12H15z" fill="currentColor" />
          </svg>
        </button>
        
        <div className="h-6 w-px bg-slate-300 dark:bg-slate-500 mx-1"></div>
        
        <button
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-1 rounded ${
            editor?.isActive('heading', { level: 1 })
              ? 'bg-slate-300 dark:bg-slate-600'
              : 'hover:bg-slate-200 dark:hover:bg-slate-600'
          }`}
          title="Heading 1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" className="w-5 h-5">
            <path fill="none" d="M0 0H24V24H0z" />
            <path d="M13 20h-2v-7H4v7H2V4h2v7h7V4h2v16zm8-12v12h-2v-9.796l-2 .536V8.67L19.5 8H21z" fill="currentColor" />
          </svg>
        </button>
        
        <button
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-1 rounded ${
            editor?.isActive('heading', { level: 2 })
              ? 'bg-slate-300 dark:bg-slate-600'
              : 'hover:bg-slate-200 dark:hover:bg-slate-600'
          }`}
          title="Heading 2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" className="w-5 h-5">
            <path fill="none" d="M0 0H24V24H0z" />
            <path d="M4 4v7h7V4h2v16h-2v-7H4v7H2V4h2zm14.5 4c2.071 0 3.75 1.679 3.75 3.75 0 .857-.288 1.648-.772 2.28l-.148.18L18.034 18H22v2h-7v-1.556l4.82-5.546c.268-.307.43-.709.43-1.148 0-.966-.784-1.75-1.75-1.75-.918 0-1.671.707-1.744 1.606l-.006.144h-2C14.75 9.679 16.429 8 18.5 8z" fill="currentColor" />
          </svg>
        </button>
        
        <button
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`p-1 rounded ${
            editor?.isActive('heading', { level: 3 })
              ? 'bg-slate-300 dark:bg-slate-600'
              : 'hover:bg-slate-200 dark:hover:bg-slate-600'
          }`}
          title="Heading 3"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" className="w-5 h-5">
            <path fill="none" d="M0 0H24V24H0z" />
            <path d="M22 8l-.002 2-2.505 2.883c1.59.435 2.757 1.89 2.757 3.617 0 2.071-1.679 3.75-3.75 3.75-1.826 0-3.347-1.305-3.682-3.033l1.964-.382c.156.806.866 1.415 1.718 1.415.966 0 1.75-.784 1.75-1.75s-.784-1.75-1.75-1.75c-.286 0-.556.069-.794.19l-1.307-1.547L19.35 10H15V8h7zM4 4v7h7V4h2v16h-2v-7H4v7H2V4h2z" fill="currentColor" />
          </svg>
        </button>
        
        <div className="h-6 w-px bg-slate-300 dark:bg-slate-500 mx-1"></div>
        
        <button
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          className={`p-1 rounded ${
            editor?.isActive('bulletList')
              ? 'bg-slate-300 dark:bg-slate-600'
              : 'hover:bg-slate-200 dark:hover:bg-slate-600'
          }`}
          title="Bullet List"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" className="w-5 h-5">
            <path fill="none" d="M0 0h24v24H0z" />
            <path d="M8 4h13v2H8V4zM4.5 6.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm0 7a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm0 6.9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zM8 11h13v2H8v-2zm0 7h13v2H8v-2z" fill="currentColor" />
          </svg>
        </button>
        
        {/* Ordered list button removed due to compatibility issues with TipTap StarterKit */}
        
        <button
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          className={`p-1 rounded ${
            editor?.isActive('blockquote')
              ? 'bg-slate-300 dark:bg-slate-600'
              : 'hover:bg-slate-200 dark:hover:bg-slate-600'
          }`}
          title="Blockquote"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" className="w-5 h-5">
            <path fill="none" d="M0 0h24v24H0z" />
            <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 0 1-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 0 1-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" fill="currentColor" />
          </svg>
        </button>
        
        <button
          onClick={() => editor?.chain().focus().setHorizontalRule().run()}
          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600"
          title="Horizontal Rule"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" className="w-5 h-5">
            <path fill="none" d="M0 0h24v24H0z" />
            <path d="M2 11h2v2H2v-2zm4 0h12v2H6v-2zm14 0h2v2h-2v-2z" fill="currentColor" />
          </svg>
        </button>
      </div>
      
      <EditorContent 
        editor={editor} 
        className="prose dark:prose-invert max-w-none p-4 rounded-b-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none min-h-[200px] overflow-y-auto"
      />
      
      <style jsx global>{`
        .ProseMirror {
          min-height: 200px;
          outline: none;
        }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #adb5bd;
          pointer-events: none;
          height: 0;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;