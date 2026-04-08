import AdminApp from './AdminApp.jsx';
import ReviewApp from './ReviewApp.jsx';

export default function App() {
  const path = typeof window !== 'undefined' ? window.location.pathname : '/';
  if (path.startsWith('/r/')) {
    const token = path.slice('/r/'.length).split('/')[0];
    return <ReviewApp token={token} />;
  }
  return <AdminApp />;
}
