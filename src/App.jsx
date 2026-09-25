import { Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import PipelineList from './pages/Pipeline/PipelineList'
import WorkDetail from './pages/Pipeline/WorkDetail'
import Submissions from './pages/Submissions'
import Reports from './pages/Reports'
import AdminHome from './pages/Admin/AdminHome'
import Layout from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/" element={
        <ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>
      } />
      <Route path="/pipeline" element={
        <ProtectedRoute><Layout><PipelineList /></Layout></ProtectedRoute>
      } />
      <Route path="/pipeline/:id" element={
        <ProtectedRoute><Layout><WorkDetail /></Layout></ProtectedRoute>
      } />
      <Route path="/submissions" element={
        <ProtectedRoute><Layout><Submissions /></Layout></ProtectedRoute>
      } />
      <Route path="/reports" element={
        <ProtectedRoute><Layout><Reports /></Layout></ProtectedRoute>
      } />
      <Route path="/admin" element={
        <ProtectedRoute roles={['admin']}><Layout><AdminHome /></Layout></ProtectedRoute>
      } />
    </Routes>
  )
}
