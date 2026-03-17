import { useState } from "react";
import { ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react";

interface CalendarMeeting {
  id: string;
  title: string;
  scheduledAt: any; // Firestore Timestamp
  status: string;
  department?: string;
  venue?: string;
}

interface MeetingCalendarProps {
  meetings: CalendarMeeting[];
  onMeetingClick?: (meeting: CalendarMeeting) => void;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const MeetingCalendar = ({ meetings, onMeetingClick }: MeetingCalendarProps) => {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Build a map: "YYYY-MM-DD" -> { upcoming: Meeting[], completed: Meeting[] }
  const meetingMap: Record<string, { upcoming: CalendarMeeting[]; completed: CalendarMeeting[] }> = {};
  meetings.forEach(m => {
    const d = m.scheduledAt?.toDate?.();
    if (!d) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!meetingMap[key]) meetingMap[key] = { upcoming: [], completed: [] };
    if (m.status === "completed") {
      meetingMap[key].completed.push(m);
    } else {
      meetingMap[key].upcoming.push(m);
    }
  });

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const selectedMeetings = selectedDate ? meetingMap[selectedDate] : null;

  const formatTime = (ts: any) => {
    const d = ts?.toDate?.();
    if (!d) return "";
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  // Build grid cells (leading blanks + days)
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h3 className="font-semibold text-foreground">{MONTHS[month]} {year}</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => { setViewDate(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDate(null); }}
            className="px-2 py-1 text-xs rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
          >
            Today
          </button>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-5 py-2 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block" />
          <span className="text-xs text-muted-foreground">Upcoming</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-400 inline-block" />
          <span className="text-xs text-muted-foreground">Completed</span>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {DAYS.map(d => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`blank-${idx}`} className="h-12 border-b border-r border-border/50 last:border-r-0" />;
          }
          const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayMeetings = meetingMap[key];
          const isToday = key === todayKey;
          const isSelected = key === selectedDate;

          return (
            <button
              key={key}
              onClick={() => setSelectedDate(isSelected ? null : key)}
              className={`h-12 flex flex-col items-center justify-start pt-1.5 border-b border-r border-border/50 last:border-r-0 transition-colors relative
                ${isSelected ? "bg-accent/10 border-accent/30" : "hover:bg-secondary/60"}
                ${(idx + 1) % 7 === 0 ? "border-r-0" : ""}
              `}
            >
              <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full
                ${isToday ? "bg-accent text-white" : isSelected ? "text-accent" : "text-foreground"}
              `}>
                {day}
              </span>
              {dayMeetings && (
                <div className="flex gap-0.5 mt-0.5">
                  {dayMeetings.upcoming.length > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                  )}
                  {dayMeetings.completed.length > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected date meetings */}
      {selectedDate && (
        <div className="border-t border-border p-4">
          <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
            {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          {!selectedMeetings ? (
            <p className="text-sm text-muted-foreground">No meetings on this day</p>
          ) : (
            <div className="space-y-2">
              {[...selectedMeetings.upcoming, ...selectedMeetings.completed].map(m => (
                <div
                  key={m.id}
                  onClick={() => onMeetingClick?.(m)}
                  className={`flex items-start gap-3 p-2.5 rounded-lg border transition-colors ${
                    m.status === "completed"
                      ? "border-gray-200 bg-gray-50 hover:bg-gray-100"
                      : "border-teal-200 bg-teal-50/50 hover:bg-teal-100/60"
                  } ${onMeetingClick ? "cursor-pointer" : ""}`}
                >
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${m.status === "completed" ? "bg-gray-400" : "bg-teal-500"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{m.title}</p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatTime(m.scheduledAt)}
                      </span>
                      {m.department && (
                        <span className="text-xs text-muted-foreground">{m.department}</span>
                      )}
                      {m.venue && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          {m.venue}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                    m.status === "completed"
                      ? "bg-gray-100 text-gray-600"
                      : "bg-teal-100 text-teal-700"
                  }`}>
                    {m.status === "completed" ? "Done" : m.status === "in_progress" ? "Live" : "Upcoming"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
