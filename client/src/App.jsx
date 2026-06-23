import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/ui/Navbar';
import DashboardPage from './pages/DashboardPage';
import DecksPage from './pages/DecksPage';
import DeckDetailPage from './pages/DeckDetailPage';
import StudyPage from './pages/StudyPage';
import StatsPage from './pages/StatsPage';
import ImportPage from './pages/ImportPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="md:pl-56">
        <Navbar />
        <main className="pb-24 md:pb-8">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/decks" element={<DecksPage />} />
            <Route path="/decks/:id" element={<DeckDetailPage />} />
            <Route path="/study/:id" element={<StudyPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
