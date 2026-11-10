import React, { useState } from 'react'
import {
  Settings,
  X,
  Shield,
  BookOpen,
  Trash2,
  Check,
  Award,
  Headphones,
  Globe,
} from 'lucide-react'
import type {
  MentorSettings,
  SpokenLanguage,
  AudioPlaybackSpeed,
  ExplanationLevel,
  ExplanationStyle,
} from '../../types/aiMentor'

interface AIMentorSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  settings: MentorSettings
  onSaveSettings: (settings: MentorSettings) => void
  onClearAllHistory: () => void
}

export const AIMentorSettingsModal: React.FC<AIMentorSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onClearAllHistory,
}) => {
  const [localSettings, setLocalSettings] = useState<MentorSettings>(settings)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  if (!isOpen) return null

  const handleSave = () => {
    onSaveSettings(localSettings)
    setSavedSuccess(true)
    setTimeout(() => {
      setSavedSuccess(false)
      onClose()
    }, 600)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-7 text-slate-200 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#6658FF]/20 border border-[#6658FF]/30 flex items-center justify-center text-[#8B5CF6]">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">AI Mentor Settings</h3>
              <p className="text-[11px] text-slate-400">Configure academic grading strictness and review persona</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="py-4 space-y-5 text-xs">
          {/* 1. Personality & Tone */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2">
              Mentor Personality & Tone
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                {
                  id: 'supportive-guide',
                  title: 'Supportive Guide',
                  desc: 'Encouraging, step-by-step',
                },
                {
                  id: 'strict-examiner',
                  title: 'Strict Examiner',
                  desc: 'Viva drill, aggressive audit',
                },
                {
                  id: 'technical-architect',
                  title: 'System Architect',
                  desc: 'Code, schema, diagrams',
                },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() =>
                    setLocalSettings({
                      ...localSettings,
                      personality: opt.id as MentorSettings['personality'],
                    })
                  }
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    localSettings.personality === opt.id
                      ? 'bg-[#6658FF]/20 border-[#6658FF] text-white shadow-xs'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <p className="font-bold text-xs">{opt.title}</p>
                  <p className="text-[10px] mt-0.5 text-slate-400">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Academic Level */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2">
              Target Academic Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'undergraduate', label: 'B.E. / B.Tech' },
                { id: 'postgraduate', label: 'M.Tech / M.C.A.' },
                { id: 'diploma', label: 'Polytechnic Diploma' },
              ].map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() =>
                    setLocalSettings({
                      ...localSettings,
                      academicLevel: lvl.id as MentorSettings['academicLevel'],
                    })
                  }
                  className={`py-2 px-3 rounded-xl text-center border font-semibold transition-all cursor-pointer ${
                    localSettings.academicLevel === lvl.id
                      ? 'bg-[#6658FF]/20 border-[#6658FF] text-white'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2b. Student Learning Depth & Personalization (Optional) */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-white">Learning Depth & Personalization</span>
              <span className="text-[10px] text-slate-400">Optional</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'beginner', label: 'Beginner' },
                  { id: 'intermediate', label: 'Intermediate' },
                  { id: 'advanced', label: 'Advanced' },
                ] as const
              ).map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() =>
                    setLocalSettings({
                      ...localSettings,
                      explanationLevel: lvl.id as ExplanationLevel,
                    })
                  }
                  className={`py-1.5 px-2.5 rounded-lg text-center border font-semibold transition-all cursor-pointer ${
                    (localSettings.explanationLevel || 'intermediate') === lvl.id
                      ? 'bg-[#6658FF]/20 border-[#6658FF] text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                  Explanation Style
                </label>
                <select
                  value={localSettings.explanationStyle || 'step_by_step'}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      explanationStyle: e.target.value as ExplanationStyle,
                    })
                  }
                  className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-[#6658FF]"
                >
                  <option value="step_by_step">Step-by-Step</option>
                  <option value="concise">Concise</option>
                  <option value="architecture_first">Architecture First</option>
                  <option value="example_driven">Example Driven</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                  Team Size
                </label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  placeholder="Default"
                  value={localSettings.teamSize ?? ''}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      teamSize: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-[#6658FF]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                  Timeline (Weeks)
                </label>
                <input
                  type="number"
                  min={1}
                  max={52}
                  placeholder="Default"
                  value={localSettings.durationWeeks ?? ''}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      durationWeeks: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-[#6658FF]"
                />
              </div>
            </div>
          </div>

          {/* 3. Citation Standard */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#8B5CF6]" />
              Preferred Citation Format
            </label>
            <select
              value={localSettings.citationFormat}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  citationFormat: e.target.value as MentorSettings['citationFormat'],
                })
              }
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-[#6658FF]"
            >
              <option value="ieee">IEEE Standard (Numerical [1], Engineering Default)</option>
              <option value="acm">ACM Style (Computing Machinery)</option>
              <option value="apa">APA 7th Edition (Author, Date)</option>
            </select>
          </div>

          {/* 4. Academic Integrity Guard */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold text-xs text-white">Enforce Academic Integrity</p>
                <p className="text-[10px] text-slate-400">
                  Flags potential plagiarism risks, template dependencies, and AI detection vulnerabilities.
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={localSettings.enforceAcademicIntegrity}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  enforceAcademicIntegrity: e.target.checked,
                })
              }
              className="w-4 h-4 rounded text-[#6658FF] focus:ring-0 cursor-pointer accent-[#6658FF]"
            />
          </div>

          {/* 5. Voice Intelligence & Audio Preferences */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-xs">
              <Headphones className="w-4 h-4 text-[#8B5CF6]" />
              <span>Voice Intelligence Preferences</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Spoken Language */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  Spoken Language
                </label>
                <select
                  value={localSettings.voiceLanguage || 'auto'}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      voiceLanguage: e.target.value as SpokenLanguage,
                    })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-[#6658FF]"
                >
                  <option value="auto">Auto-Detect (Adaptive)</option>
                  <option value="en">English (Indian Accent)</option>
                  <option value="kn">ಕನ್ನಡ (Kannada)</option>
                  <option value="hi">हिंदी (Hindi)</option>
                </select>
              </div>

              {/* Default Speed */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Default Playback Speed
                </label>
                <select
                  value={localSettings.defaultPlaybackSpeed || 1}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      defaultPlaybackSpeed: parseFloat(e.target.value) as AudioPlaybackSpeed,
                    })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-[#6658FF]"
                >
                  <option value={0.75}>0.75x (Careful Study)</option>
                  <option value={1}>1.0x (Normal Pace)</option>
                  <option value={1.25}>1.25x (Brisk Pace)</option>
                  <option value={1.5}>1.5x (Fast Review)</option>
                </select>
              </div>
            </div>

            {/* Interruption Toggle */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
              <span className="text-[11px] text-slate-300">Allow Speech Interruption</span>
              <input
                type="checkbox"
                checked={localSettings.enableVoiceInterruption ?? true}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    enableVoiceInterruption: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded text-[#6658FF] focus:ring-0 cursor-pointer accent-[#6658FF]"
              />
            </div>
          </div>

          {/* 5. Clear History */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-300">Clear Conversations</p>
              <p className="text-[10px] text-slate-400">Remove all stored discussions and mock threads</p>
            </div>
            {!showClearConfirm ? (
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-rose-400 hover:text-white hover:bg-rose-500/10 border border-rose-500/20 transition-colors cursor-pointer text-xs font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="px-2.5 py-1 text-slate-400 hover:text-white text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClearAllHistory()
                    setShowClearConfirm(false)
                    onClose()
                  }}
                  className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors"
                >
                  Confirm Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Award className="w-3.5 h-3.5 text-[#8B5CF6]" />
            <span>CampusProjectHub AI 2.0</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-[#6658FF] hover:bg-[#5546FF] transition-all shadow-md active:scale-95 cursor-pointer"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Preferences</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AIMentorSettingsModal
