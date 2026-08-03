import { Draggable } from "@hello-pangea/dnd";
import { isPast, isToday, isTomorrow, format } from "date-fns";

const RAIL_COLOR = {
  low: "border-l-low",
  medium: "border-l-medium",
  high: "border-l-high",
  urgent: "border-l-urgent",
};

const PRIORITY_TEXT = {
  low: "text-low",
  medium: "text-medium",
  high: "text-high",
  urgent: "text-urgent",
};

function dueBadge(dueDate) {
  if (!dueDate) return null;
  const d = new Date(dueDate);
  if (isPast(d) && !isToday(d)) return { label: `Overdue · ${format(d, "MMM d")}`, tone: "text-urgent" };
  if (isToday(d)) return { label: "Due today", tone: "text-high" };
  if (isTomorrow(d)) return { label: "Due tomorrow", tone: "text-muted" };
  return { label: `Due ${format(d, "MMM d")}`, tone: "text-muted" };
}

export default function CardItem({ card, index, canEdit, onOpen, draggingUsers }) {
  const draggerName = draggingUsers?.[card._id];
  const due = dueBadge(card.dueDate);

  return (
    <Draggable draggableId={card._id} index={index} isDragDisabled={!canEdit}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onOpen(card)}
          className={`bg-panel2 border border-border border-l-[3px] ${RAIL_COLOR[card.priority]} rounded-lg p-3 mb-2 cursor-pointer hover:border-accent/60 transition ${
            snapshot.isDragging ? "shadow-lg ring-2 ring-accent" : ""
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-text leading-snug">{card.title}</p>
            {card.aiSuggested && <span title="AI-suggested priority">✨</span>}
          </div>

          <div className="flex items-center justify-between mt-2">
            <span className={`font-data text-[10px] uppercase tracking-wide ${PRIORITY_TEXT[card.priority]}`}>
              {card.priority}
            </span>
            {card.assignees?.length > 0 && (
              <div className="flex -space-x-1.5">
                {card.assignees.slice(0, 3).map((a) => (
                  <div
                    key={a._id}
                    className="w-5 h-5 rounded-full border border-panel2 flex items-center justify-center text-[9px]"
                    style={{ background: a.avatarColor }}
                    title={a.name}
                  >
                    {a.name?.[0]?.toUpperCase()}
                  </div>
                ))}
              </div>
            )}
          </div>

          {due && <p className={`font-data text-[10px] mt-1.5 ${due.tone}`}>{due.label}</p>}

          {draggerName && (
            <p className="text-[10px] text-accent mt-1 animate-pulse">{draggerName} is moving this…</p>
          )}
        </div>
      )}
    </Draggable>
  );
}
