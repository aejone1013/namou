import { useState } from 'react'
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragStartEvent, type DragEndEvent } from '@dnd-kit/core'
import Sidebar from './components/Sidebar'
import FloorMap from './components/FloorMap'
import ControlPanel from './components/ControlPanel'
import TimeTable from './components/TimeTable'
import NewReservationModal from './components/NewReservationModal'
import DragOverlayContent from './components/DragOverlayContent'
import SetupWizard from './components/SetupWizard'
import { useReservationStore } from './store/useReservationStore'
import type { Reservation, TableInfo } from './data/dummy'

export default function App() {
  const { seatWithAutoMerge, isSetupComplete } = useReservationStore()
  const [activeReservation, setActiveReservation] = useState<Reservation | null>(null)

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

    const reservation = (active.data.current as { reservation?: Reservation })?.reservation
    const table = (over.data.current as { table?: TableInfo })?.table

    if (table && table.status === 'available' && reservation) {
      seatWithAutoMerge(reservation.id, table.id)
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
        <FloorMap />
        <ControlPanel />
        <TimeTable />
        <NewReservationModal />
      </div>

      <DragOverlay dropAnimation={null}>
        {activeReservation && (
          <DragOverlayContent reservation={activeReservation} />
        )}
      </DragOverlay>
    </DndContext>
  )
}
