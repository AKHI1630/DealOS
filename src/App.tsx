/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Config from './pages/Config';
import LeadDetail from './pages/LeadDetail';
import Inbox from './pages/Inbox';
import Leads from './pages/Leads';
import MainLayout from './layouts/MainLayout';
import PublicLayout from './layouts/PublicLayout';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Landing />} />
        </Route>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/config" element={<Config />} />
          <Route path="/lead/:id" element={<LeadDetail />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/leads" element={<Leads />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
