# 09 — Academic Project Repository Architecture

The **Academic Project Repository** is the foundational institutional archive of CampusProjectHub, preserving complete academic capstone dossiers across cohorts.

---

## 1. Dual-Mode Storage Architecture

The repository operates in a resilient dual-mode architecture:
- **Primary Persistence:** MongoDB via Mongoose ODM (`projects` collection) utilizing compound indexes for rapid text search, department filtering, and academic year sorting.
- **In-Memory Fallback Store (`InMemoryProjectStore`):** Concurrent Map-backed store ensuring uninterrupted operation in local offline development, sandboxed environments, or transient database outages.

```text
[Incoming Query / Compare Request]
               |
               v
    [Repository Controller]
               |
        +------+------+
        |             |
        v             v
  [MongoDB Atlas]  [InMemoryProjectStore] (Instant Fallback)
```

---

## 2. Canonical 33-Field Project Schema

Every repository record contains comprehensive technical, academic, and provenance metadata:

```typescript
export interface IProject {
  id: string
  title: string
  slug: string
  abstract: string
  introduction?: string
  problemStatement: string
  objectives: string[]
  existingSystem?: string
  proposedSystem?: string
  solution?: string
  scope?: string
  features: string[]
  modules: IProjectModule[]
  architecture?: {
    description?: string
    diagramUrl?: string
  }
  technologyStack: ITechnologyItem[]
  methodology?: string
  limitations?: string[]
  futureEnhancements?: string[]
  academicYear: string
  semester?: string
  department: string
  collegeId: string
  teamId?: string
  teamMembers: ITeamMember[]
  facultyGuide: IFacultyGuide
  screenshots: IScreenshot[]
  reportDocuments: IReportDocument[]
  demoUrl?: string
  githubUrl?: string
  documentationUrl?: string
  sourceType: 'ADMIN_IMPORTED_HISTORICAL' | 'STUDENT_SUBMISSION'
  reviewStatus: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'CHANGES_REQUESTED' | 'APPROVED' | 'REJECTED'
  verificationStatus: 'PENDING_VERIFICATION' | 'VERIFIED_HISTORICAL' | 'FACULTY_APPROVED'
  uploadedBy: string
  approvedBy?: string
  approvedAt?: Date
  rejectionReason?: string
  changeRequests?: IChangeRequest[]
  embedding?: number[]
  createdAt: Date
  updatedAt: Date
}
```

---

## 3. Seeded Historical Benchmarks

The repository includes 7 verified departmental projects seeded during bootstrapping (`repository.seeder.ts`):

1. **Smart Campus Attendance & Navigation System** (2024–2025, CSE)
2. **Autonomous Drone Crop Health Monitor** (2024–2025, ISE / ECE)
3. **Decentralized Academic Credential Verification** (2023–2024, CSE)
4. **AI-Powered Medical Image Pathology Assistant** (2023–2024, AI & Data Science)
5. **Real-Time IoT Energy Grid Management** (2022–2023, EEE)
6. **Automated Defect Detection in Manufacturing** (2022–2023, Mechanical)
7. **Privacy-Preserving Federated Learning for Hospitals** (2023–2024, CSE)

---

## 4. Privacy & Contact Masking Protocol

To safeguard student privacy and prevent spam or harassment:
- `teamMembers.email` and `teamMembers.phone` are **strictly masked** (`"***@college.edu"`, `"***-***-****"`) in all public API responses.
- Internal faculty review notes (`changeRequests.notes`, `rejectionReason`) are stripped from public responses unless the requester is an authorized faculty member or administrator.
- Contact requests must pass through the consent-based in-platform mentorship gateway.

---

## 5. Verification Lifecycle
- `PENDING_VERIFICATION`: Student upload awaiting departmental confirmation.
- `VERIFIED_HISTORICAL`: Admin-imported past batch capstone verified from physical library archives.
- `FACULTY_APPROVED`: Capstone formally approved by an internal faculty panel upon viva completion.
