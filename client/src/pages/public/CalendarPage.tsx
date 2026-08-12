import PublicCalendar from '../../components/calendar/PublicCalendar'
import PublicNavbar from '../../components/navigation/PublicNavbar'

function CalendarPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Public Navigation */}
      <PublicNavbar />

      {/* Calendar */}
      <main className="pt-20">
        <PublicCalendar />
      </main>
    </div>
  )
}

export default CalendarPage
