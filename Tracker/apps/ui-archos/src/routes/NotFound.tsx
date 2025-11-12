import { Link } from 'react-router-dom';

const NotFoundRoute = () => (
  <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6 text-center">
    <p className="text-sm uppercase tracking-wide text-slate-500">404</p>
    <h2 className="text-2xl font-semibold text-white">Node not found</h2>
    <p className="text-sm text-slate-400">The requested screen does not exist in this build.</p>
    <Link to="/battle" className="mt-4 inline-flex rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900">
      Return to Battle
    </Link>
  </div>
);

export default NotFoundRoute;
