/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { AppProvider, useApp } from './context/AppContext.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { Layout } from './components/Layout.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { AboutPage } from './pages/AboutPage.tsx';
import { WritingsPage } from './pages/WritingsPage.tsx';
import { ArticleDetailPage } from './pages/ArticleDetailPage.tsx';
import { ContactPage } from './pages/ContactPage.tsx';
import { AdminPage } from './pages/AdminPage.tsx';

function AppRouter() {
  const { currentPath } = useApp();

  const normalized = currentPath.replace(/\/+$/, '') || '/';

  let page: React.ReactNode;
  if (normalized === '/') {
    page = <HomePage />;
  } else if (normalized === '/about') {
    page = <AboutPage />;
  } else if (normalized === '/writings') {
    page = <WritingsPage />;
  } else if (normalized.startsWith('/writings/')) {
    const slug = decodeURIComponent(normalized.slice('/writings/'.length));
    page = <ArticleDetailPage slug={slug} />;
  } else if (normalized === '/contact') {
    page = <ContactPage />;
  } else if (normalized === '/admin') {
    page = <AdminPage />;
  } else {
    page = <HomePage />;
  }

  return <Layout>{page}</Layout>;
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppRouter />
      </AppProvider>
    </AuthProvider>
  );
}
