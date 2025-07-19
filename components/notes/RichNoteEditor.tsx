"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useUser } from "@/lib/hooks/useUser";
import CreatableSelect from 'react-select/creatable';

interface RichNoteEditorProps {
  note?: {
    id?: string;
    title?: string;
    content: string;
    tags: string[];
    createdAt?: string;
  };
  onSave: (note: { title: string; content: string; tags: string[] }) => Promise<void>;
  onDelete?: (noteId: string) => Promise<void>;
  isSaving: boolean;
  existingTags: string[];
  isNewNote?: boolean;
}

interface SlashCommand {
  id: string;
  title: string;
  description: string;
  icon: string;
  action: (editor: HTMLTextAreaElement, startPos: number, endPos: number) => void;
}

// Function to render markdown content
const renderMarkdown = (content: string) => {
  const lines = content.split('\n');
  let inTable = false;
  let tableRows: string[] = [];
  let inList = false;
  let listItems: string[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  
  const result: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Handle code blocks
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        result.push(`<pre class="bg-neutral-100 dark:bg-neutral-800 p-4 rounded-lg my-4 overflow-x-auto"><code class="text-sm font-mono text-neutral-800 dark:text-neutral-200">${codeBlockContent.join('\n')}</code></pre>`);
        inCodeBlock = false;
        codeBlockContent = [];
      } else {
        // Start code block
        inCodeBlock = true;
        codeBlockContent = [];
      }
      continue;
    }
    
    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }
    
    // Handle tables
    if (line.includes('|') && line.trim().length > 0) {
      if (!inTable) {
        inTable = true;
        tableRows = [];
      }
      tableRows.push(line);
      continue;
    } else if (inTable) {
      // End table
      if (tableRows.length > 0) {
        const tableHtml = renderTable(tableRows);
        result.push(tableHtml);
      }
      inTable = false;
      tableRows = [];
    }
    
    // Handle lists
    if (line.startsWith('- ') || line.match(/^\d+\. /)) {
      if (!inList) {
        inList = true;
        listItems = [];
      }
      listItems.push(line);
      continue;
    } else if (inList) {
      // End list
      if (listItems.length > 0) {
        const listHtml = renderList(listItems);
        result.push(listHtml);
      }
      inList = false;
      listItems = [];
    }
    
    // Handle headings
    if (line.startsWith('# ')) {
      result.push(`<h1 class="text-3xl font-bold mb-4 mt-6 text-neutral-900 dark:text-neutral-100">${line.substring(2)}</h1>`);
      continue;
    }
    if (line.startsWith('## ')) {
      result.push(`<h2 class="text-2xl font-bold mb-3 mt-5 text-neutral-900 dark:text-neutral-100">${line.substring(3)}</h2>`);
      continue;
    }
    if (line.startsWith('### ')) {
      result.push(`<h3 class="text-xl font-bold mb-2 mt-4 text-neutral-900 dark:text-neutral-100">${line.substring(4)}</h3>`);
      continue;
    }
    
    // Handle quote
    if (line.startsWith('> ')) {
      result.push(`<blockquote class="border-l-4 border-neutral-300 dark:border-neutral-600 pl-4 my-4 italic text-neutral-600 dark:text-neutral-400">${line.substring(2)}</blockquote>`);
      continue;
    }
    
    // Handle divider
    if (line === '---') {
      result.push(`<hr class="my-6 border-neutral-300 dark:border-neutral-600" />`);
      continue;
    }
    
    // Handle regular paragraphs
    if (line.trim() === '') {
      result.push('<br />');
    } else {
      result.push(`<p class="mb-3 text-neutral-700 dark:text-neutral-300 leading-relaxed">${line}</p>`);
    }
  }
  
  // Handle any remaining table or list
  if (inTable && tableRows.length > 0) {
    const tableHtml = renderTable(tableRows);
    result.push(tableHtml);
  }
  
  if (inList && listItems.length > 0) {
    const listHtml = renderList(listItems);
    result.push(listHtml);
  }
  
  return result.join('');
};

// Function to render tables
const renderTable = (rows: string[]) => {
  if (rows.length < 2) return '';
  
  const headers = rows[0].split('|').filter(cell => cell.trim());
  const separatorRow = rows[1];
  const dataRows = rows.slice(2);
  
  let tableHtml = '<div class="overflow-x-auto my-4"><table class="min-w-full border border-neutral-300 dark:border-neutral-600 rounded-lg">';
  
  // Headers
  tableHtml += '<thead class="bg-neutral-50 dark:bg-neutral-800">';
  tableHtml += '<tr>';
  headers.forEach(header => {
    tableHtml += `<th class="px-4 py-3 text-left font-semibold text-neutral-900 dark:text-neutral-100 border-b border-neutral-300 dark:border-neutral-600">${header.trim()}</th>`;
  });
  tableHtml += '</tr>';
  tableHtml += '</thead>';
  
  // Data rows
  tableHtml += '<tbody>';
  dataRows.forEach(row => {
    const cells = row.split('|').filter(cell => cell.trim());
    tableHtml += '<tr class="border-b border-neutral-200 dark:border-neutral-700">';
    cells.forEach(cell => {
      tableHtml += `<td class="px-4 py-3 text-neutral-700 dark:text-neutral-300">${cell.trim()}</td>`;
    });
    tableHtml += '</tr>';
  });
  tableHtml += '</tbody>';
  tableHtml += '</table></div>';
  
  return tableHtml;
};

// Function to render lists
const renderList = (items: string[]) => {
  if (items.length === 0) return '';
  
  const isOrdered = items[0].match(/^\d+\. /);
  const listType = isOrdered ? 'ol' : 'ul';
  const listClass = isOrdered ? 'list-decimal' : 'list-disc';
  
  let listHtml = `<${listType} class="${listClass} ml-6 mb-4 space-y-1">`;
  
  items.forEach(item => {
    const content = isOrdered ? item.replace(/^\d+\. /, '') : item.substring(2);
    listHtml += `<li class="text-neutral-700 dark:text-neutral-300">${content}</li>`;
  });
  
  listHtml += `</${listType}>`;
  
  return listHtml;
};

export default function RichNoteEditor({ 
  note, 
  onSave, 
  onDelete, 
  isSaving, 
  existingTags, 
  isNewNote = false 
}: RichNoteEditorProps) {
  const { user } = useUser();
  const [content, setContent] = useState(note?.content || "");
  const [tags, setTags] = useState(note?.tags || []);
  const [showSlashCommands, setShowSlashCommands] = useState(false);
  const [slashCommandIndex, setSlashCommandIndex] = useState(0);
  const [slashCommandPosition, setSlashCommandPosition] = useState({ start: 0, end: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const slashCommandsRef = useRef<HTMLDivElement>(null);

  // Auto-generate title from first line
  const autoTitle = content.split('\n')[0].replace(/^#+\s*/, '').trim() || "Untitled Note";

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Slash commands
  const slashCommands: SlashCommand[] = [
    {
      id: 'heading1',
      title: 'Heading 1',
      description: 'Large heading',
      icon: 'H1',
      action: (editor, start, end) => {
        const before = content.substring(0, start);
        const after = content.substring(end);
        const newContent = before + '# ' + after;
        setContent(newContent);
        editor.focus();
        editor.setSelectionRange(start + 2, start + 2);
      }
    },
    {
      id: 'heading2',
      title: 'Heading 2',
      description: 'Medium heading',
      icon: 'H2',
      action: (editor, start, end) => {
        const before = content.substring(0, start);
        const after = content.substring(end);
        const newContent = before + '## ' + after;
        setContent(newContent);
        editor.focus();
        editor.setSelectionRange(start + 3, start + 3);
      }
    },
    {
      id: 'heading3',
      title: 'Heading 3',
      description: 'Small heading',
      icon: 'H3',
      action: (editor, start, end) => {
        const before = content.substring(0, start);
        const after = content.substring(end);
        const newContent = before + '### ' + after;
        setContent(newContent);
        editor.focus();
        editor.setSelectionRange(start + 4, start + 4);
      }
    },
    {
      id: 'bullet-list',
      title: 'Bullet List',
      description: 'Create a bullet list',
      icon: '•',
      action: (editor, start, end) => {
        const before = content.substring(0, start);
        const after = content.substring(end);
        const newContent = before + '- ' + after;
        setContent(newContent);
        editor.focus();
        editor.setSelectionRange(start + 2, start + 2);
      }
    },
    {
      id: 'numbered-list',
      title: 'Numbered List',
      description: 'Create a numbered list',
      icon: '1.',
      action: (editor, start, end) => {
        const before = content.substring(0, start);
        const after = content.substring(end);
        const newContent = before + '1. ' + after;
        setContent(newContent);
        editor.focus();
        editor.setSelectionRange(start + 3, start + 3);
      }
    },
    {
      id: 'table',
      title: 'Table',
      description: 'Insert a table',
      icon: '⊞',
      action: (editor, start, end) => {
        const before = content.substring(0, start);
        const after = content.substring(end);
        const tableTemplate = `| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |`;
        const newContent = before + tableTemplate + after;
        setContent(newContent);
        editor.focus();
        editor.setSelectionRange(start + tableTemplate.length, start + tableTemplate.length);
      }
    },
    {
      id: 'code-block',
      title: 'Code Block',
      description: 'Insert a code block',
      icon: '</>',
      action: (editor, start, end) => {
        const before = content.substring(0, start);
        const after = content.substring(end);
        const newContent = before + '```\n\n```' + after;
        setContent(newContent);
        editor.focus();
        editor.setSelectionRange(start + 4, start + 4);
      }
    },
    {
      id: 'quote',
      title: 'Quote',
      description: 'Insert a quote',
      icon: '"',
      action: (editor, start, end) => {
        const before = content.substring(0, start);
        const after = content.substring(end);
        const newContent = before + '> ' + after;
        setContent(newContent);
        editor.focus();
        editor.setSelectionRange(start + 2, start + 2);
      }
    },
    {
      id: 'divider',
      title: 'Divider',
      description: 'Insert a horizontal line',
      icon: '—',
      action: (editor, start, end) => {
        const before = content.substring(0, start);
        const after = content.substring(end);
        const newContent = before + '---\n' + after;
        setContent(newContent);
        editor.focus();
        editor.setSelectionRange(start + 4, start + 4);
      }
    }
  ];

  // Handle content changes and slash command detection
  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);

    const cursorPos = e.target.selectionStart;
    const lineStart = newContent.lastIndexOf('\n', cursorPos - 1) + 1;
    const lineContent = newContent.substring(lineStart, cursorPos);

    if (lineContent.startsWith('/')) {
      setShowSlashCommands(true);
      setSlashCommandIndex(0);
      setSlashCommandPosition({ start: lineStart, end: cursorPos });
    } else {
      setShowSlashCommands(false);
    }
  }, []);

  // Handle keyboard navigation for slash commands
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (showSlashCommands) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSlashCommandIndex(prev => (prev + 1) % slashCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSlashCommandIndex(prev => (prev - 1 + slashCommands.length) % slashCommands.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selectedCommand = slashCommands[slashCommandIndex];
        if (selectedCommand && editorRef.current) {
          selectedCommand.action(editorRef.current, slashCommandPosition.start, slashCommandPosition.end);
          setShowSlashCommands(false);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowSlashCommands(false);
      }
    }
  }, [showSlashCommands, slashCommandIndex, slashCommands, slashCommandPosition]);

  // Handle tag changes
  const handleTagChange = (selectedOptions: any) => {
    setTags(Array.isArray(selectedOptions) ? selectedOptions.map(option => option.value) : []);
  };

  // Handle save
  const handleSave = async () => {
    if (!content.trim() || isSaving) return;
    await onSave({ title: autoTitle, content, tags });
  };

  // Handle delete
  const handleDelete = async () => {
    if (!note?.id || !onDelete) return;
    
    if (confirm("Are you sure you want to delete this note?")) {
      try {
        await onDelete(note.id);
      } catch (error) {
        console.error("Error deleting note:", error);
        alert("Failed to delete note. Please try again.");
      }
    }
  };

  // Auto-save on content change (debounced)
  useEffect(() => {
    if (!isNewNote && content.trim()) {
      const timeoutId = setTimeout(() => {
        handleSave();
      }, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [content, tags, isNewNote]);

  // Focus editor on mount for new notes
  useEffect(() => {
    if (isNewNote && editorRef.current) {
      editorRef.current.focus();
    }
  }, [isNewNote]);

  const tagOptions = existingTags.map(tag => ({ value: tag, label: tag }));

  return (
    <div className="flex flex-col h-full">
      {/* Auto-generated title display */}
      <div className="mb-4 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg flex-shrink-0">
        <h1 className="text-xl md:text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          {autoTitle}
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Auto-generated from first line
        </p>
      </div>

      {/* Rich text editor with visual rendering */}
      <div className="flex-1 relative min-h-0">
        <div className="absolute inset-0 bg-transparent pointer-events-none z-10 overflow-y-auto">
          <div 
            className="w-full h-full p-4 text-base md:text-lg leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
          />
        </div>
        
        <textarea
          ref={editorRef}
          value={content}
          onChange={handleContentChange}
          onKeyDown={handleKeyDown}
          placeholder="Start typing or type / for commands..."
          className="w-full h-full p-4 text-base md:text-lg leading-relaxed resize-none border-0 focus:outline-none bg-transparent relative z-20 overflow-y-auto"
          disabled={isSaving}
          style={{ 
            fontSize: isMobile ? '16px' : '18px', // Prevent zoom on iOS
            color: 'transparent',
            caretColor: 'black',
            background: 'transparent'
          }}
        />
        
        {/* Slash commands dropdown */}
        {showSlashCommands && (
          <div
            ref={slashCommandsRef}
            className="absolute z-50 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg max-h-64 overflow-y-auto"
            style={{
              top: '50px',
              left: isMobile ? '8px' : '16px',
              right: isMobile ? '8px' : 'auto',
              maxWidth: isMobile ? 'calc(100vw - 16px)' : 'auto'
            }}
          >
            {slashCommands.map((command, index) => (
              <button
                key={command.id}
                className={`w-full px-3 md:px-4 py-2 md:py-3 text-left hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center gap-2 md:gap-3 ${
                  index === slashCommandIndex ? 'bg-neutral-100 dark:bg-neutral-700' : ''
                }`}
                onClick={() => {
                  if (editorRef.current) {
                    command.action(editorRef.current, slashCommandPosition.start, slashCommandPosition.end);
                    setShowSlashCommands(false);
                  }
                }}
              >
                <span className="w-6 h-6 md:w-8 md:h-8 flex items-center justify-center bg-neutral-200 dark:bg-neutral-600 rounded text-xs md:text-sm font-mono flex-shrink-0">
                  {command.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-neutral-900 dark:text-neutral-100 text-sm md:text-base truncate">
                    {command.title}
                  </div>
                  <div className="text-xs md:text-sm text-neutral-500 dark:text-neutral-400 truncate">
                    {command.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom toolbar */}
      <div className="border-t border-neutral-200 dark:border-neutral-700 p-3 md:p-4 bg-neutral-50 dark:bg-neutral-800 flex-shrink-0">
        <div className="flex flex-col gap-3 md:gap-4">
          {/* Tags */}
          <div className="flex-1 min-w-0">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Tags
            </label>
            <CreatableSelect
              isMulti
              options={tagOptions}
              value={tags.map(tag => ({ value: tag, label: tag }))}
              onChange={handleTagChange}
              isDisabled={isSaving}
              isSearchable
              placeholder="Add tags..."
              classNamePrefix="react-select"
              className="min-w-0"
              theme={(theme) => ({
                ...theme,
                colors: {
                  ...theme.colors,
                  primary: '#14B8A6',
                  primary25: '#99F6E4',
                },
              })}
              styles={{
                control: (base) => ({
                  ...base,
                  minHeight: '40px',
                  fontSize: '14px'
                }),
                menu: (base) => ({
                  ...base,
                  fontSize: '14px'
                })
              }}
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 flex-shrink-0">
            {note?.id && onDelete && (
              <button
                type="button"
                className="btn-secondary flex-1 md:flex-none"
                onClick={handleDelete}
                disabled={isSaving}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="hidden sm:inline">Delete</span>
              </button>
            )}
            <button
              type="button"
              className="btn-primary flex-1 md:flex-none"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="hidden sm:inline">Saving...</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="hidden sm:inline">Save</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}