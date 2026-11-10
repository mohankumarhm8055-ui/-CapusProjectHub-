import { ProjectRepository } from './project.model.js'

export async function seedRepository(): Promise<number> {
  const existing = await ProjectRepository.getAllAccessible('rvce-main')
  if (existing.length >= 7) {
    return existing.length
  }

  const seedData = [
    {
      title: 'AI Healthcare Prediction System',
      slug: 'ai-healthcare-prediction-system',
      abstract:
        'The AI Healthcare Prediction System leverages supervised machine learning classification to analyze multi-parameter clinical diagnostic indicators (such as blood glucose, ECG variations, blood pressure, and metabolic markers). By deploying an ensemble of Random Forest and Gradient Boosted models, the system predicts chronic disease risk profiles with over 92% diagnostic sensitivity.',
      introduction: 'Clinical decision-support systems represent a major shift in primary triage diagnostic workflows.',
      problemStatement:
        'Early diagnosis of non-communicable chronic conditions is frequently hindered by fragmented diagnostic data, heavy patient volume in community clinics, and the lack of accessible decision-support tools for primary care nurses.',
      objectives: [
        'Train supervised classification algorithms on clinical benchmark records to predict chronic risk.',
        'Deploy a responsive Flask and React interface for rapid symptom ingestion and real-time inference.',
        'Generate explainable feature-attribution charts using SHAP values for healthcare practitioners.',
        'Maintain strict HIPAA-aligned data anonymization standards for all demonstration patient profiles.',
      ],
      existingSystem: 'Manual paper charts and disjointed lab reports with delayed clinician review.',
      proposedSystem: 'An explainable AI diagnostic triage portal providing immediate risk categorization with SHAP force plots.',
      solution: 'Dual-tier architecture: Flask Scikit-Learn microservice combined with a clinician React dashboard.',
      scope: 'Cardiovascular and diabetic chronic condition risk assessment for ambulatory outpatient clinics.',
      features: [
        'Multi-disease predictive triage (Cardiac, Diabetes, Hypertension)',
        'Clinician biomarker importance visualization with SHAP',
        'Batch CSV patient cohort analysis',
        'Automated referral summary report PDF generation',
      ],
      modules: [
        {
          name: 'Patient Triage Intake',
          description: 'Clinician portal for vital entry, demographic indicators, and bloodwork parameters.',
          features: ['Form validation', 'Range alerts', 'Prior visit lookup'],
        },
        {
          name: 'ML Inference & Explainability Engine',
          description: 'Ensemble model inference pipeline executing Random Forest and XGBoost with SHAP explanations.',
          features: ['Normalized vector scaling', 'Risk probability calibration', 'Top biomarker extraction'],
        },
      ],
      architecture: {
        description: '3-tier decoupled microservice architecture: React client, Python Flask inference API, PostgreSQL vector store.',
      },
      technologyStack: [
        { name: 'Python', category: 'Programming Languages' },
        { name: 'Flask', category: 'Backend' },
        { name: 'React', category: 'Frontend' },
        { name: 'Scikit-learn', category: 'AI/ML' },
        { name: 'PostgreSQL', category: 'Database' },
      ],
      methodology: 'Supervised Learning with Stratified 5-Fold Cross Validation and SMOTE for clinical imbalance.',
      limitations: ['Requires clinical lab test inputs', 'Model trained on benchmark tabular data'],
      futureEnhancements: ['DICOM medical imaging integration', 'FHIR hospital electronic record sync'],
      academicYear: '2025–26',
      semester: '8th Semester',
      department: 'Computer Science & Engineering',
      collegeId: 'rvce-main',
      teamMembers: [
        { studentId: 'senior-ananya-sharma', name: 'Ananya Sharma', role: 'ML Pipeline Lead', isLeader: true, isAvailableForMentoring: true },
        { studentId: 'senior-rohan-verma', name: 'Rohan Verma', role: 'Full Stack Engineer', isAvailableForMentoring: false },
      ],
      facultyGuide: {
        name: 'Dr. Sudha Murthy',
        designation: 'Professor & Dean of Research',
        department: 'Computer Science & Engineering',
        officialEmail: 'sudha.murthy@rvce.edu.in',
      },
      screenshots: [
        { url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d', caption: 'Clinician triage dashboard' },
      ],
      reportDocuments: [
        { title: 'Final Capstone Project Dossier', fileUrl: '/docs/ai-healthcare-dossier.pdf', verified: true },
      ],
      sourceType: 'ADMIN_IMPORTED_HISTORICAL' as const,
      reviewStatus: 'APPROVED' as const,
      verificationStatus: 'VERIFIED_HISTORICAL' as const,
      uploadedBy: 'admin-registrar',
      approvedBy: 'admin-registrar',
      approvedAt: new Date('2025-05-15'),
    },
    {
      title: 'Smart Attendance Management System',
      slug: 'smart-attendance-management-system',
      abstract:
        'A comprehensive contactless facial recognition and BLE beacon attendance management system. Replaces slow roll calls with automated multi-face camera verification, providing faculty with instant attendance analytics, low-attendance alerts, and ERP synchronization.',
      introduction: 'Classroom attendance taking consumes 10-15 minutes of every lecture.',
      problemStatement:
        'Traditional roll calls and biometric fingerprint queues suffer from proxy attendance, hardware bottlenecks, and time loss during short 50-minute academic lecture hours.',
      objectives: [
        'Detect and identify classroom student faces under varying classroom lighting within 2.5 seconds.',
        'Incorporate anti-spoofing liveness checks using Eye Aspect Ratio (EAR) blink detection.',
        'Provide automated real-time SMS/Email notification to parents when student attendance falls below 75%.',
      ],
      features: [
        'Contactless classroom multi-face verification',
        'Anti-spoofing liveness detection (EAR blink verification)',
        'Faculty real-time attendance modification portal',
        'Automatic university ERP attendance export',
      ],
      modules: [
        {
          name: 'Video Capture & Face Detection',
          description: 'MTCNN video stream frame extraction with bounding box alignment.',
        },
        {
          name: 'Embedding Matching Engine',
          description: '128-dimensional FaceNet vector comparison with Euclidean distance indexing.',
        },
      ],
      architecture: {
        description: 'Edge camera node streaming frames to Node.js / OpenCV microservice with MongoDB logging.',
      },
      technologyStack: [
        { name: 'Python', category: 'Programming Languages' },
        { name: 'OpenCV', category: 'Computer Vision' },
        { name: 'Node.js', category: 'Backend' },
        { name: 'React', category: 'Frontend' },
        { name: 'MongoDB', category: 'Database' },
      ],
      academicYear: '2025–26',
      semester: '6th Semester',
      department: 'Information Science & Engineering',
      collegeId: 'rvce-main',
      teamMembers: [
        { studentId: 'senior-kiran-kumar', name: 'Kiran Kumar', role: 'Computer Vision Architect', isLeader: true, isAvailableForMentoring: true },
        { studentId: 'senior-pooja-hegde', name: 'Pooja Hegde', role: 'Frontend & API Engineer', isAvailableForMentoring: true },
      ],
      facultyGuide: {
        name: 'Dr. Ramesh Babu',
        designation: 'Associate Professor',
        department: 'Information Science & Engineering',
        officialEmail: 'ramesh.babu@rvce.edu.in',
      },
      screenshots: [
        { url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4', caption: 'Real-time face tracking' },
      ],
      reportDocuments: [
        { title: 'Smart Attendance Project Thesis', fileUrl: '/docs/attendance-thesis.pdf', verified: true },
      ],
      sourceType: 'STUDENT_SUBMISSION' as const,
      reviewStatus: 'APPROVED' as const,
      verificationStatus: 'FACULTY_APPROVED' as const,
      uploadedBy: 'student-kiran',
      approvedBy: 'faculty-ramesh',
      approvedAt: new Date('2025-11-20'),
    },
    {
      title: 'Smart Learning Platform & Course Recommender',
      slug: 'smart-learning-platform-recommender',
      abstract:
        'An adaptive learning management platform using collaborative filtering and knowledge-graph skill tracing to deliver personalized course paths, quiz assessments, and learning analytics for university departments.',
      problemStatement:
        'Standard university LMS systems present one-size-fits-all syllabi without adapting to individual student mastery rates or prerequisite gaps.',
      objectives: [
        'Build dynamic knowledge graphs for Computer Science subject prerequisites.',
        'Recommend personalized practice problem sets based on quiz failure vectors.',
      ],
      features: [
        'Personalized student prerequisite mastery tree',
        'Adaptive quiz engine with difficulty scaling',
        'Faculty curriculum progress analytics',
      ],
      modules: [
        {
          name: 'Knowledge Graph Engine',
          description: 'Neo4j / Graph structure tracing dependency chains between curriculum topics.',
        },
      ],
      technologyStack: [
        { name: 'TypeScript', category: 'Programming Languages' },
        { name: 'Next.js', category: 'Full Stack' },
        { name: 'Neo4j', category: 'Database' },
        { name: 'PostgreSQL', category: 'Database' },
      ],
      academicYear: '2024–25',
      department: 'Computer Science & Engineering',
      collegeId: 'rvce-main',
      teamMembers: [{ studentId: 'senior-deepak-rao', name: 'Deepak Rao', role: 'Team Lead', isLeader: true, isAvailableForMentoring: true }],
      facultyGuide: {
        name: 'Dr. Geetha V',
        designation: 'Professor',
        department: 'Computer Science & Engineering',
      },
      screenshots: [],
      reportDocuments: [],
      sourceType: 'ADMIN_IMPORTED_HISTORICAL' as const,
      reviewStatus: 'APPROVED' as const,
      verificationStatus: 'VERIFIED_HISTORICAL' as const,
      uploadedBy: 'admin-registrar',
      approvedBy: 'admin-registrar',
      approvedAt: new Date('2024-05-10'),
    },
    {
      title: 'E-Commerce Management System with High Concurrency Locking',
      slug: 'ecommerce-management-system-concurrency',
      abstract:
        'An enterprise-grade academic e-commerce engine demonstrating pessimistic vs. optimistic concurrency control (OCC) to eliminate race conditions during flash-sale inventory reservations.',
      problemStatement:
        'Concurrent checkout operations in unoptimized web stores cause negative inventory, double-sold items, and uncoordinated payment rollbacks.',
      objectives: [
        'Implement distributed optimistic concurrency locking using Redis and PostgreSQL atomic versioning.',
        'Handle 5,000 simulated concurrent cart checkouts without inventory drift.',
      ],
      features: [
        'Atomic stock deduction with TTL expiry reservation',
        'Idempotent payment webhook processing',
        'Admin inventory tracking dashboard',
      ],
      modules: [
        {
          name: 'Inventory Locking Service',
          description: 'Atomic SQL version checks with Redis TTL cache release worker.',
        },
      ],
      technologyStack: [
        { name: 'Node.js', category: 'Backend' },
        { name: 'React', category: 'Frontend' },
        { name: 'Redis', category: 'Cache' },
        { name: 'PostgreSQL', category: 'Database' },
      ],
      academicYear: '2024–25',
      department: 'Information Science & Engineering',
      collegeId: 'rvce-main',
      teamMembers: [{ studentId: 'senior-varun-nair', name: 'Varun Nair', role: 'Backend Lead', isLeader: true, isAvailableForMentoring: false }],
      facultyGuide: {
        name: 'Dr. K. S. Meena',
        designation: 'Associate Professor',
        department: 'Information Science & Engineering',
      },
      screenshots: [],
      reportDocuments: [],
      sourceType: 'STUDENT_SUBMISSION' as const,
      reviewStatus: 'APPROVED' as const,
      verificationStatus: 'FACULTY_APPROVED' as const,
      uploadedBy: 'student-varun',
      approvedBy: 'faculty-meena',
      approvedAt: new Date('2024-11-12'),
    },
    {
      title: 'Student Performance Analytics & Dropout Early Warning',
      slug: 'student-performance-analytics-early-warning',
      abstract:
        'An educational data mining platform that analyzes continuous internal evaluation (CIE), lab scores, and LMS activity to flag students at risk of academic probation or course dropouts 6 weeks prior to final semester exams.',
      problemStatement:
        'Academic advisors frequently identify struggling students only after end-semester examination failures occur.',
      objectives: [
        'Predict semester GPA drop risk with Logistic Regression and Decision Trees.',
        'Provide actionable intervention notifications to faculty mentors and department counselors.',
      ],
      features: [
        'Early risk probability score index',
        'Department grade distribution trend charts',
        'Automated academic counseling scheduler',
      ],
      modules: [
        {
          name: 'Academic Data Ingestion',
          description: 'Parses university grade sheets and attendance logs.',
        },
      ],
      technologyStack: [
        { name: 'Python', category: 'Programming Languages' },
        { name: 'FastAPI', category: 'Backend' },
        { name: 'React', category: 'Frontend' },
        { name: 'SQLite', category: 'Database' },
      ],
      academicYear: '2023–24',
      department: 'Data Science & Artificial Intelligence',
      collegeId: 'rvce-main',
      teamMembers: [{ studentId: 'senior-siddharth-m', name: 'Siddharth M', role: 'Data Scientist', isLeader: true, isAvailableForMentoring: true }],
      facultyGuide: {
        name: 'Dr. N. H. Prasad',
        designation: 'Head of Department',
        department: 'Data Science & Artificial Intelligence',
      },
      screenshots: [],
      reportDocuments: [],
      sourceType: 'ADMIN_IMPORTED_HISTORICAL' as const,
      reviewStatus: 'APPROVED' as const,
      verificationStatus: 'VERIFIED_HISTORICAL' as const,
      uploadedBy: 'admin-registrar',
      approvedBy: 'admin-registrar',
      approvedAt: new Date('2023-05-18'),
    },
    {
      title: 'Campus Event Management & Automated Hall Scheduling',
      slug: 'campus-event-management-scheduling',
      abstract:
        'A university event coordination and facility booking engine using constraint satisfaction algorithms to prevent auditorium double-bookings, equipment clashes, and budget authorization delays.',
      problemStatement:
        'Student clubs face recurring schedule conflicts for campus auditoriums and seminar halls due to paper-based approval workflows.',
      objectives: [
        'Enforce constraint-satisfaction scheduling across 12 campus venues.',
        'Streamline faculty approval signatures into a digital one-click workflow.',
      ],
      features: [
        'Interactive campus venue calendar with conflict auto-detection',
        'Digital multi-tier approval workflow (HOD -> Dean -> Estate Officer)',
        'QR code entry ticketing for registered college participants',
      ],
      modules: [
        {
          name: 'Venue Scheduling Engine',
          description: 'Time-interval overlap checks with room capacity constraints.',
        },
      ],
      technologyStack: [
        { name: 'TypeScript', category: 'Programming Languages' },
        { name: 'Express', category: 'Backend' },
        { name: 'React', category: 'Frontend' },
        { name: 'PostgreSQL', category: 'Database' },
      ],
      academicYear: '2023–24',
      department: 'Computer Science & Engineering',
      collegeId: 'rvce-main',
      teamMembers: [{ studentId: 'senior-harish-gowda', name: 'Harish Gowda', role: 'Full Stack Developer', isLeader: true, isAvailableForMentoring: false }],
      facultyGuide: {
        name: 'Prof. Anitha B',
        designation: 'Assistant Professor',
        department: 'Computer Science & Engineering',
      },
      screenshots: [],
      reportDocuments: [],
      sourceType: 'STUDENT_SUBMISSION' as const,
      reviewStatus: 'APPROVED' as const,
      verificationStatus: 'FACULTY_APPROVED' as const,
      uploadedBy: 'student-harish',
      approvedBy: 'faculty-anitha',
      approvedAt: new Date('2023-10-25'),
    },
    {
      title: 'Academic Project Management & Workflow Tracking Portal [Sample Demo Record]',
      slug: 'academic-project-management-workflow-portal-sample',
      abstract:
        '[Sample Historical Benchmark Data - For Academic Evaluation Demonstration] A web-based portal developed to digitize manual capstone project registration, progress report submissions, and mentor sign-offs within an academic department. The system replaced spreadsheet logs with relational records, providing role-based dashboard views for students and faculty guides.',
      introduction:
        'Note: This is a realistic hypothetical record generated for academic evaluation demonstration of college project repositories. It does not represent an actual historical college project.',
      problemStatement:
        'Manual paper-based project tracking and disparate email submissions caused tracking latency, lost milestone documentation, and scheduling delays during semester progress reviews.',
      objectives: [
        'Digitize project registration forms for student teams.',
        'Provide basic faculty milestone sign-off dashboards.',
        'Archive final project PDF documents in centralized repository storage.',
      ],
      existingSystem: 'Paper-based logbooks and manual spreadsheets managed by departmental coordinators.',
      proposedSystem: 'A web portal for project registration, static milestone sign-offs, and PDF upload.',
      solution: 'CRUD application using Node.js, Express, and MySQL with static file storage.',
      scope: 'Departmental project tracking without automated intelligence or dynamic templating.',
      features: [
        'Student team registration and project title logging',
        'Basic milestone task checklist and progress percentage calculation',
        'Faculty approval dashboard with approval/rejection toggle',
        'Static document repository storing submitted PDF reports',
      ],
      modules: [
        {
          name: 'Project Registry & Team Roster',
          description: 'Basic student team profile creation and title submission.',
        },
        {
          name: 'Milestone Tracking',
          description: 'Checklist of phase deadlines with file upload slots.',
        },
      ],
      architecture: {
        description: 'Monolithic MVC web application architecture with local filesystem document storage.',
      },
      technologyStack: [
        { name: 'JavaScript', category: 'Programming Languages' },
        { name: 'Node.js', category: 'Backend' },
        { name: 'Express', category: 'Backend' },
        { name: 'React', category: 'Frontend' },
        { name: 'MySQL', category: 'Database' },
      ],
      methodology: 'Standard Agile iterative development across 3 academic milestones.',
      limitations: [
        'No semantic or token-based duplicate idea detection',
        'No AI feasibility analysis or honest mentor feedback',
        'Static document uploads only with no automated DOCX/PDF proposal compilation',
      ],
      futureEnhancements: [
        'AI-driven duplicate similarity detection',
        'Real-time streaming mentor assistance',
        'Automated university template generation',
      ],
      academicYear: '2023–24',
      semester: '7th Semester',
      department: 'Computer Science & Engineering',
      collegeId: 'rvce-main',
      teamMembers: [
        { studentId: 'senior-karthik-rao', name: 'Karthik Rao', role: 'Full Stack Developer', isLeader: true, isAvailableForMentoring: true },
        { studentId: 'senior-pooja-hegde', name: 'Pooja Hegde', role: 'Database Designer', isAvailableForMentoring: true },
      ],
      facultyGuide: {
        name: 'Dr. Ramesh Kumar',
        designation: 'Associate Professor',
        department: 'Computer Science & Engineering',
        officialEmail: 'ramesh.kumar@rvce.edu.in',
      },
      screenshots: [],
      reportDocuments: [
        {
          title: 'Project Completion Summary [Sample Record]',
          fileUrl: '/docs/sample-project-portal-summary.pdf',
          verified: true,
        },
      ],
      sourceType: 'ADMIN_IMPORTED_HISTORICAL' as const,
      reviewStatus: 'APPROVED' as const,
      verificationStatus: 'VERIFIED_HISTORICAL' as const,
      uploadedBy: 'admin-registrar',
      approvedBy: 'admin-registrar',
      approvedAt: new Date('2024-04-10'),
    },
  ]

  let count = 0
  for (const item of seedData) {
    await ProjectRepository.create(item)
    count++
  }

  console.log(`[Repository Seeder] Successfully seeded ${count} verified academic projects into the repository.`)
  return count
}
