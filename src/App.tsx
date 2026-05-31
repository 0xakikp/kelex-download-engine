import { HashRouter, Routes, Route } from 'react-router-dom';
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

function App() {
  return (
    <DownloadProvider>
      <HashRouter>
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
          </Routes>
        </Layout>
      </HashRouter>
    </DownloadProvider>
  );
}

export default App;
