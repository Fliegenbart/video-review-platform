import AdminApp from './AdminApp.jsx';
import DemoReviewApp from './DemoReviewApp.jsx';
import LandingPage from './LandingPage.jsx';
import ReviewApp from './ReviewApp.jsx';

export default function App() {
  const path = typeof window !== 'undefined' ? window.location.pathname : '/';

  if (path.startsWith('/r/')) {
    const token = path.slice('/r/'.length).split('/')[0];
    return <ReviewApp token={token} />;
  }

  if (path === '/admin') {
    return <AdminApp />;
  }

  if (path === '/demo') {
    return <DemoReviewApp />;
  }

  return <LandingPage />;
}
