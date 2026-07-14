"use client";

import { useEffect, useRef } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  RemoveFormatting,
  type LucideIcon,
} from "lucide-react";

const COMMANDS: { icon: LucideIcon; command: string; title: string }[] = [
  { icon: Bold, command: "bold", title: "Bold" },
  { icon: Italic, command: "italic", title: "Italic" },
  { icon: Underline, command: "underline", title: "Underline" },
  { icon: Strikethrough, command: "strikeThrough", title: "Strikethrough" },
  { icon: List, command: "insertUnorderedList", title: "Bullet list" },
  { icon: ListOrdered, command: "insertOrderedList", title: "Numbered list" },
  { icon: AlignLeft, command: "justifyLeft", title: "Align left" },
  { icon: AlignCenter, command: "justifyCenter", title: "Align center" },
  { icon: AlignRight, command: "justifyRight", title: "Align right" },
  { icon: RemoveFormatting, command: "removeFormat", title: "Clear formatting" },
];

/**
 * Small contentEditable rich-text editor for HTML snippets (e.g. print footer
 * content). Emits the current HTML via `onChange`; safe for uncontrolled-ish
 * usage — the DOM is only overwritten when `value` changes externally.
 */
export function RichTextEditor({
  value,
  onChange,
  disabled = false,
  placeholder,
  minHeightClassName = "min-h-32",
}: {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  placeholder?: string;
  minHeightClassName?: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = editorRef.current;
    if (el && el.innerHTML !== value) el.innerHTML = value;
  }, [value]);

  function exec(command: string) {
    if (disabled) return;
    editorRef.current?.focus();
    document.execCommand(command);
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  }

  return (
    <div className="rounded-md border border-gray-200 bg-white">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-100 bg-gray-50 px-1.5 py-1 rounded-t-md">
        {COMMANDS.map(({ icon: Icon, command, title }) => (
          <button
            key={command}
            type="button"
            title={title}
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec(command)}
            className="flex h-7 w-7 items-center justify-center rounded text-gray-600 hover:bg-gray-200 hover:text-gray-900 disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        ))}
      </div>
      <div
        ref={editorRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
        className={`${minHeightClassName} px-3 py-2 text-sm text-gray-800 outline-none focus:ring-0 [&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-gray-400 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 ${
          disabled ? "bg-gray-50 text-gray-400" : ""
        }`}
      />
    </div>
  );
}
