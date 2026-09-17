# Agent Assistance — Technical Project Report

## 1. Project Overview

### 1.1 Background and Motivation

Modern users increasingly need to manage large volumes of information across multiple sources, including emails, messages, meetings, academic schedules, and personal tasks. Conventional time-management applications primarily focus on task storage, calendar visualization, and reminders, leaving users responsible for manually decomposing tasks, prioritizing activities, and allocating available time.

**Agent Assistance** was developed to address these limitations through an **AI-powered orchestration assistant**. Instead of functioning solely as a task-management tool, the system analyzes user requests, task priorities, cognitive demand, personal habits, and calendar availability to support automated task planning and schedule conflict resolution.

The core objective is to reduce the user's cognitive overhead associated with planning and allow natural-language interaction with personal productivity tools.

---

## 2. Target Users

The system is designed to support several user groups:

* **Students:** Manage academic schedules, examination preparation, and study activities. The system can decompose larger study objectives into smaller tasks and recommend appropriate time slots for theoretical and practical activities.
* **Professionals and Managers:** Manage schedules containing meetings, emails, and multiple concurrent responsibilities. The system provides email integration and AI-assisted email summarization and response generation.
* **General Productivity Users:** Support users who need assistance with maintaining personal schedules, managing recurring activities, and resolving scheduling conflicts.

---

## 3. System Concept and Architecture

### 3.1 System Overview

**Agent Assistance** is a web-based AI productivity platform built around three primary components:

#### 1. AI Chat Panel

The AI Chat Panel provides a natural-language interface between the user and the system.

Users can express scheduling requirements using natural language rather than interacting directly with individual calendar fields. The AI interprets the request and uses **Function/Tool Calling** to perform operations against the task and scheduling system.

Examples include:

* Creating new tasks.
* Updating existing tasks.
* Deleting tasks.
* Saving user habits.
* Generating schedules based on available time.

#### 2. Smart Calendar

The Smart Calendar provides calendar visualization through **Day, Week, and Month views**.

The calendar supports task status and priority tracking, including:

* `PINNED`
* `DRAFT`
* `DONE`

It also provides task-level time tracking, countdown functionality, and schedule conflict detection to help users identify overlapping activities.

#### 3. Notification Hub

The Notification Hub integrates with external email services such as **Gmail and Outlook**.

Its primary responsibilities include:

* Detecting incoming emails.
* Retrieving unread emails.
* Generating email summaries.
* Generating AI-assisted email responses.
* Waiting for explicit user confirmation before sending a generated response.

---

## 4. User Workflow

### 4.1 Authentication and Onboarding

Users authenticate through Google or Microsoft using **Firebase Authentication**.

During the onboarding process, users can configure:

* Time zone.
* Personal habits.
* Required email permissions.

The authentication flow also provides access tokens required for interacting with supported email APIs.

### 4.2 Natural-Language Schedule Creation

Users interact with the system through the AI Chat Panel.

For example:

> "Create a Python theory study schedule for tomorrow afternoon."

The AI processes the request, evaluates available scheduling information, considers user habits, and creates the corresponding task or schedule entries.

### 4.3 Schedule Conflict Detection

When a newly generated task overlaps with an existing calendar event, the system detects the conflict and provides a warning through the chat interface.

The AI can then identify alternative available time slots and propose a rescheduling option.

### 4.4 Email Processing

When unread emails are detected, the system generates notifications through the Notification Hub.

Users can request:

* A summary of the email content.
* An AI-generated professional response.

Generated responses require user confirmation before they are sent.

### 4.5 Calendar Interaction

Users can select individual calendar blocks to inspect task details, monitor the remaining time before execution, and update task completion status.

---

## 5. Technology Stack

### 5.1 Frontend

* **React.js:** Used to implement the interactive user interface and application components.
* **Vite:** Used as the frontend development and build tool.
* **TailwindCSS:** Used for responsive and utility-based UI styling, including dark mode, accent colors, and micro-animations.
* **React Router:** Handles client-side routing between the onboarding and workspace flows.
* **React Markdown:** Renders structured AI-generated responses as formatted content.

### 5.2 Backend and External Integrations

* **Node.js / Express:** Provides the backend API layer and task-management endpoints such as `/api/tasks`.
* **Firebase Authentication:** Provides OAuth2-based authentication through Google and Microsoft providers.
* **Gmail API:** Retrieves unread emails through API requests and supports the email-processing workflow.

### 5.3 Artificial Intelligence

* **Google GenAI SDK — Gemini 3 Flash Preview:** Provides the natural-language processing and reasoning layer of the application.

* **Function/Tool Calling:** Allows the AI agent to invoke application-level functions instead of returning text-only responses. Implemented functions include:

  * `manage_tasks`
  * `update_task`
  * `delete_task`
  * `save_user_habit`

* **Energy-Aware & Smart Breakdown Prompting:** A system-prompt-based approach used to decompose complex tasks into smaller activities and allocate tasks according to their estimated cognitive demand. Higher-demand activities (**Deep Work**) are preferentially scheduled during the morning or afternoon, while lower-demand activities (**Shallow Work**) can be allocated to less cognitively intensive periods.

---

## 6. Key Technical Features

### 6.1 AI-Based Task Orchestration

The system extends conventional calendar functionality by introducing an AI orchestration layer capable of interpreting natural-language scheduling requests and converting them into executable task operations.

Rather than requiring users to manually configure every calendar entry, the AI can determine the required task operations and invoke the appropriate backend tools.

### 6.2 Context-Aware Scheduling

Task scheduling considers multiple contextual factors, including:

* Existing calendar availability.
* Task deadlines.
* Task difficulty.
* User-defined habits.
* Cognitive demand.

This enables the system to generate schedules based on more than simple chronological availability.

### 6.3 Automated Task Decomposition

Complex tasks can be decomposed into smaller, actionable units through the Smart Breakdown Prompting mechanism.

For example, a high-level learning objective can be transformed into multiple study activities rather than represented as a single large calendar block.

### 6.4 Schedule Conflict Detection

The system checks newly created scheduling entries against existing events and identifies overlapping time periods.

When a conflict occurs, the user receives an immediate notification and alternative scheduling options can be proposed.

### 6.5 AI-Assisted Email Processing

The Notification Hub combines email retrieval with AI-based language processing to reduce the amount of manual work required for email management.

The workflow supports both **email summarization** and **response generation**, while maintaining a user-confirmation step before sending generated responses.

---

## 7. Application Value

### 7.1 Reduced Cognitive Overhead

The system reduces the amount of manual planning required from users. Instead of determining exactly when and how to schedule each task, users can provide high-level requirements and allow the AI to process scheduling constraints.

### 7.2 Natural-Language Interaction

Users can interact with the scheduling system using natural language rather than navigating multiple configuration interfaces.

This provides a more direct interaction model for task creation and schedule management.

### 7.3 Unified Productivity Workspace

The system combines task management, calendar management, AI interaction, and email processing within a single workspace.

This reduces the need to repeatedly switch between separate productivity applications.

### 7.4 Automated Email Assistance

The system provides automated email retrieval, summarization, and response generation, reducing repetitive manual operations associated with email management.

---

## 8. Current Implementation Status

The project is currently at the **Demo / MVP Completion** stage. The implemented functionality can be tested in a local development environment using:

```bash
npm run dev
```

The current application runs on port `3001`.

### 8.1 Implemented Features

The following features have been implemented:

* Comprehensive user interface containing:

  * AI Chat Panel.
  * Calendar with Day/Week/Month views.
  * Notification Toasts.
* Google Authentication integration.
* Gmail API integration for retrieving unread emails.
* Automatic email notifications.
* Gemini AI integration.
* Function/Tool Calling for task creation, deletion, and updates.
* Schedule Conflict Detection and warning mechanisms.

### 8.2 Planned Improvements

Several areas remain for further development:

1. **Extended External Integrations**

   Deeper integration with Outlook and LinkedIn APIs to expand the capabilities of the Notification Hub.

2. **Production Database**

   Migration from the current in-memory/local-file data layer to a production-grade database solution such as **PostgreSQL with Prisma**.

3. **Production Deployment**

   Deployment of the application to cloud platforms such as **Vercel** and **Render** to provide access for end users.

---

## 9. Conclusion

**Agent Assistance** demonstrates an AI-driven approach to personal productivity management by combining natural-language interaction, task orchestration, calendar management, schedule conflict detection, and email assistance within a unified web application.

The current MVP demonstrates the core interaction between the AI agent and application-level tools, while the planned database, external API integrations, and production deployment represent the next stages toward a more complete production-ready system.
