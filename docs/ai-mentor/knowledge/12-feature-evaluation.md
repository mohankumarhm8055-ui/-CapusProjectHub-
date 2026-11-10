# 12 — The Seven-Dimensional AI Feature Evaluation Engine

The **AI Feature Evaluation Engine** is an intelligent pedagogical auditor embedded in `/ai-mentor`. It prevents the primary cause of capstone failure: **semester scope creep**.

---

## 1. The Seven Evaluation Dimensions

Rather than assigning arbitrary, indefensible percentage scores, the engine evaluates each proposed feature across 7 objective academic dimensions:

| Dimension | Core Analytical Question | Evaluation Output |
| :--- | :--- | :--- |
| **1. Problem Relevance** | Does this feature address genuine operational or academic friction? | `solvesRealProblem: boolean`, Rationale |
| **2. User Value** | Who directly benefits (Student, Faculty, or Both) and how? | `primaryBeneficiary: 'student' \| 'faculty' \| 'both'`, Rationale |
| **3. Originality** | What is the novel technical contribution beyond generic CRUD? | `contributionType: string`, Rationale |
| **4. Technical Feasibility** | Can an undergraduate team implement this within their stated skills? | `realisticForTeam: boolean`, Rationale |
| **5. Complexity** | What is the inherent architectural and algorithmic difficulty? | `level: 'LOW' \| 'MEDIUM' \| 'HIGH' \| 'CRITICAL'`, Rationale |
| **6. Resource Requirements** | Does this require cloud GPU budgets, paid APIs, or specialized hardware? | `requiredResources: string[]`, Rationale |
| **7. Time Suitability** | Can this be designed, built, and tested within the semester weeks? | `fitsDeadline: boolean`, `estimatedWeeks: number`, Rationale |

---

## 2. Four Feature Classifications

Features receive one of four formal classifications:

```text
+------------------+-----------------------------------------------------------+
| Classification   | Definition & Academic Role                                |
+------------------+-----------------------------------------------------------+
| ESSENTIAL        | Mandatory core deliverable required for academic validity.|
| RECOMMENDED      | High-value enhancement demonstrating technical maturity.  |
| OPTIONAL         | Secondary feature that can be deferred if time runs short.|
| UNNECESSARY      | High-risk, non-core feature introducing failure points.   |
+------------------+-----------------------------------------------------------+
```

### Case Study: Real-Time AI Voice Interaction (WebRTC)
- **Classification:** `UNNECESSARY`
- **Pedagogical Rationale:** Academic capstone examiners require precise code inspection, tables, and structured text. Voice audio introduces network socket latency, ambient noise failures during live vivas, and audio transcription errors on technical syntax keywords.
- **Simpler Alternative Provided:** Text streaming with simulated voice preview.
- **Formulated Defense Trade-off:** *"Trade-off: Excluding Real-Time Voice WebRTC saves 6 weeks of high-risk socket engineering, eliminates microphone viva failure risk, and allows your team to focus 100% on core academic deliverables."*

---

## 3. Holistic Project Feasibility Ratings

The engine aggregates dimensional scores and constraints (Team Size, Technical Experience, Duration) to compute an overall rating:
- **`FEASIBLE_INITIAL`**: Scope aligns cleanly with team capabilities and semester timeline.
- **`FEASIBLE_REDUCED_SCOPE`**: Vision is sound, but high-risk or unnecessary features must be pruned.
- **`REQUIRES_RESOURCES_OR_TIME`**: Requires extended timelines (e.g. major year-long project) or cloud funding.
- **`NOT_FEASIBLE`**: Scope cannot be accomplished within the constraints (e.g., beginner solo student in 4 weeks).

---

## 4. Student-Controlled Decision Authority

Students retain complete authority over their implementation scope through three controls on every feature card:
- **`Accept`**: Feature included in Phase 1 or Phase 2 deliverables.
- **`Reject`**: Feature excluded from deliverables; the engine automatically writes a transparent trade-off rationale for faculty defense.
- **`Modify`**: Student narrows feature boundaries (e.g., replacing custom document authoring with fixed VTU template).

### Decision Persistence Across Scope Reassessment
When students modify project constraints (e.g. extending duration from 8 to 16 weeks) and trigger a reassessment, the engine increments the evaluation version (`v1` ➔ `v2`) while **strictly preserving all prior student decisions**. Rejected features are never silently re-added.
