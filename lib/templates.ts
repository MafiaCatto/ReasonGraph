import { Decision } from "./types";

export const DECISION_TEMPLATES: Record<string, Decision> = {
  career: {
    id: "career-strategy",
    title: "What should I optimize for in the next two years of my career?",
    context: "Balancing high learning curve, equity upside, and sustainable workload.",
    confidence: 72,
    updatedAt: new Date().toISOString(),
    criteria: [
      { id: "c1", name: "Learning velocity", weight: 30 },
      { id: "c2", name: "Financial runway & comp", weight: 25 },
      { id: "c3", name: "Career optionality", weight: 25 },
      { id: "c4", name: "Energy & work sustainability", weight: 20 },
    ],
    options: [
      { id: "o1", name: "Stay & Specialize (BigTech)", scores: { c1: 6, c2: 9, c3: 6, c4: 8 } },
      { id: "o2", name: "Join Seed-Stage Startup", scores: { c1: 9, c2: 5, c3: 8, c4: 4 } },
      { id: "o3", name: "Build Independently / Bootstrapping", scores: { c1: 8, c2: 3, c3: 9, c4: 6 } },
    ],
  },
  database: {
    id: "database-architecture",
    title: "Which primary database should we adopt for our high-throughput transactional service?",
    context: "System expects 25,000 writes/sec with strict latency SLAs and flexible schema iteration.",
    confidence: 85,
    updatedAt: new Date().toISOString(),
    criteria: [
      { id: "db_c1", name: "Write throughput & latency", weight: 35 },
      { id: "db_c2", name: "Operational overhead (serverless/managed)", weight: 25 },
      { id: "db_c3", name: "Relational integrity & ACID support", weight: 25 },
      { id: "db_c4", name: "Team familiarity & ecosystem tooling", weight: 15 },
    ],
    options: [
      { id: "db_o1", name: "Amazon DynamoDB (On-Demand)", scores: { db_c1: 9, db_c2: 9, db_c3: 4, db_c4: 6 } },
      { id: "db_o2", name: "PostgreSQL (Aurora Serverless)", scores: { db_c1: 7, db_c2: 7, db_c3: 10, db_c4: 9 } },
      { id: "db_o3", name: "MongoDB Atlas", scores: { db_c1: 7, db_c2: 8, db_c3: 6, db_c4: 7 } },
    ],
  },
  infrastructure: {
    id: "cloud-infrastructure",
    title: "How should our engineering team deploy and orchestrate backend services?",
    context: "Microservices transition with a small 6-person engineering team.",
    confidence: 78,
    updatedAt: new Date().toISOString(),
    criteria: [
      { id: "inf_c1", name: "Time to market & simplicity", weight: 35 },
      { id: "inf_c2", name: "Cold start & tail latency", weight: 25 },
      { id: "inf_c3", name: "Monthly infrastructure cost", weight: 20 },
      { id: "inf_c4", name: "Vendor lock-in risk", weight: 20 },
    ],
    options: [
      { id: "inf_o1", name: "Serverless (AWS Lambda / Cloud Run)", scores: { inf_c1: 9, inf_c2: 5, inf_c3: 8, inf_c4: 4 } },
      { id: "inf_o2", name: "Containerized Kubernetes (EKS)", scores: { inf_c1: 4, inf_c2: 9, inf_c3: 5, inf_c4: 9 } },
      { id: "inf_o3", name: "Modular Monolith on ECS Fargate", scores: { inf_c1: 8, inf_c2: 8, inf_c3: 7, inf_c4: 7 } },
    ],
  },
};
