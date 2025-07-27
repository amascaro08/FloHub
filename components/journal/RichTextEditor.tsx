import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Color from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { useState, useEffect, useCallback } from 'react';
import { 
  ListBulletIcon, 
  TableCellsIcon,
  CodeBracketIcon,
  PhotoIcon,
  LinkIcon,
  MinusIcon,
  ChevronRightIcon
} from '@heroicons/react/24/solid';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

interface SlashCommand {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  action: (editor: any) => void;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  placeholder = 'Write your thoughts...',
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedCommand, setSelectedCommand] = useState(0);

  const slashCommands: SlashCommand[] = [
    {
      id: 'heading1',
      title: 'Heading 1',
      description: 'Big section heading',
      icon: () => <span className="font-bold text-lg">H1</span>,
      action: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      id: 'heading2',
      title: 'Heading 2',
      description: 'Medium section heading',
      icon: () => <span className="font-bold">H2</span>,
      action: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      id: 'heading3',
      title: 'Heading 3',
      description: 'Small section heading',
      icon: () => <span className="font-bold text-sm">H3</span>,
      action: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      id: 'bulletList',
      title: 'Bullet List',
      description: 'Create a simple bullet list',
      icon: ListBulletIcon,
      action: (editor) => editor.chain().focus().toggleBulletList().run(),
    },
    {
      id: 'orderedList',
      title: 'Numbered List',
      description: 'Create a list with numbering',
      icon: () => <span className="font-bold text-sm">1.</span>,
      action: (editor) => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      id: 'table',
      title: 'Table',
      description: 'Insert a table',
      icon: TableCellsIcon,
      action: (editor) => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    },
    {
      id: 'codeBlock',
      title: 'Code Block',
      description: 'Insert a code block',
      icon: CodeBracketIcon,
      action: (editor) => editor.chain().focus().toggleCodeBlock().run(),
    },
    {
      id: 'blockquote',
      title: 'Quote',
      description: 'Insert a quote block',
      icon: () => <span className="text-lg">"</span>,
      action: (editor) => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      id: 'divider',
      title: 'Divider',
      description: 'Insert a horizontal line',
      icon: MinusIcon,
      action: (editor) => editor.chain().focus().setHorizontalRule().run(),
    },
  ];

  // Initialize the editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Placeholder.configure({
        placeholder,
      }),
      Image,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-[#00C9A7] hover:text-teal-600 underline',
        },
      }),
      Color,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-slate dark:prose-invert max-w-none focus:outline-none p-4 min-h-[300px]',
      },
      handleKeyDown: (view, event) => {
        if (showSlashMenu) {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setSelectedCommand((prev) => (prev + 1) % slashCommands.length);
            return true;
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            setSelectedCommand((prev) => (prev - 1 + slashCommands.length) % slashCommands.length);
            return true;
          }
          if (event.key === 'Enter' || event.key === 'Tab') {
            event.preventDefault();
            executeSlashCommand(slashCommands[selectedCommand]);
            return true;
          }
          if (event.key === 'Escape') {
            setShowSlashMenu(false);
            return true;
          }
        }
        return false;
      },
    },
  });

  const executeSlashCommand = useCallback((command: SlashCommand) => {
    if (!editor) return;
    
    // Remove the "/" character
    const { from } = editor.state.selection;
    editor.chain().focus().deleteRange({ from: from - 1, to: from }).run();
    
    // Execute the command
    command.action(editor);
    setShowSlashMenu(false);
    setSelectedCommand(0);
  }, [editor]);

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

  // Handle slash command detection
  useEffect(() => {
    if (!editor) return;

    const handleTransaction = () => {
      const { selection } = editor.state;
      const { from } = selection;
      const text = editor.state.doc.textBetween(Math.max(0, from - 10), from, '\n');
      
      if (text.endsWith('/')) {
        const coords = editor.view.coordsAtPos(from);
        setSlashMenuPosition({ 
          x: coords.left, 
          y: coords.bottom + 10 
        });
        setShowSlashMenu(true);
        setSelectedCommand(0);
      } else if (showSlashMenu && !text.includes('/')) {
        setShowSlashMenu(false);
      }
    };

    editor.on('transaction', handleTransaction);
    return () => {
      editor.off('transaction', handleTransaction);
    };
  }, [editor, showSlashMenu]);

  // Close slash menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowSlashMenu(false);
    };

    if (showSlashMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showSlashMenu]);

  if (!isMounted) {
    return (
      <div className="animate-pulse">
        <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded-t-xl mb-2"></div>
        <div className="h-64 bg-slate-100 dark:bg-slate-700 rounded-b-xl"></div>
      </div>
    );
  }

  return (
    <div className="rich-text-editor w-full relative">
      {/* Toolbar */}
      <div className="toolbar bg-white dark:bg-slate-800 rounded-t-xl p-3 flex flex-wrap gap-1 border border-slate-200 dark:border-slate-600 border-b-0">
        {/* Text formatting */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => editor?.chain().focus().toggleBold().run()}
            className={`p-2 rounded-lg transition-all ${
              editor?.isActive('bold')
                ? 'bg-[#00C9A7] text-white shadow-sm'
                : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
            title="Bold (Ctrl+B)"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 11h4.5a2.5 2.5 0 1 0 0-5H8v5zm10 4.5a4.5 4.5 0 0 1-4.5 4.5H6V4h6.5a4.5 4.5 0 0 1 3.256 7.606A4.498 4.498 0 0 1 18 15.5zM8 13v5h5.5a2.5 2.5 0 1 0 0-5H8z" />
            </svg>
          </button>
          
          <button
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            className={`p-2 rounded-lg transition-all ${
              editor?.isActive('italic')
                ? 'bg-[#00C9A7] text-white shadow-sm'
                : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
            title="Italic (Ctrl+I)"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15 20H7v-2h2.927l2.116-12H9V4h8v2h-2.927l-2.116 12H15z" />
            </svg>
          </button>
          
          <button
            onClick={() => editor?.chain().focus().toggleStrike().run()}
            className={`p-2 rounded-lg transition-all ${
              editor?.isActive('strike')
                ? 'bg-[#00C9A7] text-white shadow-sm'
                : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
            title="Strikethrough"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.154 14c.23.516.346 1.09.346 1.72 0 1.342-.524 2.392-1.571 3.147C14.88 19.622 13.433 20 11.586 20c-1.64 0-3.263-.381-4.87-1.144V16.6c1.52.877 3.075 1.316 4.666 1.316 2.551 0 3.83-.732 3.839-2.197a2.21 2.21 0 0 0-.648-1.603l-.12-.117H3v-2h18v2h-3.846zm-4.078-3H7.629a4.086 4.086 0 0 1-.481-.522C6.716 9.92 6.5 9.334 6.5 8.668c0-1.198.49-2.168 1.471-2.91C8.952 5.016 10.12 4.655 11.471 4.655c1.416 0 2.855.377 4.319 1.133v2.25a7.98 7.98 0 0 0-4.354-1.133c-1.799 0-2.698.632-2.698 1.897 0 .498.186.91.557 1.236.186.164.402.29.648.376h2.533z" />
            </svg>
          </button>
        </div>
        
        <div className="h-8 w-px bg-slate-300 dark:bg-slate-600 mx-2"></div>
        
        {/* Headings */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              editor?.isActive('heading', { level: 1 })
                ? 'bg-[#00C9A7] text-white shadow-sm'
                : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
            title="Heading 1"
          >
            H1
          </button>
          
          <button
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              editor?.isActive('heading', { level: 2 })
                ? 'bg-[#00C9A7] text-white shadow-sm'
                : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
            title="Heading 2"
          >
            H2
          </button>
          
          <button
            onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              editor?.isActive('heading', { level: 3 })
                ? 'bg-[#00C9A7] text-white shadow-sm'
                : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
            title="Heading 3"
          >
            H3
          </button>
        </div>
        
        <div className="h-8 w-px bg-slate-300 dark:bg-slate-600 mx-2"></div>
        
        {/* Lists and formatting */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            className={`p-2 rounded-lg transition-all ${
              editor?.isActive('bulletList')
                ? 'bg-[#00C9A7] text-white shadow-sm'
                : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
            title="Bullet List"
          >
            <ListBulletIcon className="w-4 h-4" />
          </button>
          
                      <button
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              className={`p-2 rounded-lg transition-all ${
                editor?.isActive('orderedList')
                  ? 'bg-[#00C9A7] text-white shadow-sm'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
              title="Numbered List"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 4h13v2H8V4zM5 3v3h1v1H3V6h1V4H3V3h2zM3 14v-2.5h2V11c0-.55-.45-1-1-1s-1 .45-1 1H2c0-1.1.9-2 2-2s2 .9 2 2v1.5c0 .55-.45 1-1 1h-1V14h2v1H3v-1zm2.25 5.5c0 .55-.45 1-1 1s-1-.45-1-1 .45-1 1-1 1 .45 1 1zm-.75 1.5h-1v-1h1v1zm-1-2.5v-1h1v1h-1zM8 11h13v2H8v-2zm0 7h13v2H8v-2z" />
              </svg>
            </button>
          
          <button
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            className={`p-2 rounded-lg transition-all ${
              editor?.isActive('blockquote')
                ? 'bg-[#00C9A7] text-white shadow-sm'
                : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
            title="Quote"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 0 1-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 0 1-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
            </svg>
          </button>
        </div>
        
        <div className="h-8 w-px bg-slate-300 dark:bg-slate-600 mx-2"></div>
        
        {/* Table controls */}
        {editor?.isActive('table') && (
          <div className="flex items-center space-x-1">
            <button
              onClick={() => editor?.chain().focus().addColumnBefore().run()}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all"
              title="Add Column Before"
            >
              <TableCellsIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor?.chain().focus().addRowAfter().run()}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all"
              title="Add Row After"
            >
              <span className="text-xs">+R</span>
            </button>
            <button
              onClick={() => editor?.chain().focus().deleteTable().run()}
              className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-all"
              title="Delete Table"
            >
              <span className="text-xs">Del</span>
            </button>
          </div>
        )}
        
        {/* Utility */}
        <div className="flex items-center space-x-1 ml-auto">
          <span className="text-xs text-slate-500 dark:text-slate-400 px-2">
            Type "/" for commands
          </span>
          
          <button
            onClick={() => editor?.chain().focus().undo().run()}
            disabled={!editor?.can().undo()}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="Undo (Ctrl+Z)"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" />
            </svg>
          </button>
          
          <button
            onClick={() => editor?.chain().focus().redo().run()}
            disabled={!editor?.can().redo()}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="Redo (Ctrl+Y)"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Editor Content */}
      <div className="border border-slate-200 dark:border-slate-600 border-t-0 rounded-b-xl bg-white dark:bg-slate-800 overflow-hidden relative">
        <EditorContent 
          editor={editor} 
          className="prose-editor"
        />
        
        {/* Slash Command Menu */}
        {showSlashMenu && (
          <div 
            className="absolute z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg py-2 min-w-[280px] max-h-[300px] overflow-y-auto"
            style={{
              left: slashMenuPosition.x,
              top: slashMenuPosition.y,
            }}
          >
            <div className="px-3 py-1 text-xs text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-600 mb-1">
              Quick Insert
            </div>
            {slashCommands.map((command, index) => {
              const Icon = command.icon;
              return (
                <button
                  key={command.id}
                  className={`w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center space-x-3 transition-colors ${
                    index === selectedCommand ? 'bg-slate-100 dark:bg-slate-700' : ''
                  }`}
                  onClick={() => executeSlashCommand(command)}
                >
                  <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-900 dark:text-white text-sm">
                      {command.title}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {command.description}
                    </div>
                  </div>
                  {index === selectedCommand && (
                    <ChevronRightIcon className="w-4 h-4 text-slate-400" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
      
      <style jsx global>{`
        .prose-editor .ProseMirror {
          min-height: 300px;
          outline: none;
          padding: 1.5rem;
          color: rgb(51 65 85);
          line-height: 1.7;
        }
        
        .dark .prose-editor .ProseMirror {
          color: rgb(226 232 240);
        }
        
        .prose-editor .ProseMirror h1 {
          font-size: 2rem;
          font-weight: 700;
          margin: 1.5rem 0 1rem 0;
          color: rgb(15 23 42);
          line-height: 1.2;
        }
        
        .dark .prose-editor .ProseMirror h1 {
          color: rgb(248 250 252);
        }
        
        .prose-editor .ProseMirror h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 1.25rem 0 0.75rem 0;
          color: rgb(30 41 59);
          line-height: 1.3;
        }
        
        .dark .prose-editor .ProseMirror h2 {
          color: rgb(241 245 249);
        }
        
        .prose-editor .ProseMirror h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 1rem 0 0.5rem 0;
          color: rgb(51 65 85);
          line-height: 1.4;
        }
        
        .dark .prose-editor .ProseMirror h3 {
          color: rgb(226 232 240);
        }
        
        .prose-editor .ProseMirror p {
          margin: 0.75rem 0;
        }
        
        .prose-editor .ProseMirror strong {
          font-weight: 600;
          color: rgb(15 23 42);
        }
        
        .dark .prose-editor .ProseMirror strong {
          color: rgb(248 250 252);
        }
        
        .prose-editor .ProseMirror em {
          font-style: italic;
        }
        
        .prose-editor .ProseMirror s {
          text-decoration: line-through;
          opacity: 0.8;
        }
        
        .prose-editor .ProseMirror ul, 
        .prose-editor .ProseMirror ol {
          padding-left: 1.5rem;
          margin: 1rem 0;
        }
        
        .prose-editor .ProseMirror ul li {
          list-style-type: disc;
          margin: 0.25rem 0;
        }
        
        .prose-editor .ProseMirror ol li {
          list-style-type: decimal;
          margin: 0.25rem 0;
        }
        
        .prose-editor .ProseMirror blockquote {
          border-left: 4px solid #00C9A7;
          padding-left: 1rem;
          margin: 1.5rem 0;
          font-style: italic;
          background: rgb(248 250 252);
          padding: 1rem 1rem 1rem 1.5rem;
          border-radius: 0 0.5rem 0.5rem 0;
        }
        
        .dark .prose-editor .ProseMirror blockquote {
          background: rgb(30 41 59);
          border-left-color: #00C9A7;
        }
        
        .prose-editor .ProseMirror hr {
          border: none;
          border-top: 2px solid rgb(226 232 240);
          margin: 2rem 0;
        }
        
        .dark .prose-editor .ProseMirror hr {
          border-top-color: rgb(71 85 105);
        }
        
        .prose-editor .ProseMirror a {
          color: #00C9A7;
          text-decoration: underline;
        }
        
        .prose-editor .ProseMirror a:hover {
          color: rgb(13 148 136);
        }
        
        .prose-editor .ProseMirror code {
          background: rgb(248 250 252);
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          font-size: 0.875em;
        }
        
        .dark .prose-editor .ProseMirror code {
          background: rgb(30 41 59);
        }
        
        .prose-editor .ProseMirror pre {
          background: rgb(248 250 252);
          padding: 1rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          margin: 1rem 0;
        }
        
        .dark .prose-editor .ProseMirror pre {
          background: rgb(30 41 59);
        }
        
        .prose-editor .ProseMirror table {
          border-collapse: collapse;
          margin: 1rem 0;
          overflow: hidden;
          table-layout: fixed;
          width: 100%;
        }
        
        .prose-editor .ProseMirror table td,
        .prose-editor .ProseMirror table th {
          border: 1px solid rgb(226 232 240);
          box-sizing: border-box;
          min-width: 1em;
          padding: 0.5rem;
          position: relative;
          vertical-align: top;
        }
        
        .dark .prose-editor .ProseMirror table td,
        .dark .prose-editor .ProseMirror table th {
          border-color: rgb(71 85 105);
        }
        
        .prose-editor .ProseMirror table th {
          background-color: rgb(248 250 252);
          font-weight: 600;
        }
        
        .dark .prose-editor .ProseMirror table th {
          background-color: rgb(30 41 59);
        }
        
        .prose-editor .ProseMirror table .selectedCell:after {
          background: rgba(13, 148, 136, 0.1);
          content: "";
          left: 0;
          right: 0;
          top: 0;
          bottom: 0;
          pointer-events: none;
          position: absolute;
          z-index: 2;
        }
        
        .prose-editor .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: rgb(148 163 184);
          pointer-events: none;
          height: 0;
          font-style: italic;
        }
        
        .dark .prose-editor .ProseMirror p.is-editor-empty:first-child::before {
          color: rgb(100 116 139);
        }
        
        .prose-editor .ProseMirror:focus {
          outline: none;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;