import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from '@app/components/layout/AppLayout';
import BattleRoute from '@app/routes/Battle';
import HeroRoute from '@app/routes/Hero';
import SkillsRoute from '@app/routes/Skills';
import CreatorRoute from '@app/routes/Creator';
import LoadSaveRoute from '@app/routes/LoadSave';
import SettingsRoute from '@app/routes/Settings';
import NotFoundRoute from '@app/routes/NotFound';

const App = () => (
  <BrowserRouter>
    <AppLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/battle" replace />} />
        <Route path="/battle" element={<BattleRoute />} />
        <Route path="/hero" element={<HeroRoute />} />
        <Route path="/skills" element={<SkillsRoute />} />
        <Route path="/creator" element={<CreatorRoute />} />
        <Route path="/load-save" element={<LoadSaveRoute />} />
        <Route path="/settings" element={<SettingsRoute />} />
        <Route path="*" element={<NotFoundRoute />} />
      </Routes>
    </AppLayout>
  </BrowserRouter>
);

export default App;
