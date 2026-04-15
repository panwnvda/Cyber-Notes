import React, { useRef, useState } from 'react';
import { GripVertical, X, Pencil } from 'lucide-react';
import TechniqueCard from './TechniqueCard';

/**
 * A drag-and-drop list of TechniqueCards.
 * Built-in cards are shown with no delete button (non-destructive).
 * Custom cards have a delete button.
 */
export default function DraggableCardList({ cards, onDelete, onReorder, onEdit }) {
  const dragIndex = useRef(null);
  const [dragOver, setDragOver] = useState(null);

  const handleDragStart = (e, i) => {
    dragIndex.current = i;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, i) => {
    e.preventDefault();
    setDragOver(i);
  };

  const handleDrop = (e, i) => {
    e.preventDefault();
    if (dragIndex.current !== null && dragIndex.current !== i) {
      onReorder(dragIndex.current, i);
    }
    dragIndex.current = null;
    setDragOver(null);
  };

  const handleDragEnd = () => {
    dragIndex.current = null;
    setDragOver(null);
  };

  return (
    <div className="grid grid-cols-1 gap-3">
      {cards.map((card, i) => (
        <div
          key={card.id}
          draggable
          onDragStart={(e) => handleDragStart(e, i)}
          onDragOver={(e) => handleDragOver(e, i)}
          onDrop={(e) => handleDrop(e, i)}
          onDragEnd={handleDragEnd}
          className={`relative group transition-all ${dragOver === i ? 'opacity-50 scale-[0.99]' : ''}`}
          id={card.id}
        >
          {/* Right side controls: drag handle + edit + delete stacked */}
          <div className="absolute top-3 right-3 flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <div className="cursor-grab p-1" title="Drag to reorder">
              <GripVertical className="w-4 h-4 text-slate-600" />
            </div>
            {onEdit && (
              <button
                onClick={() => onEdit(card)}
                className="text-slate-600 hover:text-cyan-400 transition-colors p-1"
                title="Edit card"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => onDelete(card.id)}
              className="text-slate-700 hover:text-red-400 transition-colors p-1"
              title="Delete card"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="pr-8">
            <TechniqueCard
              title={card.title}
              subtitle={card.subtitle}
              tags={card.tags}
              accentColor={card.accentColor}
              overview={card.overview}
              steps={card.steps}
              commands={card.commands}
              subsections={card.subsections}
            />
          </div>
        </div>
      ))}
    </div>
  );
}