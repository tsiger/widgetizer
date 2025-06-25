import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import Pages from "./pages/Pages";
import PagesAdd from "./pages/PagesAdd";
import PagesEdit from "./pages/PagesEdit";
import Menus from "./pages/Menus";
import MenusAdd from "./pages/MenusAdd";
import MenusEdit from "./pages/MenusEdit";
import Media from "./pages/Media";
import Settings from "./pages/Settings";
import Themes from "./pages/Themes";
import Plugins from "./pages/Plugins";
import ExportSite from "./pages/ExportSite";
import AppSettings from "./pages/AppSettings";
import PageEditor from "./pages/PageEditor";
import PagePreview from "./pages/PagePreview";
import ProjectsAdd from "./pages/ProjectsAdd";
import ProjectsEdit from "./pages/ProjectsEdit";
import MenuStructure from "./pages/MenuStructure";
import ToastContainer from "./components/ui/ToastContainer";
import RequireActiveProject from "./components/layout/RequireActiveProject";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/add" element={<ProjectsAdd />} />
          <Route path="projects/edit/:id" element={<ProjectsEdit />} />

          <Route element={<RequireActiveProject />}>
            <Route path="pages" element={<Pages />} />
            <Route path="pages/add" element={<PagesAdd />} />
            <Route path="pages/:id/edit" element={<PagesEdit />} />
            <Route path="page-editor" element={<PageEditor />} />
            <Route path="menus" element={<Menus />} />
            <Route path="menus/add" element={<MenusAdd />} />
            <Route path="menus/edit/:id" element={<MenusEdit />} />
            <Route path="menus/:id/structure" element={<MenuStructure />} />
            <Route path="media" element={<Media />} />
            <Route path="settings" element={<Settings />} />
            <Route path="themes" element={<Themes />} />
            <Route path="plugins" element={<Plugins />} />
            <Route path="export-site" element={<ExportSite />} />
            <Route path="app-settings" element={<AppSettings />} />
          </Route>
        </Route>
        <Route path="/preview/:pageId" element={<PagePreview />} />
      </Routes>
      <ToastContainer />
    </Router>
  );
}

export default App;
