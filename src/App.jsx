import { Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import PipelineList from './pages/Pipeline/PipelineList'
import WorkDetail from './pages/Pipeline/WorkDetail'
import Reports from './pages/Reports'
import PartTime from './pages/PartTime'
import Survey from './pages/Survey'
import VenueLibrary from './pages/VenueLibrary'
import Calendar from './pages/Calendar'
import Committee from './pages/Committee'
import Resources from './pages/Resources'
import AdminHome from './pages/Admin/AdminHome'
import Layout from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'

// Department submissions were retired with the move to self-reporting (no approvals).
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      {/* Public: part-time faculty research interest survey (no sign-in). */}
      <Route path="/survey" element={<Survey />} />
      <Route path="/" element={
        <ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>
      } />
      <Route path="/pipeline" element={
        <ProtectedRoute><Layout><PipelineList /></Layout></ProtectedRoute>
      } />
      <Route path="/pipeline/:id" element={
        <ProtectedRoute><Layout><WorkDetail /></Layout></ProtectedRoute>
      } />
      <Route path="/reports" element={
        <ProtectedRoute><Layout><Reports /></Layout></ProtectedRoute>
      } />
      <Route path="/venues" element={
        <ProtectedRoute><Layout><VenueLibrary /></Layout></ProtectedRoute>
      } />
      <Route path="/resources" element={
        <ProtectedRoute><Layout><Resources /></Layout></ProtectedRoute>
      } />
      <Route path="/calendar" element={
        <ProtectedRoute><Layout><Calendar /></Layout></ProtectedRoute>
      } />
      <Route path="/committee" element={
        <ProtectedRoute roles={['admin', 'research_admin', 'dean']}><Layout><Committee /></Layout></ProtectedRoute>
      } />
      <Route path="/part-time" element={
        <ProtectedRoute roles={['admin', 'research_admin']}><Layout><PartTime /></Layout></ProtectedRoute>
      } />
      <Route path="/admin" element={
        <ProtectedRoute roles={['admin']}><Layout><AdminHome /></Layout></ProtectedRoute>
      } />
    </Routes>
  )
}
