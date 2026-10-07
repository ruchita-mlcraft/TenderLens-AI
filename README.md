# TenderLens AI

AI-powered tender and RFP analysis platform that transforms lengthy procurement documents into clear, actionable insights.

## 🚀 Live Demo

https://tenderlensai.vercel.app

## 📌 About

## 📌 About

TenderLens AI is an AI-powered tender and RFP analysis platform that transforms lengthy procurement documents into structured, actionable insights. Users can upload a tender PDF, automatically extract key requirements and deadlines, and ask questions about the document using natural language.

Upload a tender PDF and the platform extracts important information such as:

- Tender title and ID
- Organization
- Estimated value
- Earnest Money Deposit (EMD)
- Important dates and deadlines
- Eligibility requirements
- Technical requirements
- Financial requirements
- Required documents
- Scope of work
- Important conditions

Users can also ask questions about the uploaded tender and receive answers based only on the document content.

## ✨ Features

### 📄 Tender Document Analysis
Upload a PDF tender or RFP and automatically extract important information.

### 🤖 AI-Powered Insights
Gemini AI analyzes the document and organizes complex tender information into structured sections.

### 💬 Ask TenderLens
Ask natural-language questions about the uploaded tender and get document-based answers.

### 📅 Important Dates
View submission deadlines and other important tender dates in a structured timeline.

### 📊 Tender Overview
Quickly view eligibility requirements, technical and financial requirements, and required documents.

### 🔒 Document-Based Answers
The AI is instructed to answer questions using the uploaded tender document rather than relying on outside information.

## 🛠️ Tech Stack

### Frontend
- React.js
- Vite
- CSS
- Lucide React

### Backend
- Python
- FastAPI
- Uvicorn
- Pydantic
- PyPDF

### AI
- Google Gemini API

### Deployment
- Vercel — Frontend
- Render — Backend
- GitHub — Source Control

## 🏗️ Architecture

```text
User
 │
 ▼
React + Vite
(Vercel)
 │
 │ REST API
 ▼
FastAPI
(Render)
 │
 ├── PDF Extraction
 │
 ├── Document Processing
 │
 └── Gemini AI
       │
       ▼
  Tender Analysis
       │
       ▼
 React UI

