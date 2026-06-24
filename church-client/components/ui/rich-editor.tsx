"use client";

import React, { useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Paragraph from "@tiptap/extension-paragraph";
import Heading from "@tiptap/extension-heading";
import Blockquote from "@tiptap/extension-blockquote";
import BulletList from "@tiptap/extension-bullet-list";
import ListItem from "@tiptap/extension-list-item";
import TextAlign from "@tiptap/extension-text-align";
import { Node } from "@tiptap/core";
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  AlignJustify as AlignJustifyIcon,
  Code as CodeIcon,
  Quote as QuoteIcon,
  Flame as FlameIcon,
  HelpCircle as HelpCircleIcon,
  AlignLeft as AlignLeftIcon,
  WrapText as WrapTextIcon,
  Eye as EyeIcon,
  Loader2
} from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

// --- Custom Nodes to Preserve Tailwind Utility Classes ---

const CustomParagraph = Paragraph.extend({
  addAttributes() {
    return {
      class: {
        default: null,
        parseHTML: (element) => element.getAttribute("class"),
        renderHTML: (attributes) => {
          if (!attributes.class) return {};
          return { class: attributes.class };
        }
      }
    };
  }
});

const CustomHeading = Heading.extend({
  addAttributes() {
    return {
      class: {
        default: null,
        parseHTML: (element) => element.getAttribute("class"),
        renderHTML: (attributes) => {
          if (!attributes.class) return {};
          return { class: attributes.class };
        }
      }
    };
  }
});

const CustomBlockquote = Blockquote.extend({
  addAttributes() {
    return {
      class: {
        default: null,
        parseHTML: (element) => element.getAttribute("class"),
        renderHTML: (attributes) => {
          if (!attributes.class) return {};
          return { class: attributes.class };
        }
      }
    };
  }
});

const CustomBulletList = BulletList.extend({
  addAttributes() {
    return {
      class: {
        default: null,
        parseHTML: (element) => element.getAttribute("class"),
        renderHTML: (attributes) => {
          if (!attributes.class) return {};
          return { class: attributes.class };
        }
      }
    };
  }
});

const CustomListItem = ListItem.extend({
  addAttributes() {
    return {
      class: {
        default: null,
        parseHTML: (element) => element.getAttribute("class"),
        renderHTML: (attributes) => {
          if (!attributes.class) return {};
          return { class: attributes.class };
        }
      }
    };
  }
});

const DivNode = Node.create({
  name: "div",
  group: "block",
  content: "block*",
  defining: true,
  draggable: true,

  addAttributes() {
    return {
      class: {
        default: null,
        parseHTML: (element) => element.getAttribute("class"),
        renderHTML: (attributes) => {
          if (!attributes.class) return {};
          return { class: attributes.class };
        }
      }
    };
  },

  parseHTML() {
    return [{ tag: "div" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", HTMLAttributes, 0];
  }
});

// --- RichEditor Component ---

type RichEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

export function RichEditor({ value, onChange }: RichEditorProps) {
  const [isCodeMode, setIsCodeMode] = useState(false);
  const [codeValue, setCodeValue] = useState(value);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        paragraph: false,
        heading: false,
        blockquote: false,
        bulletList: false,
        listItem: false
      }),
      CustomParagraph,
      CustomHeading,
      CustomBlockquote,
      CustomBulletList,
      CustomListItem,
      DivNode,
      TextAlign.configure({
        types: ["heading", "paragraph"],
        alignments: ["left", "center", "right", "justify"],
        defaultAlignment: "left"
      })
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          "prose prose-indigo max-h-[500px] overflow-y-auto focus:outline-none p-4 min-h-[300px] bg-[#faf8f4] rounded-xl border border-[rgba(40,25,80,0.12)] text-indigo"
      }
    },
    onUpdate({ editor }) {
      const html = editor.getHTML();
      setCodeValue(html);
      onChange(html);
    }
  });

  // Sync editor when value prop changes externally (e.g. form load/reset).
  // The `value !== editor.getHTML()` guard makes this self-terminating: once the
  // editor matches the prop the effect no-ops, so it cannot cascade. The
  // setCodeValue keeps the code-view textarea mirror in sync with that change.
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCodeValue(value);
    }
  }, [value, editor]);

  // Toggle modes
  const handleToggleMode = () => {
    if (isCodeMode) {
      setIsCodeMode(false);
      editor?.commands.setContent(codeValue);
    } else {
      setIsCodeMode(true);
      setCodeValue(editor?.getHTML() || "");
    }
  };

  // Textarea change handler (code mode)
  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCodeValue(val);
    onChange(val);
  };

  if (!editor) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-[rgba(40,25,80,0.1)] bg-[#faf8f4]">
        <Loader2 className="size-6 animate-spin text-gold-dark" />
      </div>
    );
  }

  // Inject macros helpers
  const injectBlockquote = () => {
    editor
      .chain()
      .focus()
      .insertContent(
        `<blockquote class="border-l-4 border-gold-dark bg-indigo-mid/[0.04] p-4 rounded-r-xl italic text-indigo font-display text-left">« Verset — ... »</blockquote>`
      )
      .run();
  };

  const injectPrayerPoint = () => {
    editor
      .chain()
      .focus()
      .insertContent(
        `<div class="rounded-2xl border border-red-500/20 bg-ink p-5 text-center shadow-lg relative overflow-hidden my-4"><div class="absolute top-2 left-2 flex items-center gap-1 text-[10px] font-bold tracking-wider text-red-400 uppercase">Point de prière</div><p class="mt-2 font-display text-base md:text-lg font-bold italic text-white leading-relaxed">« Prière... »</p></div>`
      )
      .run();
  };

  const injectQuestionsBlock = () => {
    editor
      .chain()
      .focus()
      .insertContent(
        `<div class="my-6 rounded-xl border border-indigo-mid/10 bg-indigo-mid/[0.02] p-5 space-y-3"><p class="flex items-center gap-2 font-semibold text-indigo">Bien-aimés, posez-vous ces questions :</p><ul class="list-disc pl-5 space-y-2 text-justify text-sm"><li>Question...</li></ul></div>`
      )
      .run();
  };

  const injectAlignedSubcontainer = () => {
    editor
      .chain()
      .focus()
      .insertContent(
        `<div class="space-y-4 pl-4 border-l-2 border-white/60"><p class="text-justify">...</p></div>`
      )
      .run();
  };

  return (
    <div className="flex flex-col rounded-2xl border border-[rgba(40,25,80,0.12)] bg-white overflow-hidden shadow-sm">
      {/* Editor Sticky Toolbar */}
      <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-[rgba(40,25,80,0.08)] p-2 flex flex-wrap gap-1 items-center justify-between z-10 select-none">
        
        {/* Left Side: Standard format formatting */}
        <div className="flex flex-wrap gap-1 items-center">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn(editor.isActive("bold") && "bg-indigo-mid/10 text-indigo font-bold")}
            title="Gras"
          >
            <BoldIcon className="size-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={cn(editor.isActive("italic") && "bg-indigo-mid/10 text-indigo font-bold")}
            title="Italique"
          >
            <ItalicIcon className="size-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={cn(editor.isActive("heading", { level: 2 }) && "bg-indigo-mid/10 text-indigo font-bold")}
            title="Titre 2"
          >
            <span className="font-extrabold text-xs">H2</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={cn(editor.isActive("heading", { level: 3 }) && "bg-indigo-mid/10 text-indigo font-bold")}
            title="Titre 3"
          >
            <span className="font-extrabold text-xs">H3</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => editor.chain().focus().setTextAlign("justify").run()}
            className={cn(editor.isActive({ textAlign: "justify" }) && "bg-indigo-mid/10 text-indigo font-bold")}
            title="Justifier"
          >
            <AlignJustifyIcon className="size-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            className={cn(editor.isActive({ textAlign: "left" }) && "bg-indigo-mid/10 text-indigo font-bold")}
            title="Aligner à gauche"
          >
            <AlignLeftIcon className="size-4" />
          </Button>
        </div>

        {/* Center: Prophétiques Macros */}
        {!isCodeMode && (
          <div className="flex items-center gap-1.5 border-l border-r px-3 border-[rgba(40,25,80,0.08)]">
            <button
              type="button"
              onClick={injectBlockquote}
              className="inline-flex items-center justify-center gap-1 text-[11px] font-bold text-gold-dark hover:text-gold border border-gold/20 hover:bg-gold/5 rounded-lg px-2.5 py-1 transition"
              title="Insérer Bloc Verset (Blockquote Or)"
            >
              <QuoteIcon className="size-3" /> Blockquote
            </button>

            <button
              type="button"
              onClick={injectPrayerPoint}
              className="inline-flex items-center justify-center gap-1 text-[11px] font-bold text-red-500 hover:text-red-600 border border-red-500/20 hover:bg-red-500/5 rounded-lg px-2.5 py-1 transition"
              title="Insérer Point de Prière MFM"
            >
              <FlameIcon className="size-3" /> Prière
            </button>

            <button
              type="button"
              onClick={injectQuestionsBlock}
              className="inline-flex items-center justify-center gap-1 text-[11px] font-bold text-indigo hover:text-indigo-mid border border-indigo-mid/20 hover:bg-indigo-mid/5 rounded-lg px-2.5 py-1 transition"
              title="Insérer Bloc Questions-Réflexions"
            >
              <HelpCircleIcon className="size-3" /> Questions
            </button>

            <button
              type="button"
              onClick={injectAlignedSubcontainer}
              className="inline-flex items-center justify-center gap-1 text-[11px] font-bold text-body hover:text-body-strong border border-faint/20 hover:bg-faint/5 rounded-lg px-2.5 py-1 transition"
              title="Insérer Sous-Conteneur Aligné"
            >
              <WrapTextIcon className="size-3" /> Exégèse
            </button>
          </div>
        )}

        {/* Right Side: Source Code mode toggle */}
        <div>
          <button
            type="button"
            onClick={handleToggleMode}
            className={cn(
              "inline-flex items-center justify-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg border transition select-none",
              isCodeMode
                ? "bg-indigo text-white border-indigo hover:bg-indigo-mid"
                : "bg-white text-indigo border-[rgba(40,25,80,0.12)] hover:bg-indigo-mid/5"
            )}
            title={isCodeMode ? "Retour au Rendu Visuel" : "Voir le Code Source HTML"}
          >
            {isCodeMode ? (
              <>
                <EyeIcon className="size-3.5" /> Visuel
              </>
            ) : (
              <>
                <CodeIcon className="size-3.5" /> Code Source
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="relative flex-1">
        {isCodeMode ? (
          <textarea
            value={codeValue}
            onChange={handleCodeChange}
            placeholder="Saisissez du code HTML..."
            rows={15}
            className="w-full font-mono text-xs p-4 bg-[#1a1527] text-[#ebe7f5] border-0 focus:ring-0 focus:outline-none min-h-[300px] resize-y block leading-relaxed"
          />
        ) : (
          <EditorContent editor={editor} />
        )}
      </div>
    </div>
  );
}
