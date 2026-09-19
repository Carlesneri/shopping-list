"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { toast } from "sonner"
import { ShortcutCard } from "./ShortcutCard"
import { reorderShortcuts } from "@/lib/actions/shortcuts"
import type { Shortcut } from "@/lib/types"

function shortcutHref(shortcut: Shortcut) {
  if (shortcut.type === "list") return `/compras/${shortcut.targetId}`
  if (shortcut.type === "nota") return `/notas/${shortcut.targetId}`
  return `/media/${shortcut.targetId}`
}

function SortableShortcut({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "relative z-10" : undefined}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  )
}

export function ShortcutsGrid({ shortcuts }: { shortcuts: Shortcut[] }) {
  const [items, setItems] = useState(shortcuts)
  // Resync when the server data changes (add/remove shortcut, revalidate…).
  useEffect(() => setItems(shortcuts), [shortcuts])

  // Set when a real drag ends; the next click (which fires after pointerup)
  // is cancelled so the shortcut link doesn't navigate after a drag.
  const draggedRef = useRef(false)

  const sensors = useSensors(
    // Mouse: small movement threshold so plain clicks don't start a drag.
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Touch: long-press to drag, so scrolling the page by touching a card
    // keeps working (PointerSensor would need touch-action: none).
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  function handleDragEnd({ active, over }: DragEndEvent) {
    // A real drag happened, even if it landed on the same spot: cancel the
    // click that follows so the shortcut link doesn't navigate.
    draggedRef.current = true
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((s) => s.id === active.id)
    const newIndex = items.findIndex((s) => s.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const next = arrayMove(items, oldIndex, newIndex)
    setItems(next)
    draggedRef.current = true
    reorderShortcuts(next.map((s) => s.id)).catch(() => {
      setItems(shortcuts)
      toast.error("No se pudo guardar el orden")
    })
  }

  return (
    <div
      onClickCapture={(event) => {
        if (draggedRef.current) {
          event.preventDefault()
          draggedRef.current = false
        }
      }}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((s) => s.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {items.map((shortcut) => (
              <SortableShortcut key={shortcut.id} id={shortcut.id}>
                <ShortcutCard
                  title={shortcut.title}
                  iconName={shortcut.icon}
                  href={shortcutHref(shortcut)}
                  shortcutId={shortcut.id}
                  type={shortcut.type}
                />
              </SortableShortcut>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
