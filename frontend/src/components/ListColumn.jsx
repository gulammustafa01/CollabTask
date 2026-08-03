import { useState } from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import CardItem from "./CardItem.jsx";

export default function ListColumn({ list, index, cards, canEdit, onOpenCard, onAddCard, onDeleteList, draggingUsers }) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAddCard(list._id, title.trim());
    setTitle("");
    setAdding(false);
  };

  return (
    <Draggable draggableId={`list-${list._id}`} index={index} isDragDisabled={!canEdit}>
      {(listProvided, listSnapshot) => (
        <div
          ref={listProvided.innerRef}
          {...listProvided.draggableProps}
          className={`w-72 shrink-0 bg-panel border border-border rounded-xl flex flex-col max-h-full ${
            listSnapshot.isDragging ? "shadow-lg ring-2 ring-accent" : ""
          }`}
        >
          <div
            {...listProvided.dragHandleProps}
            className={`flex items-center justify-between px-3 py-3 border-b border-border ${canEdit ? "cursor-grab active:cursor-grabbing" : ""}`}
          >
            <h3 className="font-display font-medium text-sm text-text">
              {list.title} <span className="font-data text-muted">({cards.length})</span>
            </h3>
            {canEdit && (
              <button onClick={() => onDeleteList(list._id)} className="text-muted hover:text-urgent text-xs">
                ✕
              </button>
            )}
          </div>

          <Droppable droppableId={list._id} type="CARD">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`flex-1 overflow-y-auto p-2 min-h-[40px] transition ${
                  snapshot.isDraggingOver ? "bg-accent/5" : ""
                }`}
              >
                {cards.map((card, idx) => (
                  <CardItem key={card._id} card={card} index={idx} canEdit={canEdit} onOpen={onOpenCard} draggingUsers={draggingUsers} />
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>

          {canEdit && (
            <div className="p-2 border-t border-border">
              {adding ? (
                <form onSubmit={submit} className="space-y-2">
                  <input
                    autoFocus
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={() => !title && setAdding(false)}
                    placeholder="Card title…"
                    className="w-full bg-panel2 border border-border rounded-lg px-2 py-1.5 text-sm outline-none focus:border-accent"
                  />
                  <div className="flex gap-2">
                    <button className="text-xs bg-accent hover:bg-accent2 text-white rounded px-3 py-1">Add</button>
                    <button type="button" onClick={() => setAdding(false)} className="text-xs text-muted">
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button onClick={() => setAdding(true)} className="text-sm text-muted hover:text-text w-full text-left">
                  + Add a card
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}
