// components/RichTextEditor.js
import React, { useState, useRef, useEffect } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.bubble.css";

// Quill modules configuration
const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ color: [] }, { background: [] }],
    [{ list: "ordered" }, { list: "bullet" }, { list: "check" }],
    [{ align: [] }],
    ["blockquote", "code-block"],
    ["link", "image"],
    ["clean"],
  ],
};

const quillFormats = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "color",
  "background",
  "list",
  "bullet",
  "check",
  "align",
  "blockquote",
  "code-block",
  "link",
  "image",
];

const RichTextEditor = ({ value, onChange, placeholder = "Write a detailed description...", height = 300 }) => {
  const [showPlainEditor, setShowPlainEditor] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [selectionRange, setSelectionRange] = useState(null);
  const [plainTextValue, setPlainTextValue] = useState("");
  
  const plainTextareaRef = useRef(null);
  const editorRef = useRef(null);

  // Convert HTML to plain text when switching to plain editor
  useEffect(() => {
    if (showPlainEditor && value) {
      const convertedText = convertHtmlToPlain(value);
      setPlainTextValue(convertedText);
    }
  }, [showPlainEditor, value]);

  // Convert HTML to plain text with markdown-style formatting
  const convertHtmlToPlain = (html) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    
    let text = div.textContent || div.innerText || '';
    
    // Convert back markdown-style formatting
    text = text
      .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
      .replace(/<em>(.*?)<\/em>/g, '*$1*')
      .replace(/<del>(.*?)<\/del>/g, '~~$1~~')
      .replace(/<code>(.*?)<\/code>/g, '`$1`')
      .replace(/<a href="(.*?)".*?>(.*?)<\/a>/g, '[$2]($1)')
      .replace(/<h1>(.*?)<\/h1>/g, '# $1\n')
      .replace(/<h2>(.*?)<\/h2>/g, '## $1\n')
      .replace(/<h3>(.*?)<\/h3>/g, '### $1\n')
      .replace(/<li>(.*?)<\/li>/g, '• $1\n')
      .replace(/<br\/>/g, '\n');
    
    return text;
  };

  // Convert plain text to HTML
  const convertPlainToHtml = (text) => {
    let html = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/~~(.*?)~~/g, '<del>$1</del>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>')
      .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
      .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
      .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
      .replace(/^• (.*?)$/gm, '<li>$1</li>')
      .replace(/\n/g, '<br/>');
    
    return html;
  };

  // Handle text selection in plain textarea
  const handleTextSelection = () => {
    const textarea = plainTextareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = plainTextValue.substring(start, end);
    
    if (selected && selected.trim().length > 0) {
      setSelectedText(selected);
      setSelectionRange({ start, end });
      
      // Position the editor near the selection
      setTimeout(() => {
        const rect = textarea.getBoundingClientRect();
        const selectionRect = getSelectionRect();
        if (selectionRect) {
          const editorElement = document.querySelector('.floating-editor');
          if (editorElement) {
            editorElement.style.top = `${selectionRect.bottom + window.scrollY + 10}px`;
            editorElement.style.left = `${selectionRect.left + window.scrollX}px`;
          }
        }
      }, 10);
    } else {
      setSelectedText("");
      setSelectionRange(null);
    }
  };

  // Get the position of the selected text
  const getSelectionRect = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      return rect;
    }
    return null;
  };

  // Apply formatting to selected text
  const applyFormatting = (format, formatValue = null) => {
    if (!selectionRange) return;
    
    const { start, end } = selectionRange;
    const selected = plainTextValue.substring(start, end);
    
    if (!selected) return;
    
    let formattedText = selected;
    
    switch(format) {
      case 'bold':
        formattedText = `**${selected}**`;
        break;
      case 'italic':
        formattedText = `*${selected}*`;
        break;
      case 'underline':
        formattedText = `<u>${selected}</u>`;
        break;
      case 'strike':
        formattedText = `~~${selected}~~`;
        break;
      case 'h1':
        formattedText = `# ${selected}`;
        break;
      case 'h2':
        formattedText = `## ${selected}`;
        break;
      case 'h3':
        formattedText = `### ${selected}`;
        break;
      case 'link':
        const url = prompt('Enter URL:', 'https://');
        if (url) {
          formattedText = `[${selected}](${url})`;
        } else {
          return;
        }
        break;
      case 'list':
        formattedText = `• ${selected}`;
        break;
      case 'code':
        formattedText = `\`${selected}\``;
        break;
      default:
        return;
    }
    
    const newText = plainTextValue.substring(0, start) + formattedText + plainTextValue.substring(end);
    setPlainTextValue(newText);
    setSelectedText("");
    setSelectionRange(null);
    
    // Focus back on textarea
    setTimeout(() => {
      if (plainTextareaRef.current) {
        plainTextareaRef.current.focus();
        const newEnd = start + formattedText.length;
        plainTextareaRef.current.setSelectionRange(newEnd, newEnd);
      }
    }, 10);
  };

  // Handle plain text change
  const handlePlainTextChange = (e) => {
    const newValue = e.target.value;
    setPlainTextValue(newValue);
  };

  // Save plain text and convert to HTML
  const savePlainTextAndSwitch = () => {
    const htmlContent = convertPlainToHtml(plainTextValue);
    onChange(htmlContent);
    setShowPlainEditor(false);
  };

  // Cancel plain text editing
  const cancelPlainText = () => {
    setPlainTextValue(convertHtmlToPlain(value));
    setShowPlainEditor(false);
  };

  // Close floating editor when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectedText && editorRef.current && !editorRef.current.contains(event.target)) {
        setSelectedText("");
        setSelectionRange(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedText]);

  return (
    <div className="rich-text-editor-wrapper">
     
     
        <div className="rich-text-editor" id="rich-text-wrapper">
          <ReactQuill
            theme="bubble"
            bounds="#rich-text-wrapper"
            value={value}
            onChange={onChange}
            modules={quillModules}
            formats={quillFormats}
            placeholder={placeholder}
            style={{ height: `${height}px` }}
            className="quill-editor-bubble"
          />
        </div>
   
    </div>
  );
};

export default RichTextEditor;