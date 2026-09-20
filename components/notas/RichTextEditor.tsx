"use client"

import { useRef, useState, type ComponentType } from "react"
import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor,
} from "@tiptap/react"
import { StarterKit } from "@tiptap/starter-kit"
import { Placeholder } from "@tiptap/extensions"
import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconBlockquote,
  IconBold,
  IconCheck,
  IconCode,
  IconH1,
  IconH2,
  IconItalic,
  IconLink,
  IconLinkOff,
  IconList,
  IconListNumbers,
  IconStrikethrough,
  IconUnderline,
} from "@tabler/icons-react"
import { clsx } from "clsx"
import { toEditorHtml } from "@/lib/html"

interface ToolbarAction {
  label: string
  icon: ComponentType<{ size?: number | string; stroke?: number }>
  isActive: (editor: Editor) => boolean
  run: (editor: Editor) => void
}

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  {
    label: "Negrita",
    icon: IconBold,
    isActive: (editor) => editor.isActive("bold"),
    run: (editor) => editor.chain().focus().toggleBold().run(),
  },
  {
    label: "Cursiva",
    icon: IconItalic,
    isActive: (editor) => editor.isActive("italic"),
    run: (editor) => editor.chain().focus().toggleItalic().run(),
  },
  {
    label: "Subrayado",
    icon: IconUnderline,
    isActive: (editor) => editor.isActive("underline"),
    run: (editor) => editor.chain().focus().toggleUnderline().run(),
  },
  {
    label: "Tachado",
    icon: IconStrikethrough,
    isActive: (editor) => editor.isActive("strike"),
    run: (editor) => editor.chain().focus().toggleStrike().run(),
  },
  {
    label: "Título",
    icon: IconH1,
    isActive: (editor) => editor.isActive("heading", { level: 1 }),
    run: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    label: "Subtítulo",
    icon: IconH2,
    isActive: (editor) => editor.isActive("heading", { level: 2 }),
    run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    label: "Lista",
    icon: IconList,
    isActive: (editor) => editor.isActive("bulletList"),
    run: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    label: "Lista numerada",
    icon: IconListNumbers,
    isActive: (editor) => editor.isActive("orderedList"),
    run: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    label: "Cita",
    icon: IconBlockquote,
    isActive: (editor) => editor.isActive("blockquote"),
    run: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    label: "Código",
    icon: IconCode,
    isActive: (editor) => editor.isActive("code"),
    run: (editor) => editor.chain().focus().toggleCode().run(),
  },
]

interface EditorToolbarState {
  activeLabels: Set<string>
  isLinkActive: boolean
  canUndo: boolean
  canRedo: boolean
}

function useToolbarState(editor: Editor | null): EditorToolbarState | null {
  return useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      activeLabels: new Set(
        e
          ? TOOLBAR_ACTIONS.filter((a) => a.isActive(e)).map((a) => a.label)
          : [],
      ),
      isLinkActive: e?.isActive("link") ?? false,
      canUndo: e?.can().undo() ?? false,
      canRedo: e?.can().redo() ?? false,
    }),
  })
}

function ToolbarButton({
  action,
  editor,
  isActive,
}: {
  action: ToolbarAction
  editor: Editor
  isActive: boolean
}) {
  const IconCmp = action.icon

  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={action.label}
      title={action.label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => action.run(editor)}
      className={clsx(
        "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
        isActive
          ? "bg-primary/15 text-primary"
          : "text-text/60 hover:bg-black/5 hover:text-text",
      )}
    >
      <IconCmp size={16} />
    </button>
  )
}

interface RichTextEditorProps {
  /** HTML or legacy plain text. */
  content: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
  /** Content CSS classes, e.g. min height. */
  contentClassName?: string
}

export function RichTextEditor({
  content,
  onChange,
  placeholder,
  className,
  contentClassName,
}: RichTextEditorProps) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState("")
  const linkInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    // SSR'd client component: render the editor on mount to avoid hydration
    // mismatches (explicit to silence the Tiptap default warning).
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({
        placeholder: placeholder ?? "Escribe algo…",
      }),
    ],
    content: toEditorHtml(content),
    editorProps: {
      attributes: {
        class: clsx(
          "richtext-content px-3 py-2 font-sans text-base focus:outline-none",
          contentClassName,
        ),
      },
    },
    onUpdate: ({ editor }) => onChangeRef.current(editor.getHTML()),
  })

  const toolbarState = useToolbarState(editor) ?? {
    activeLabels: new Set<string>(),
    isLinkActive: false,
    canUndo: false,
    canRedo: false,
  }
  const { activeLabels, isLinkActive, canUndo, canRedo } = toolbarState

  if (!editor) return null

  function openLinkPopover() {
    const href = editor?.getAttributes("link").href
    setLinkUrl(typeof href === "string" ? href : "")
    setIsLinkPopoverOpen(true)
    // Focus the input after it mounts (avoids the autoFocus attribute).
    requestAnimationFrame(() => linkInputRef.current?.select())
  }

  function applyLink() {
    if (!editor) return
    const url = linkUrl.trim()
    if (!url) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run()
      setIsLinkPopoverOpen(false)
      return
    }
    const normalized = /^(https?:\/\/|mailto:)/i.test(url)
      ? url
      : `https://${url}`
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: normalized })
      .run()
    setIsLinkPopoverOpen(false)
  }

  function removeLink() {
    editor?.chain().focus().extendMarkRange("link").unsetLink().run()
    setIsLinkPopoverOpen(false)
  }

  return (
    <div
      className={clsx(
        "overflow-hidden rounded-md border-2 border-black bg-white transition-colors focus-within:border-primary",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-0.5 border-b border-black/10 px-1.5 py-1">
        <button
          type="button"
          tabIndex={-1}
          aria-label="Deshacer"
          title="Deshacer"
          disabled={!canUndo}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => editor.chain().focus().undo().run()}
          className="flex h-7 w-7 items-center justify-center rounded-md text-text/60 transition-colors hover:bg-black/5 hover:text-text disabled:opacity-30"
        >
          <IconArrowBackUp size={16} />
        </button>
        <button
          type="button"
          tabIndex={-1}
          aria-label="Rehacer"
          title="Rehacer"
          disabled={!canRedo}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => editor.chain().focus().redo().run()}
          className="flex h-7 w-7 items-center justify-center rounded-md text-text/60 transition-colors hover:bg-black/5 hover:text-text disabled:opacity-30"
        >
          <IconArrowForwardUp size={16} />
        </button>
        <span className="mx-1 h-5 w-px bg-black/10" />
        {TOOLBAR_ACTIONS.map((action) => (
          <ToolbarButton
            key={action.label}
            action={action}
            editor={editor}
            isActive={activeLabels.has(action.label)}
          />
        ))}
        <span className="mx-1 h-5 w-px bg-black/10" />
        <button
          type="button"
          tabIndex={-1}
          aria-label="Enlace"
          title="Enlace"
          onMouseDown={(event) => event.preventDefault()}
          onClick={
            isLinkPopoverOpen
              ? () => setIsLinkPopoverOpen(false)
              : openLinkPopover
          }
          className={clsx(
            "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
            isLinkActive || isLinkPopoverOpen
              ? "bg-primary/15 text-primary"
              : "text-text/60 hover:bg-black/5 hover:text-text",
          )}
        >
          <IconLink size={16} />
        </button>
        {isLinkActive && (
          <button
            type="button"
            tabIndex={-1}
            aria-label="Quitar enlace"
            title="Quitar enlace"
            onMouseDown={(event) => event.preventDefault()}
            onClick={removeLink}
            className="flex h-7 w-7 items-center justify-center rounded-md text-text/60 transition-colors hover:bg-black/5 hover:text-text"
          >
            <IconLinkOff size={16} />
          </button>
        )}
      </div>
      {isLinkPopoverOpen && (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            applyLink()
          }}
          className="flex items-center gap-2 border-b border-black/10 bg-black/[0.03] px-2 py-1.5"
        >
          <input
            ref={linkInputRef}
            type="text"
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
            placeholder="https://…"
            className="h-7 flex-1 rounded-md border border-black/15 bg-white px-2 font-sans text-sm focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            aria-label="Aplicar enlace"
            title="Aplicar enlace"
            onMouseDown={(event) => event.preventDefault()}
            className="flex h-7 w-7 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10"
          >
            <IconCheck size={16} />
          </button>
          {isLinkActive && (
            <button
              type="button"
              aria-label="Quitar enlace"
              title="Quitar enlace"
              onMouseDown={(event) => event.preventDefault()}
              onClick={removeLink}
              className="flex h-7 w-7 items-center justify-center rounded-md text-danger transition-colors hover:bg-danger/10"
            >
              <IconLinkOff size={16} />
            </button>
          )}
        </form>
      )}
      <EditorContent editor={editor} />
    </div>
  )
}
