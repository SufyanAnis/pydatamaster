import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Spinner } from "./components/ui";
import { useAuth } from "./context/AuthContext";
import Home from "./pages/Home";

const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const PostPage = lazy(() => import("./pages/PostPage"));
const StaticPage = lazy(() => import("./pages/StaticPage"));
const Contact = lazy(() => import("./pages/Contact"));
const Login = lazy(() => import("./pages/Login"));
const NotFound = lazy(() => import("./pages/NotFound"));

const AdminLayout = lazy(() => import("./admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./admin/pages/Dashboard"));
const AdminPosts = lazy(() => import("./admin/pages/BlogAdmin"));
const AdminCategories = lazy(() => import("./admin/pages/CategoriesAdmin"));
const AdminPages = lazy(() => import("./admin/pages/PagesAdmin"));
const AdminMedia = lazy(() => import("./admin/pages/MediaAdmin"));
const AdminInbox = lazy(() => import("./admin/pages/Inbox"));
const AdminUsers = lazy(() => import("./admin/pages/Users"));
const AdminUserDetail = lazy(() => import("./admin/pages/UserDetail"));
const AdminSettings = lazy(() => import("./admin/pages/Settings"));

function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner label="Loading" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.role !== "admin") return <Navigate to="/" replace />;
  return <>{children}</>;
}

/** Old lesson URLs (/lesson/:moduleId/:lessonId) map straight onto the converted articles. */
function LessonRedirect() {
  const { lessonId } = useParams();
  return <Navigate to={`/blog/${lessonId}`} replace />;
}

export default function App() {
  return (
    <Suspense fallback={<Spinner label="Loading" className="min-h-[50vh]" />}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/category/:slug" element={<CategoryPage />} />
          <Route path="/blog/:id" element={<PostPage />} />
          <Route path="/p/:slug" element={<StaticPage />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login />} />

          {/* Legacy URLs from the learning-platform era */}
          <Route path="/blog" element={<Navigate to="/" replace />} />
          <Route path="/about" element={<Navigate to="/p/about" replace />} />
          <Route path="/privacy" element={<Navigate to="/p/privacy" replace />} />
          <Route path="/terms" element={<Navigate to="/p/terms" replace />} />
          <Route path="/contact/form" element={<Navigate to="/contact" replace />} />
          <Route path="/lesson/:moduleId/:lessonId" element={<LessonRedirect />} />
          <Route path="/courses" element={<Navigate to="/" replace />} />
          <Route path="/playground" element={<Navigate to="/" replace />} />
          <Route path="/pricing" element={<Navigate to="/" replace />} />
          <Route path="/resources" element={<Navigate to="/" replace />} />
          <Route path="/signup" element={<Navigate to="/login" replace />} />

          <Route path="*" element={<NotFound />} />
        </Route>

        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="posts" element={<AdminPosts />} />
          <Route path="blog" element={<Navigate to="/admin/posts" replace />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="pages" element={<AdminPages />} />
          <Route path="media" element={<AdminMedia />} />
          <Route path="inbox" element={<AdminInbox />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="users/:id" element={<AdminUserDetail />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
