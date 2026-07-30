import React from 'react';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';

export const MainLayout = ({ children }) => {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-wrapper">
        <Header />
        <main className="content-container">{children}</main>
      </div>
    </div>
  );
};
