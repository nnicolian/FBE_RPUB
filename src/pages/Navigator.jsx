import { Compass } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import NavigatorWorkspace from '../components/navigator/Navigator'

// My Research Navigator: a research landscape for any interest, grounded in verified sources.
// Inside each paper, the Research Navigator tab offers the stage-by-stage tools.
export default function Navigator() {
  return (
    <div className="space-y-4">
      <PageHeader icon={Compass} title="Research Navigator"
        subtitle="Map the literature for a research interest — theories, authors, key articles, streams, methods, gaps and journals — from verified sources. Each paper also has a Research Navigator tab with tools for every stage." />
      <NavigatorWorkspace />
    </div>
  )
}
