import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User,
  Mail,
  Lock,
  Building,
  GraduationCap,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  IdCard,
  Calendar,
  Layers,
  Briefcase,
  BadgeCheck,
  KeyRound,
} from 'lucide-react'
import AuthLayout from '../components/auth/AuthLayout'
import AuthInput from '../components/auth/AuthInput'
import {
  authService,
  isValidEmail,
  type UserRole,
  type AuthResponse,
} from '../services/authService'

const ENGINEERING_DEPARTMENTS = [
  'Computer Science & Engineering',
  'Information Science & Engineering',
  'Data Science Engineering',
  'Artificial Intelligence & Machine Learning',
  'Electronics & Communication Engineering',
  'Electrical & Electronics Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Other',
]

const STUDENT_SEMESTERS = [
  '1st Semester',
  '2nd Semester',
  '3rd Semester',
  '4th Semester',
  '5th Semester',
  '6th Semester',
  '7th Semester',
  '8th Semester',
]

const ACADEMIC_YEARS = ['2025–26', '2024–25', '2026–27']

const FACULTY_DESIGNATIONS = [
  'Professor',
  'Associate Professor',
  'Assistant Professor',
  'Head of Department (HOD)',
  'Research Supervisor',
  'Adjunct Faculty',
]

export const SignUpPage: React.FC = () => {
  const navigate = useNavigate()
  // Role Selection State
  const [role, setRole] = useState<UserRole>('student')

  // Common Fields
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [college, setCollege] = useState('')
  const [department, setDepartment] = useState('Computer Science & Engineering')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Student-specific Fields
  const [usnOrStudentId, setUsnOrStudentId] = useState('')
  const [semester, setSemester] = useState('7th Semester')
  const [academicYear, setAcademicYear] = useState('2025–26')

  // Faculty-specific Fields
  const [facultyId, setFacultyId] = useState('')
  const [designation, setDesignation] = useState('Associate Professor')
  const [areasOfExpertise, setAreasOfExpertise] = useState('')
  const [inviteCode, setInviteCode] = useState('')

  // Validation Errors
  const [errors, setErrors] = useState<{
    fullName?: string
    email?: string
    college?: string
    department?: string
    password?: string
    confirmPassword?: string
    usnOrStudentId?: string
    semester?: string
    academicYear?: string
    facultyId?: string
    designation?: string
    areasOfExpertise?: string
  }>({})

  const [submitting, setSubmitting] = useState(false)
  const [authResponse, setAuthResponse] = useState<AuthResponse | null>(null)

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {}

    // Common validations
    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required.'
    }

    if (!email.trim()) {
      newErrors.email = 'College email is required.'
    } else if (!isValidEmail(email)) {
      newErrors.email = 'Please provide a valid institutional email address (e.g. name@university.edu).'
    }

    if (!college.trim()) {
      newErrors.college = 'College or University name is required.'
    }

    if (!department) {
      newErrors.department = 'Academic department is required.'
    }

    if (!password) {
      newErrors.password = 'Password is required.'
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long.'
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirm your password.'
    } else if (confirmPassword !== password) {
      newErrors.confirmPassword = 'Passwords do not match.'
    }

    // Role-specific validations
    if (role === 'student') {
      if (!usnOrStudentId.trim()) {
        newErrors.usnOrStudentId = 'USN or Student ID is required.'
      }
      if (!semester) {
        newErrors.semester = 'Current semester is required.'
      }
      if (!academicYear) {
        newErrors.academicYear = 'Academic year is required.'
      }
    } else {
      if (!facultyId.trim()) {
        newErrors.facultyId = 'Faculty / Employee ID is required.'
      }
      if (!designation) {
        newErrors.designation = 'Designation is required.'
      }
      if (!areasOfExpertise.trim()) {
        newErrors.areasOfExpertise = 'Areas of expertise are required (e.g. AI, Systems).'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthResponse(null)

    if (!validateForm()) return

    setSubmitting(true)
    try {
      const response = await authService.signUp({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        role,
        college: college.trim(),
        department,
        ...(role === 'student'
          ? {
              usnOrStudentId: usnOrStudentId.trim(),
              semester,
              academicYear,
            }
          : {
              facultyId: facultyId.trim(),
              designation,
              areasOfExpertise: areasOfExpertise.trim(),
              inviteCode: inviteCode.trim() || undefined,
            }),
      })
      setAuthResponse(response)
      if (response.success) {
        navigate('/ai-mentor', { replace: true })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Create Academic Account"
      subtitle="Join CampusProjectHub to organize academic capstones, collaborate with teammates, and connect with faculty mentors."
      badgeText="Student & Faculty Registration"
      footerPrompt={{
        text: 'Already have an academic account?',
        linkText: 'Sign In',
        linkHref: '/signin',
      }}
    >
      {/* Registration Status Banner */}
      {authResponse && (
        <div
          className={`mb-6 p-4 rounded-2xl border text-xs sm:text-sm leading-relaxed flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-200 ${
            authResponse.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : authResponse.status === 'database_unavailable'
              ? 'bg-amber-50/90 border-amber-200 text-amber-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {authResponse.success ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-bold">
              {authResponse.success
                ? 'Account Created'
                : authResponse.status === 'database_unavailable'
                ? 'Database Persistence Unavailable'
                : 'Registration Failed'}
            </p>
            <p className="mt-1 text-xs opacity-90">{authResponse.message}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {/* Section 1: Account Role Selection */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            Account Role <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Student Role Card */}
            <button
              type="button"
              onClick={() => {
                setRole('student')
                setErrors({})
              }}
              className={`p-4 rounded-2xl border-2 flex items-center gap-3.5 transition-all cursor-pointer text-left ${
                role === 'student'
                  ? 'border-[#6658FF] bg-[#6658FF]/5 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  role === 'student'
                    ? 'bg-[#6658FF] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                <GraduationCap className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#0B192C]">Student</p>
                <p className="text-xs text-slate-500">Capstone Innovator</p>
              </div>
            </button>

            {/* Faculty Role Card */}
            <button
              type="button"
              onClick={() => {
                setRole('faculty')
                setErrors({})
              }}
              className={`p-4 rounded-2xl border-2 flex items-center gap-3.5 transition-all cursor-pointer text-left ${
                role === 'faculty'
                  ? 'border-[#6658FF] bg-[#6658FF]/5 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  role === 'faculty'
                    ? 'bg-[#6658FF] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#0B192C]">Faculty</p>
                <p className="text-xs text-slate-500">Project Guide</p>
              </div>
            </button>
          </div>
        </div>

        {/* Section 2: Common Registration Fields */}
        <div className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <AuthInput
              id="fullName"
              label="Full Name"
              type="text"
              value={fullName}
              onChange={(val) => {
                setFullName(val)
                if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: undefined }))
              }}
              placeholder="e.g. Alex Morgan"
              required
              error={errors.fullName}
              icon={User}
              autoComplete="name"
              disabled={submitting}
            />

            {/* College Email */}
            <AuthInput
              id="email"
              label="College Email"
              type="email"
              value={email}
              onChange={(val) => {
                setEmail(val)
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }))
              }}
              placeholder="name@university.edu"
              required
              error={errors.email}
              icon={Mail}
              autoComplete="email"
              disabled={submitting}
              helperText="Institutional email"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* College / University Name */}
            <AuthInput
              id="college"
              label="College / University"
              type="text"
              value={college}
              onChange={(val) => {
                setCollege(val)
                if (errors.college) setErrors((prev) => ({ ...prev, college: undefined }))
              }}
              placeholder="e.g. National Institute of Engineering"
              required
              error={errors.college}
              icon={Building}
              autoComplete="organization"
              disabled={submitting}
            />

            {/* Academic Department Dropdown */}
            <div className="space-y-1.5 text-left">
              <label
                htmlFor="department"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700"
              >
                Academic Department <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  id="department"
                  value={department}
                  onChange={(e) => {
                    setDepartment(e.target.value)
                    if (errors.department)
                      setErrors((prev) => ({ ...prev, department: undefined }))
                  }}
                  disabled={submitting}
                  className="w-full py-3 px-4 text-sm font-medium rounded-2xl bg-slate-50/70 border border-slate-200/90 text-slate-900 focus:outline-none focus:bg-white focus:border-[#6658FF] focus:ring-4 focus:ring-[#6658FF]/10 transition-all cursor-pointer truncate"
                >
                  {ENGINEERING_DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
              {errors.department && (
                <p className="text-xs font-semibold text-rose-600">{errors.department}</p>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Role-Specific Dynamic Fields */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-4">
          <div className="flex items-center gap-2 pb-1 border-b border-slate-200/60 text-xs font-bold uppercase tracking-wider text-[#6658FF]">
            {role === 'student' ? (
              <>
                <GraduationCap className="w-4 h-4" />
                <span>Student Academic Details</span>
              </>
            ) : (
              <>
                <BookOpen className="w-4 h-4" />
                <span>Faculty Mentor Credentials</span>
              </>
            )}
          </div>

          {/* Student-specific dynamic fields */}
          {role === 'student' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <AuthInput
                id="usnOrStudentId"
                label="USN / Student ID"
                type="text"
                value={usnOrStudentId}
                onChange={(val) => {
                  setUsnOrStudentId(val)
                  if (errors.usnOrStudentId)
                    setErrors((prev) => ({ ...prev, usnOrStudentId: undefined }))
                }}
                placeholder="e.g. 1MS22CS001"
                required
                error={errors.usnOrStudentId}
                icon={IdCard}
                disabled={submitting}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Current Semester */}
                <div className="space-y-1.5 text-left">
                  <label
                    htmlFor="semester"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                  >
                    Current Semester <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                      <Layers className="w-4 h-4" />
                    </div>
                    <select
                      id="semester"
                      value={semester}
                      onChange={(e) => {
                        setSemester(e.target.value)
                        if (errors.semester)
                          setErrors((prev) => ({ ...prev, semester: undefined }))
                      }}
                      disabled={submitting}
                      className="w-full py-3 pl-10 pr-4 text-sm font-medium rounded-2xl bg-white border border-slate-200/90 text-slate-900 focus:outline-none focus:border-[#6658FF] focus:ring-4 focus:ring-[#6658FF]/10 transition-all cursor-pointer"
                    >
                      {STUDENT_SEMESTERS.map((sem) => (
                        <option key={sem} value={sem}>
                          {sem}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.semester && (
                    <p className="text-xs font-semibold text-rose-600">{errors.semester}</p>
                  )}
                </div>

                {/* Academic Year */}
                <div className="space-y-1.5 text-left">
                  <label
                    htmlFor="academicYear"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                  >
                    Academic Year <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <select
                      id="academicYear"
                      value={academicYear}
                      onChange={(e) => {
                        setAcademicYear(e.target.value)
                        if (errors.academicYear)
                          setErrors((prev) => ({ ...prev, academicYear: undefined }))
                      }}
                      disabled={submitting}
                      className="w-full py-3 pl-10 pr-4 text-sm font-medium rounded-2xl bg-white border border-slate-200/90 text-slate-900 focus:outline-none focus:border-[#6658FF] focus:ring-4 focus:ring-[#6658FF]/10 transition-all cursor-pointer"
                    >
                      {ACADEMIC_YEARS.map((yr) => (
                        <option key={yr} value={yr}>
                          {yr}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.academicYear && (
                    <p className="text-xs font-semibold text-rose-600">{errors.academicYear}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Faculty-specific dynamic fields */}
          {role === 'faculty' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Faculty ID */}
                <AuthInput
                  id="facultyId"
                  label="Faculty / Employee ID"
                  type="text"
                  value={facultyId}
                  onChange={(val) => {
                    setFacultyId(val)
                    if (errors.facultyId)
                      setErrors((prev) => ({ ...prev, facultyId: undefined }))
                  }}
                  placeholder="e.g. FAC-CSE-204"
                  required
                  error={errors.facultyId}
                  icon={BadgeCheck}
                  disabled={submitting}
                />

                {/* Designation Dropdown */}
                <div className="space-y-1.5 text-left">
                  <label
                    htmlFor="designation"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                  >
                    Designation <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <select
                      id="designation"
                      value={designation}
                      onChange={(e) => {
                        setDesignation(e.target.value)
                        if (errors.designation)
                          setErrors((prev) => ({ ...prev, designation: undefined }))
                      }}
                      disabled={submitting}
                      className="w-full py-3 pl-10 pr-4 text-sm font-medium rounded-2xl bg-white border border-slate-200/90 text-slate-900 focus:outline-none focus:border-[#6658FF] focus:ring-4 focus:ring-[#6658FF]/10 transition-all cursor-pointer truncate"
                    >
                      {FACULTY_DESIGNATIONS.map((desig) => (
                        <option key={desig} value={desig}>
                          {desig}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.designation && (
                    <p className="text-xs font-semibold text-rose-600">{errors.designation}</p>
                  )}
                </div>
              </div>

              {/* Areas of Expertise */}
              <AuthInput
                id="areasOfExpertise"
                label="Areas of Expertise"
                type="text"
                value={areasOfExpertise}
                onChange={(val) => {
                  setAreasOfExpertise(val)
                  if (errors.areasOfExpertise)
                    setErrors((prev) => ({ ...prev, areasOfExpertise: undefined }))
                }}
                placeholder="e.g. Machine Learning, Cloud Systems, Computer Vision"
                required
                error={errors.areasOfExpertise}
                icon={BookOpen}
                disabled={submitting}
                helperText="Comma separated disciplines"
              />

              {/* Faculty Invite Code */}
              <AuthInput
                id="inviteCode"
                label="Department Faculty Invite Code"
                type="password"
                value={inviteCode}
                onChange={(val) => setInviteCode(val)}
                placeholder="Required for faculty self-registration"
                icon={KeyRound}
                disabled={submitting}
                helperText="Provided by your college administrator if faculty self-signup is enabled"
              />
            </div>
          )}
        </div>

        {/* Section 4: Security Credentials */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <AuthInput
            id="password"
            label="Password"
            type="password"
            value={password}
            onChange={(val) => {
              setPassword(val)
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }))
            }}
            placeholder="Min 8 characters"
            required
            error={errors.password}
            icon={Lock}
            autoComplete="new-password"
            disabled={submitting}
          />

          <AuthInput
            id="confirmPassword"
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(val) => {
              setConfirmPassword(val)
              if (errors.confirmPassword)
                setErrors((prev) => ({ ...prev, confirmPassword: undefined }))
            }}
            placeholder="Repeat password"
            required
            error={errors.confirmPassword}
            icon={Lock}
            autoComplete="new-password"
            disabled={submitting}
          />
        </div>

        {/* Submit Button */}
        <div className="pt-3">
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 px-6 rounded-full font-bold text-sm sm:text-base text-white shadow-md hover:shadow-xl bg-gradient-to-r from-[#2563EB] via-[#4F46E5] to-[#7C3AED] hover:from-[#1D4ED8] hover:via-[#4338CA] hover:to-[#6D28D9] transition-all cursor-pointer flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span>
              {submitting
                ? 'Validating Academic Credentials...'
                : `Create ${role === 'student' ? 'Student' : 'Faculty'} Account`}
            </span>
            {!submitting && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </form>
    </AuthLayout>
  )
}

export default SignUpPage
