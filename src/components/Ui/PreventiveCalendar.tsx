import React from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

type Props = {
  upcomingDates: Array<{ date: string; formattedDate: string }>;
};

export default function PreventiveCalendar({ upcomingDates }: Props) {
  const markedDates = upcomingDates.map(d => new Date(d.date));

  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      const isMarked = markedDates.some(d => d.toDateString() === date.toDateString());
      return isMarked ? 'bg-orange-100 text-orange-800 font-semibold rounded-lg' : '';
    }
    return '';
  };

  return (
    <Calendar
      tileClassName={tileClassName}
      showNeighboringMonth={false}
      // Désactiver les clics sur les autres jours si tu veux
      tileDisabled={({ date, view }) =>
        view === 'month' && !markedDates.some(d => d.toDateString() === date.toDateString())
      }
    />
  );
}
