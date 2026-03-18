import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import DashboardPage from "./pages/DashboardPage";
import BoardDetailPage from "./pages/BoardDetailPage";

function Placeholder({ name }: { name: string }) {
  return <div className="text-[var(--text-muted)]">{name} — coming soon</div>;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/boards" element={<Placeholder name="Boards" />} />
        <Route path="/boards/:name" element={<BoardDetailPage />} />
        <Route path="/settings" element={<Placeholder name="Settings" />} />
      </Route>
    </Routes>
  );
}
