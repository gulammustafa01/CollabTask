import { formatDistanceToNow } from "date-fns";

export default function ActivityFeed({ logs }) {
  return (
    <div className="space-y-3">
      {logs.length === 0 && <p className="text-sm text-muted">No activity yet.</p>}
      {logs.map((log) => (
        <div key={log._id} className="flex gap-2 text-sm">
          <div
            className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[10px] mt-0.5"
            style={{ background: log.user?.avatarColor }}
          >
            {log.user?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-text">{log.message}</p>
            <p className="text-[11px] text-muted">{formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
