import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import AuthSuccess from './pages/AuthSuccess'
import AuthError from './pages/AuthError'
import Dashboard from './pages/Dashboard'
import FamilyManagement from './pages/FamilyManagement'
import FamilyDashboard from './pages/FamilyDashboard'
import JoinFamily from './pages/JoinFamily'
import AddMember from './pages/AddMember'
import UploadPhotos from './pages/UploadPhotos'
import AddEvent from './pages/AddEvent'
import MembersList from './pages/MembersList'
import PhotosGallery from './pages/PhotosGallery'
import EventsList from './pages/EventsList'
import FamilyTree from './pages/FamilyTree'
import SuperAdminDashboard from './pages/SuperAdminDashboard'
import FamilyAdminPanel from './pages/FamilyAdminPanel'
import MemberDetails from './pages/MemberDetails'
import Billing from './pages/Billing'
import DummyCheckout from './pages/DummyCheckout'
import Landing from './pages/Landing'

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Auth routes - full page without header */}
          <Route path="/auth/success" element={<AuthSuccess />} />
          <Route path="/auth/error" element={<AuthError />} />
          {/* Landing */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Landing />} />
          <Route path="/dashboard" element={<FamilyDashboard />} />
          <Route path="/old-dashboard" element={<Dashboard />} />
          <Route path="/families" element={<FamilyManagement />} />
          <Route path="/join/:familyId" element={<JoinFamily />} />
          <Route path="/add-member" element={<AddMember />} />
          <Route path="/upload-photos" element={<UploadPhotos />} />
          <Route path="/add-event" element={<AddEvent />} />
          <Route path="/members" element={<MembersList />} />
          <Route path="/member/:memberId" element={<MemberDetails />} />
          <Route path="/photos" element={<PhotosGallery />} />
          <Route path="/events" element={<EventsList />} />
          <Route path="/tree" element={<FamilyTree />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/checkout" element={<DummyCheckout />} />
          <Route path="/admin" element={<SuperAdminDashboard />} />
          <Route path="/family-admin" element={<FamilyAdminPanel />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
