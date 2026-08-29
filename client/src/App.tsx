import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Spinner } from "./components/ui";
import { useAuth } from "./context/AuthContext";
import Home from "./pages/Home";
import LessonPage from "./pages/Lesson";

const Courses = lazy(() => import("./pages/Courses"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const Resources = lazy(() => import("./pages/Resources"));
const CheatSheet = lazy(() => import("./pages/CheatSheet"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const ContactForm = lazy(() => import("./pages/ContactForm"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Notify = lazy(() => import("./pages/Notify"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Playground = lazy(() => import("./pages/Playground"));
const PipelineStep = lazy(() => import("./pages/PipelineStep"));
const Signup = lazy(() => import("./pages/Signup"));
const Login = lazy(() => import("./pages/Login"));
const Progress = lazy(() => import("./pages/Progress"));
const Profile = lazy(() => import("./pages/Profile"));

const AdminLayout = lazy(() => import("./admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./admin/pages/Dashboard"));
const AdminUsers = lazy(() => import("./admin/pages/Users"));
const AdminUserDetail = lazy(() => import("./admin/pages/UserDetail"));
const AdminCurriculum = lazy(() => import("./admin/pages/Curriculum"));
const AdminBlog = lazy(() => import("./admin/pages/BlogAdmin"));
const AdminPipeline = lazy(() => import("./admin/pages/PipelineAdmin"));
const AdminResources = lazy(() => import("./admin/pages/ResourcesAdmin"));
const AdminInbox = lazy(() => import("./admin/pages/Inbox"));
const AdminWaitlist = lazy(() => import("./admin/pages/Waitlist"));
const AdminSubscribers = lazy(() => import("./admin/pages/Subscribers"));
const AdminSettings = lazy(() => import("./admin/pages/Settings"));
const AdminTutor = lazy(() => import("./admin/pages/TutorLogs"));

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner label="Loading" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner label="Loading" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.role !== "admin") return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Suspense fallback={<Spinner label="Loading" className="min-h-[50vh]" />}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/lesson/:moduleId/:lessonId" element={<LessonPage />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:id" element={<BlogPost />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/resources/cheatsheet/:id" element={<CheatSheet />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/contact/form" element={<ContactForm />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/notify" element={<Notify />} />
          <Route path="/playground" element={<Playground />} />
          <Route path="/pipeline/:stepId" element={<PipelineStep />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/progress"
            element={
              <RequireAuth>
                <Progress />
              </RequireAuth>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <Profile />
              </RequireAuth>
            }
          />
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
          <Route path="users" element={<AdminUsers />} />
          <Route path="users/:id" element={<AdminUserDetail />} />
          <Route path="curriculum" element={<AdminCurriculum />} />
          <Route path="blog" element={<AdminBlog />} />
          <Route path="pipeline" element={<AdminPipeline />} />
          <Route path="resources" element={<AdminResources />} />
          <Route path="inbox" element={<AdminInbox />} />
          <Route path="waitlist" element={<AdminWaitlist />} />
          <Route path="subscribers" element={<AdminSubscribers />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="tutor" element={<AdminTutor />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
