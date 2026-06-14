import { HashRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { DownloadProvider } from './context/DownloadContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Downloads from './pages/Downloads';
import YouTube from './pages/YouTube';
import Torrents from './pages/Torrents';
import Converter from './pages/Converter';
import Extension from './pages/Extension';
import Settings from './pages/Settings';
import ApiDocs from './pages/ApiDocs';
import Files from './pages/Files';
import NotFound from './pages/NotFound';

function NavigationListener() {
  const navigate = useNavigate();
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) navigate(detail);
    };
    window.addEventListener('navigate', handler);
    return () => window.removeEventListener('navigate', handler);
  }, [navigate]);
  return null;
}

function App() {
  return (
    <DownloadProvider>
      <HashRouter>
        <NavigationListener />
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/downloads" element={<Downloads />} />
            <Route path="/youtube" element={<YouTube />} />
            <Route path="/torrents" element={<Torrents />} />
            <Route path="/converter" element={<Converter />} />
            <Route path="/extension" element={<Extension />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/api-docs" element={<ApiDocs />} />
            <Route path="/files" element={<Files />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </HashRouter>
    </DownloadProvider>
  );
}

export default App;
