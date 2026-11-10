import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import HeroSection from './sections/HeroSection'
import WhyChooseSection from './sections/WhyChooseSection'
import HowItWorksSection from './sections/HowItWorksSection'
import AILearningSection from './sections/AILearningSection'
import TeamCollaborationSection from './sections/TeamCollaborationSection'
import FinalCTASection from './sections/FinalCTASection'
import Footer from './components/Footer'
import { ExploreProjectsPage } from './pages/ExploreProjectsPage'
import { ProjectDetailsPage } from './pages/ProjectDetailsPage'
import SignInPage from './pages/SignInPage'
import SignUpPage from './pages/SignUpPage'
import AIMentorPage from './pages/AIMentorPage'
import ProposalEditorPage from './pages/ProposalEditorPage'
import ProtectedRoute from './components/auth/ProtectedRoute'

// Helper component that scrolls to top whenever route pathname changes
function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}

// Landing Page Layout (Without ProjectRepositorySection, as requested in Task 09 Redesign)
interface LandingPageProps {
  onSignIn: () => void
  onSignUp: () => void
  onAIMentor: () => void
}

function LandingPage({ onSignIn, onSignUp, onAIMentor }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-[#FFFFFF] text-slate-800 antialiased selection:bg-[#6658FF]/20 selection:text-[#6658FF] overflow-x-hidden">
      {/* 1. Fully preserved Hero Section with slow typography marquee, 12-sticker cursor trail, and Explore Projects CTA */}
      <HeroSection
        onSignInClick={onSignIn}
        onSignUpClick={onSignUp}
      />

      {/* 2. Feature Carousel Section — Why Choose CampusProjectHub? */}
      <WhyChooseSection />

      {/* 3. Workflow Stages Section — How It Works */}
      <HowItWorksSection />

      {/* 4. AI Learning Assistant Section */}
      <AILearningSection onExploreClick={onAIMentor} />

      {/* 5. Team Collaboration Section */}
      <TeamCollaborationSection onStartProjectClick={onSignUp} />

      {/* 6. Final Call-to-Action Section */}
      <FinalCTASection onGetStartedClick={onSignUp} />

      {/* 7. Global Footer */}
      <Footer
        onSignInClick={onSignIn}
        onSignUpClick={onSignUp}
      />
    </div>
  )
}

function AppRoutes() {
  const navigate = useNavigate()

  // Direct page navigation for Sign In, Sign Up, and AI Mentor
  const handleSignIn = () => navigate('/signin')
  const handleSignUp = () => navigate('/signup')
  const handleAIMentor = () => navigate('/ai-mentor')

  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Public Homepage — Focused on platform features and introduction */}
        <Route
          path="/"
          element={
            <LandingPage
              onSignIn={handleSignIn}
              onSignUp={handleSignUp}
              onAIMentor={handleAIMentor}
            />
          }
        />

        {/* Dedicated AI Project Mentor Workspace (Authenticated) */}
        <Route
          path="/ai-mentor"
          element={
            <ProtectedRoute>
              <AIMentorPage />
            </ProtectedRoute>
          }
        />

        {/* Dedicated Academic Proposal Editor (Authenticated) */}
        <Route
          path="/ai-mentor/proposals/:proposalId"
          element={
            <ProtectedRoute>
              <ProposalEditorPage />
            </ProtectedRoute>
          }
        />

        {/* Dedicated Explore Projects Platform */}
        <Route
          path="/explore-projects"
          element={
            <ExploreProjectsPage
              onSignInClick={handleSignIn}
              onSignUpClick={handleSignUp}
            />
          }
        />

        {/* Dedicated Project Details Route */}
        <Route
          path="/explore-projects/:projectId"
          element={
            <ProjectDetailsPage
              onSignInClick={handleSignIn}
              onSignUpClick={handleSignUp}
            />
          }
        />

        {/* Dedicated Sign In Page */}
        <Route path="/signin" element={<SignInPage />} />

        {/* Dedicated Sign Up Page (Task 13A Academic Registration) */}
        <Route path="/signup" element={<SignUpPage />} />

        {/* Fallback to Home */}
        <Route
          path="*"
          element={
            <LandingPage
              onSignIn={handleSignIn}
              onSignUp={handleSignUp}
              onAIMentor={handleAIMentor}
            />
          }
        />
      </Routes>
    </>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

export default App
