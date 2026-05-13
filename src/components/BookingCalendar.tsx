import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Info } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../utils/cn';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from 'date-fns';

interface Booking {
  startDate: Date;
  endDate: Date;
  campaignName: string;
}

interface BookingCalendarProps {
  bookings?: Booking[];
}

export default function BookingCalendar({ bookings = [] }: BookingCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  const getBooking = (day: Date) => {
    return bookings.find(b => {
      const start = new Date(b.startDate);
      const end = new Date(b.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return day >= start && day <= end;
    });
  };

  return (
    <div className="bg-white rounded-[40px] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col">
      <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-slate-200">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-2xl font-black text-slate-900 tracking-tight">
              {format(currentDate, 'MMMM yyyy')}
            </h4>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Asset Utilization Schedule</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={prevMonth}
            className="p-3 hover:bg-white hover:shadow-md rounded-xl text-slate-400 hover:text-slate-900 border border-transparent hover:border-slate-100 transition-all font-bold"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button 
            onClick={nextMonth}
            className="p-3 hover:bg-white hover:shadow-md rounded-xl text-slate-400 hover:text-slate-900 border border-transparent hover:border-slate-100 transition-all font-bold"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-slate-100">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="py-4 text-center border-r border-slate-100 last:border-0">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{day}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 flex-1">
        {days.map((day, idx) => {
          const booking = getBooking(day);
          const sameMonth = isSameMonth(day, monthStart);
          const today = isToday(day);
          
          return (
            <div 
              key={day.toString()} 
              className={cn(
                "min-h-[120px] p-2 border-r border-b border-slate-100 relative group transition-all h-full",
                !sameMonth ? "bg-slate-50/50" : "bg-white hover:bg-slate-50/30",
                (idx + 1) % 7 === 0 && "border-r-0"
              )}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={cn(
                  "text-sm font-black w-7 h-7 flex items-center justify-center rounded-lg transition-all",
                  today ? "bg-slate-900 text-white shadow-lg shadow-slate-200" : 
                  sameMonth ? "text-slate-900" : "text-slate-300"
                )}>
                  {format(day, 'd')}
                </span>
                {today && (
                  <span className="bg-emerald-500 w-1.5 h-1.5 rounded-full animate-ping" />
                )}
              </div>
              
              {booking && (
                <div className="mt-1 transition-all duration-300 animate-in fade-in zoom-in-95">
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl group/booking hover:bg-slate-900 hover:border-slate-900 transition-all cursor-default">
                    <p className="text-[9px] font-bold text-slate-700 group-hover/booking:text-white truncate uppercase tracking-tighter transition-colors">
                      {booking.campaignName}
                    </p>
                    <div className="flex items-center gap-1 mt-1 opacity-0 group-hover/booking:opacity-100 transition-opacity">
                      <div className="w-1 h-1 rounded-full bg-slate-400" />
                      <span className="text-[7px] font-bold text-slate-200 uppercase tracking-widest">Active</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-6 bg-slate-50 flex flex-wrap items-center justify-center gap-8 border-t border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-lg bg-white border border-slate-200 shadow-sm" />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Available Space</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-lg bg-slate-900 shadow-lg shadow-slate-100" />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Booked Slot</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-lg bg-amber-500 shadow-lg shadow-amber-100" />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Maintenance</span>
        </div>
        <div className="ml-auto flex items-center gap-2 text-slate-400">
          <Info className="w-4 h-4" />
          <span className="text-[9px] font-bold italic">Real-time inventory synchronization enabled</span>
        </div>
      </div>
    </div>
  );
}

