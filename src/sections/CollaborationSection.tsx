import React from 'react'
import SectionHeading from '../components/SectionHeading'
import {
  Users,
  CheckSquare,
  MessageSquare,
  BarChart3,
  CheckCircle,
  Clock,
  ShieldCheck,
} from 'lucide-react'

export const CollaborationSection: React.FC = () => {
  return (
    <section className="py-20 sm:py-28 bg-[#F8FAFC] border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <SectionHeading
          category="TEAMWORK & SUPERVISION"
          title="Better Projects Begin With Better Collaboration"
          subtitle="Keep student engineers synchronized, task assignments transparent, and faculty mentors actively involved."
          centered={true}
        />

        {/* Rich Interface Preview Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 mt-10">
          {/* Left Column: Team & Task Allocation (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Student Teams Card */}
            <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-[#6658FF]/10 text-[#6658FF]">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Active Project Squad: Team Synapse</h3>
                    <p className="text-xs text-slate-500">Autonomous Rover Navigation System</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  4 Active Members
                </span>
              </div>

              {/* Members List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                      AR
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Aarav Ray</div>
                      <div className="text-[11px] text-[#6658FF] font-medium">Team Lead & ML</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                    4 Tasks
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-pink-600 text-white font-bold text-xs flex items-center justify-center">
                      DM
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Diya Menon</div>
                      <div className="text-[11px] text-purple-600 font-medium">Full-Stack Dev</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                    3 Tasks
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-600 text-white font-bold text-xs flex items-center justify-center">
                      RK
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Rohan Kumar</div>
                      <div className="text-[11px] text-emerald-600 font-medium">Embedded & IoT</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">
                    2 Tasks
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-600 to-orange-600 text-white font-bold text-xs flex items-center justify-center">
                      SK
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">Sneha Kulkarni</div>
                      <div className="text-[11px] text-amber-600 font-medium">Data & Validation</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                    3 Tasks
                  </span>
                </div>
              </div>
            </div>

            {/* Task Allocation Board Snippet */}
            <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-[#6658FF]" />
                  <h4 className="font-bold text-slate-900 text-sm">Task Allocation & Sprint Status</h4>
                </div>
                <span className="text-xs text-slate-500 font-mono">Milestone 03 / 04</span>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200/80">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <div>
                      <div className="text-xs font-bold text-slate-900">LiDAR Point Cloud Ingestion Pipeline</div>
                      <div className="text-[10px] text-slate-500">Assigned to Aarav Ray &bull; PR #34 merged</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                    Completed
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200/80">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-[#6658FF] animate-spin" />
                    <div>
                      <div className="text-xs font-bold text-slate-900">Vite + WebSocket Telemetry Dashboard</div>
                      <div className="text-[10px] text-slate-500">Assigned to Diya Menon &bull; Testing 60 FPS update</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-[#6658FF] bg-[#6658FF]/10 px-2 py-0.5 rounded">
                    In Review
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200/80">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full border-2 border-slate-400" />
                    <div>
                      <div className="text-xs font-bold text-slate-900">Motor Controller CAN-Bus Driver Integration</div>
                      <div className="text-[10px] text-slate-500">Assigned to Rohan Kumar &bull; Target: Friday</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                    In Progress
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Faculty Feedback & Shared Progress (5 cols) */}
          <div className="lg:col-span-5 space-y-6 flex flex-col justify-between">
            {/* Faculty Feedback Card */}
            <div className="bg-gradient-to-br from-[#121c2d] to-[#0a111c] text-white rounded-2xl p-6 sm:p-7 border border-slate-700/80 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Faculty Supervisor Note
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">2 hours ago</span>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center font-bold text-amber-300 text-sm shrink-0">
                  DR
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-bold text-white">Dr. Radhika Sen (Dept. of CSE)</div>
                  <p className="text-xs text-slate-300 leading-relaxed italic bg-white/5 p-3 rounded-xl border border-white/10">
                    "Great velocity on the sensor fusion module. For the upcoming midterm viva, make sure your latency benchmarks include a comparison table against traditional A* search."
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                      <ShieldCheck className="w-3.5 h-3.5" /> Milestone 2 Grade: 96/100
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Shared Project Progress Card */}
            <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#6658FF]" />
                  <h4 className="font-bold text-slate-900 text-sm">Capstone Progress Velocity</h4>
                </div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                  82% Completed
                </span>
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-600 font-medium mb-1.5">
                  <span>Semester Milestones</span>
                  <span className="font-bold text-slate-900">3 of 4 Defended</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-[#6658FF] rounded-full transition-all duration-500"
                    style={{ width: '82%' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <div className="text-lg font-black text-slate-900">18</div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Commits Merged</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <div className="text-lg font-black text-emerald-600">100%</div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Attendance Log</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default CollaborationSection
