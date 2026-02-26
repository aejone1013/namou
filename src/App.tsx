import { useState } from 'react'
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragStartEvent, type DragEndEvent } from '@dnd-kit/core'
import Sidebar from './components/Sidebar'
import FloorMap from './components/FloorMap'
import ControlPanel from './components/ControlPanel'
import TimeTable from './components/TimeTable'
import NewReservationModal from './components/NewReservationModal'
import DragOverlayContent from './components/DragOverlayContent'
import ToastContainer from './components/Toast'
import { useReservationStore } from './store/useReservationStore'
import { useToastStore } from './store/useToastStore'
import { toastMessages } from './features/toast/toastPresets'
import type { Reservation, TableInfo } from './data/dummy'

export default function App() {
  const { seatWithAutoMerge } = useReservationStore()
  const toast = useToastStore()
  const [activeReservation, setActiveReservation] = useState<Reservation | null>(null)
  const [showTimeTable, setShowTimeTable] = useState(true)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  )

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
      // Check if seating failed (reservation still waiting)
      const after = useReservationStore.getState().reservations.find((r) => r.id === reservation.id)
      if (after?.status === 'waiting') {
        toast.show(toastMessages.seatingFailedNoCapacity, 'error')
      }
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
        <FloorMap showTimeTable={showTimeTable} onToggleTimeTable={() => setShowTimeTable((v) => !v)} />
        <ControlPanel />
        {showTimeTable && <TimeTable />}
        <NewReservationModal />
      </div>

      <DragOverlay dropAnimation={null}>
        {activeReservation && (
          <DragOverlayContent reservation={activeReservation} />
        )}
      </DragOverlay>

      <ToastContainer />
    </DndContext>
  )
}
