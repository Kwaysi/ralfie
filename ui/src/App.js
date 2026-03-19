import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import DashboardPage from "./pages/DashboardPage";
import BoardListPage from "./pages/BoardListPage";
import BoardDetailPage from "./pages/BoardDetailPage";
import SettingsPage from "./pages/SettingsPage";
export default function App() {
    return (_jsx(Routes, { children: _jsxs(Route, { element: _jsx(Layout, {}), children: [_jsx(Route, { path: "/", element: _jsx(DashboardPage, {}) }), _jsx(Route, { path: "/boards", element: _jsx(BoardListPage, {}) }), _jsx(Route, { path: "/boards/:name", element: _jsx(BoardDetailPage, {}) }), _jsx(Route, { path: "/settings", element: _jsx(SettingsPage, {}) })] }) }));
}
//# sourceMappingURL=App.js.map