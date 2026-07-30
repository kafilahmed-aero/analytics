import React from 'react';
import { MainLayout } from './layouts/MainLayout';
import { DashboardPage } from './pages/DashboardPage';

export function App() {
  return (
    <MainLayout>
      <DashboardPage />
    </MainLayout>
  );
}

export default App;
