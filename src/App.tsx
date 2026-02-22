import { useState } from 'react'
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragStartEvent, type DragEndEvent } from '@dnd-kit/core'
import Sidebar from './components/Sidebar'
import FloorMap from './components/FloorMap'
import TimeTable from './components/TimeTable'
import NewReservationModal from './components/NewReservationModal'
import DragOverlayContent from './components/DragOverlayContent'
import SetupWizard from './components/SetupWizard'
import { useReservationStore } from './store/useReservationStore'
import type { Reservation, TableInfo } from './data/dummy'

export default function App() {
  const { seatReservation, isSetupComplete } = useReservationStore()
  const [activeReservation, setActiveReservation] = useState<Reservation | null>(null)
  const [showTimeTable, setShowTimeTable] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  )

  if (!isSetupComplete) {
    return <SetupWizard />
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { reservation } = event.active.data.current as { reservation: Reservation }
    setActiveReservation(reservation)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveReservation(null)

    const { over, active } = event
    if (!over) return

    const { reservation } = active.data.current as { reservation: Reservation }
    const { table } = over.data.current as { table: TableInfo }

    if (table && table.status === 'available' && reservation) {
      seatReservation(reservation.id, table.id)
    }
  }

  const handleDragCancel = () => {
    setActiveReservation(null)
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex h-screen w-screen bg-cream">
        <Sidebar />
        <FloorMap onOpenTimeTable={() => setShowTimeTable(true)} />
        <NewReservationModal />
      </div>

      {showTimeTable && (
        <TimeTable onClose={() => setShowTimeTable(false)} />
      )}

      <DragOverlay dropAnimation={null}>
        {activeReservation && (
          <DragOverlayContent reservation={activeReservation} />
        )}
      </DragOverlay>
    </DndContext>
  )
}
