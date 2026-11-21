# LearnSphere — Project Overview

## 1. Vision & Purpose
**LearnSphere** is a production-grade, SaaS-style Learning Management System (LMS) built on the MERN stack (MongoDB, Express.js, React, Node.js) with end-to-end TypeScript. It enables instructors to author rich, structured courses with assessments, students to learn interactively and earn verifiable certificates, and administrators to govern platform operations and analyze real-time metrics.

## 2. Core Pillars
- **Multi-Role Domain Separation**: Purpose-built workflows for **Students**, **Instructors**, and **Administrators** protected by server-side Role-Based Access Control (RBAC) and strict resource ownership rules.
- **Structured Curriculum Engine**: Hierarchical `Course -> Section -> Lesson` architecture supporting video streams, rich text/markdown, downloadable resources, and embedded media.
- **Interactive Assessment & Certification**: Server-graded multi-type quizzes (`mcq`, `multi_select`, `true_false`) with attempt limits, instructor-graded file/text assignments with grade histories, and cryptographically unique completion certificates with public verification.
- **Production Engineering Standards**: Modular backend architecture, Zod runtime schema validation, centralized error handling, automated integration testing (Vitest + Supertest), Docker containerization, and GitHub Actions CI targeting the `master` branch.

## 3. Target Personas
1. **Student**: Discovers courses via catalog filters, enrolls, consumes lessons in a distraction-free learning player, tracks progress, completes quizzes/assignments, participates in course discussions, and downloads verifiable certificates.
2. **Instructor**: Creates and manages courses, structures curriculum sections/lessons, authors quizzes and assignments, reviews student submissions, broadcasts announcements, and monitors course performance analytics.
3. **Administrator**: Governs user accounts and roles, moderates course submissions (`pending_review -> published | rejected`), curates categories, resolves flagged discussion content, and tracks platform-wide analytics.
