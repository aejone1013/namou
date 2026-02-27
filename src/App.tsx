import { useState } from 'react'
import Sidebar from './components/Sidebar'
import FloorMap from './components/FloorMap'
import ControlPanel from './components/ControlPanel'
import TimeTable from './components/TimeTable'
import MapTopBar from './components/MapTopBar'
import NewReservationModal from './components/NewReservationModal'
import ToastContainer from './components/Toast'
import { useReservationStore } from './store/useReservationStore'

export default function App() {
  void useReservationStore()
  const [showTimeTable, setShowTimeTable] = useState(true)

  return (
    <div className="flex h-screen w-screen bg-cream">
      <Sidebar />
      <div className="flex-1 min-w-0 h-full flex flex-col">
        <MapTopBar
          showTimeTable={showTimeTable}
          onToggleTimeTable={() => setShowTimeTable((v) => !v)}
        />
        <div className="flex-1 min-h-0 flex">
          <FloorMap />
          <ControlPanel />
        </div>
      </div>
      {showTimeTable && <TimeTable onClose={() => setShowTimeTable(false)} />}
      <NewReservationModal />

      <ToastContainer />
    </div>
  )
}
