import { Routes, Route } from "react-router-dom";

function Placeholder({ name }: { name: string }) {
  return <div className="p-6 text-[var(--text-muted)]">{name} — coming soon</div>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Placeholder name="Dashboard" />} />
      <Route path="/boards" element={<Placeholder name="Boards" />} />
      <Route path="/boards/:name" element={<Placeholder name="Board Detail" />} />
      <Route path="/settings" element={<Placeholder name="Settings" />} />
    </Routes>
  );
}
