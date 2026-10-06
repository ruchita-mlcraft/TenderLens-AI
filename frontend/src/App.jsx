import { useRef, useState } from "react"
import "./App.css"

import {
  CircleCheck,
  SlidersHorizontal,
  FileText,
  CalendarDays,
  Hash,
  IndianRupee,
  WalletCards
} from "lucide-react"

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
console.log("API URL:", API_URL)
function App() {
  const fileInputRef = useRef(null)

  const [uploading, setUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState("")
  const [extractedText, setExtractedText] = useState("")
  const [analysis, setAnalysis] = useState(null)
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState("")
  const [asking, setAsking] = useState(false)
  const [chunks, setChunks] = useState([])
  const [showExtractedText, setShowExtractedText] = useState(false)

  const handleFileUpload = async (event) => {
  const file = event.target.files?.[0]

  if (!file) return

  const allowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ]

  if (!allowedTypes.includes(file.type)) {
    setUploadMessage("✕ Please upload a PDF or DOCX file.")
    event.target.value = ""
    return
  }

  setUploading(true)
  setUploadMessage("Uploading document...")
  setExtractedText("")
  setAnalysis(null)

  const formData = new FormData()
  formData.append("file", file)

  try {
    const response = await fetch(
       `${API_URL}/api/tenders/upload`,
      {
        method: "POST",
        body: formData,
      }
    )

    const responseText = await response.text()

    console.log("Backend status:", response.status)
    console.log("Backend raw response:", responseText)

    let data = null

    try {
      data = JSON.parse(responseText)
    } catch {
      throw new Error(
        "Backend did not return valid JSON. Check the Python backend."
      )
    }

    console.log("Backend parsed response:", data)

    if (!response.ok) {
      throw new Error(
        data?.detail || `Upload failed (${response.status})`
      )
    }

    if (!data) {
      throw new Error("Backend returned an empty response")
    }

    setUploadMessage(
      `✓ ${data.filename || file.name} uploaded and analyzed successfully`
    )

    setExtractedText(data.text || "")
    setAnalysis(data.analysis || null)
    setChunks(data.chunks || [])

  } catch (error) {
    console.error("Upload error:", error)

    setUploadMessage(
      `✕ ${error.message || "Something went wrong while uploading."}`
    )

  } finally {
    setUploading(false)

    event.target.value = ""
  }
}

  const openFilePicker = () => {
    if (!uploading) {
      fileInputRef.current?.click()
    }
  }

  const askTender = async () => {
  if (!question.trim()) return

  if (!chunks.length) {
    setAnswer("Please upload a tender document first.")
    return
  }

  setAsking(true)
  setAnswer("")

  try {
    const response = await fetch(
       `${API_URL}/api/tenders/ask`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: question,
          chunks: chunks,
        }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.detail || "Failed to get answer")
    }

    setAnswer(data.answer || "No answer returned.")
  } catch (error) {
    setAnswer(
      error.message || "Something went wrong while asking TenderLens."
    )
  } finally {
    setAsking(false)
  }
}

  return (
    <div className="app">

      {/* Navigation */}
      <nav className="navbar">
        <div className="logo">
          <span className="logo-icon">T</span>
          <span>TenderLens AI</span>
        </div>

        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
        </div>
      </nav>

      <main>

        {/* Hero Section */}
        <section className="hero">

          <div className="hero-content">

            <div className="badge">
              AI-Powered Tender Intelligence
            </div>

            <h1>
              Understand complex tenders
              <span> in minutes.</span>
            </h1>

            <p>
              Upload a tender or RFP and let AI extract requirements,
              deadlines, eligibility criteria, and important documents
              using intelligent document analysis.
            </p>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              style={{ display: "none" }}
              onChange={handleFileUpload}
            />

            {/* Upload Button */}
            <button
              className="upload-button"
              onClick={openFilePicker}
              disabled={uploading}
            >
              {uploading ? "Uploading..." : "Upload Tender"}
            </button>

            {/* Upload Message */}
            {uploadMessage && (
              <p className="upload-message">
                {uploadMessage}
              </p>
            )}

{/* AI Analysis */}
{analysis && (
  <section className="analysis-results">

    {/* Analysis Header */}
    <div className="analysis-hero">
      <div>
        <p className="section-label">AI ANALYSIS</p>

        <h2>
          {analysis.tender_title || "Tender Analysis"}
        </h2>

        <p className="analysis-organization">
          {analysis.organization || "Organization not specified"}
        </p>
      </div>

      <div className="analysis-status">
        <span className="status-dot"></span>
        Analysis Ready
      </div>
    </div>

    {/* Key Information */}
<div className="analysis-info-grid">

  {/* Tender ID */}
  <div className="info-card">
    <div className="info-icon tender-id-icon">
      <Hash size={25} strokeWidth={2} />
    </div>

    <div className="info-content">
      <span className="info-label">Tender ID</span>

      <strong>
        {analysis.tender_id || "Not specified"}
      </strong>
    </div>
  </div>


  {/* Estimated Value */}
  <div className="info-card">
    <div className="info-icon value-icon">
      <IndianRupee size={25} strokeWidth={2} />
    </div>

    <div className="info-content">
      <span className="info-label">Estimated Value</span>

      <strong>
        {analysis.estimated_value || "Not specified"}
      </strong>
    </div>
  </div>


  {/* EMD */}
  <div className="info-card">
    <div className="info-icon emd-icon">
      <WalletCards size={25} strokeWidth={2} />
    </div>

    <div className="info-content">
      <span className="info-label">EMD</span>

      <strong>
        {analysis.earnest_money_deposit || "Not specified"}
      </strong>
    </div>
  </div>

</div>
    
  {/* AI Insight Cards */}
<div className="insight-grid">

  {/* Eligibility */}
  <div className="insight-card">
    <div className="insight-top">
      <div className="insight-icon eligibility-icon">
        ✓
      </div>

    </div>

    <div className="insight-content">
      <span className="insight-label">Eligibility</span>

      <strong className="insight-number">
        {analysis.eligibility?.length || 0}
      </strong>

      <small>requirements found</small>
    </div>
  </div>


  {/* Requirements */}
  <div className="insight-card">
    <div className="insight-top">
      <div className="insight-icon requirements-icon">
        ⚙
      </div>

    </div>

    <div className="insight-content">
      <span className="insight-label">Requirements</span>

      <strong className="insight-number">
        {(analysis.technical_requirements?.length || 0) +
          (analysis.financial_requirements?.length || 0)}
      </strong>

      <small>technical & financial</small>
    </div>
  </div>


  {/* Documents */}
  <div className="insight-card">
    <div className="insight-top">
      <div className="insight-icon documents-icon">
        ▣
      </div>

    </div>

    <div className="insight-content">
      <span className="insight-label">Documents</span>

      <strong className="insight-number">
        {analysis.required_documents?.length || 0}
      </strong>

      <small>documents required</small>
    </div>
  </div>


  {/* Deadline */}
  <div className="insight-card deadline-card">
    <div className="insight-top">
      <div className="insight-icon deadline-icon">
        ◷
      </div>

    </div>

    <div className="insight-content">
      <span className="insight-label">Deadline</span>

      <strong className="insight-number deadline-number">
        {analysis.dates?.length
          ? analysis.dates.find(
              (item) =>
                item.name
                  ?.toLowerCase()
                  .includes("deadline") ||
                item.name
                  ?.toLowerCase()
                  .includes("submission")
            )?.date || analysis.dates[0]?.date
          : "Not specified"}
      </strong>

      <small>submission deadline</small>
    </div>
  </div>

</div>

   {/* Important Dates */}
<div className="dates-panel">

  <div className="dates-heading">
    <div>
      <p className="section-label">TIMELINE</p>
      <h3>Important Dates</h3>
    </div>

    <div className="timeline-icon">
      <CalendarDays size={24} strokeWidth={2} />
    </div>
  </div>

  <div className="dates-list">

    {analysis.dates?.length ? (
      analysis.dates.map((item, index) => (
        <div className="date-row" key={index}>

          <div className="date-marker">
            {index + 1}
          </div>

          <div className="date-info">
            <span>{item.name}</span>
            <strong>{item.date}</strong>
          </div>

        </div>
      ))
    ) : (
      <div className="empty-date">
        No important dates specified in the tender.
      </div>
    )}

  </div>

</div>

  </section>
)}

{/* Detailed Tender Analysis */}
{analysis && (
  <section className="detailed-analysis">

{/* Eligibility */}
<div className="detail-section interactive-detail-section">

  <div className="section-heading detail-heading">
    <div>
      <p className="section-label">ELIGIBILITY</p>
      <h2>Eligibility Requirements</h2>
    </div>

    <span className="requirement-count">
      {analysis.eligibility?.length || 0} found
    </span>
  </div>

  {analysis.eligibility?.length ? (
    <>
      <div className="requirement-grid">

        {analysis.eligibility.slice(0, 3).map((item, index) => (
          <div className="requirement-card" key={index}>

            <div className="requirement-icon">
              ✓
            </div>

            <div className="requirement-content">
              <h3>{item.requirement}</h3>
              <p>{item.details}</p>
            </div>

          </div>
        ))}

      </div>

      {analysis.eligibility.length > 3 && (
        <details className="more-requirements">

          <summary>
            <span>
              + {analysis.eligibility.length - 3} more requirements
            </span>

            <span className="view-more-arrow">
              View all →
            </span>
          </summary>

          <div className="requirement-grid expanded-grid">

            {analysis.eligibility.slice(3).map((item, index) => (
              <div
                className="requirement-card"
                key={index + 3}
              >

                <div className="requirement-icon">
                  ✓
                </div>

                <div className="requirement-content">
                  <h3>{item.requirement}</h3>
                  <p>{item.details}</p>
                </div>

              </div>
            ))}

          </div>

        </details>
      )}
    </>
  ) : (
    <p className="empty-state">
      No eligibility requirements specified.
    </p>
  )}

</div>
    {/* Technical Requirements */}
    <div className="detail-section">
      <div className="section-heading">
        <p className="section-label">TECHNICAL</p>
        <h2>Technical Requirements</h2>
      </div>

      {analysis.technical_requirements?.length ? (
        <div className="detail-list">
          {analysis.technical_requirements.map((item, index) => (
            <div className="detail-card" key={index}>
              <h3>{item.requirement}</h3>
              <p>{item.details}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-state">No technical requirements specified.</p>
      )}
    </div>

    {/* Financial Requirements */}
    <div className="detail-section">
      <div className="section-heading">
        <p className="section-label">FINANCIAL</p>
        <h2>Financial Requirements</h2>
      </div>

      {analysis.financial_requirements?.length ? (
        <div className="detail-list">
          {analysis.financial_requirements.map((item, index) => (
            <div className="detail-card" key={index}>
              <h3>{item.requirement}</h3>
              <p>{item.details}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-state">No financial requirements specified.</p>
      )}
    </div>

    {/* Required Documents */}
    <div className="detail-section">
      <div className="section-heading">
        <p className="section-label">DOCUMENTS</p>
        <h2>Required Documents</h2>
      </div>

      {analysis.required_documents?.length ? (
        <div className="detail-list">
          {analysis.required_documents.map((item, index) => (
            <div className="detail-card" key={index}>
              <h3>{item.document}</h3>
              <p>{item.details}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-state">No required documents specified.</p>
      )}
    </div>

    {/* Scope of Work */}
    <div className="detail-section">
      <div className="section-heading">
        <p className="section-label">SCOPE</p>
        <h2>Scope of Work</h2>
      </div>

      <div className="detail-card">
        <p>
          {analysis.scope_of_work || "Not specified"}
        </p>
      </div>
    </div>

    {/* Important Conditions */}
    <div className="detail-section">
      <div className="section-heading">
        <p className="section-label">IMPORTANT</p>
        <h2>Important Conditions</h2>
      </div>

      {analysis.important_conditions?.length ? (
        <div className="detail-list">
          {analysis.important_conditions.map((condition, index) => (
            <div className="detail-card" key={index}>
              <p>{condition}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-state">No important conditions specified.</p>
      )}
    </div>

    {/* AI Summary */}
    <div className="detail-section">
      <div className="section-heading">
        <p className="section-label">AI SUMMARY</p>
        <h2>Tender Summary</h2>
      </div>

      <div className="detail-card summary-card">
        <p>
          {analysis.summary || "Not specified"}
        </p>
      </div>
    </div>

  </section>
)}

{analysis && (
  <section className="ask-tender-section">
    <div className="section-heading">
      <p className="section-label">AI Q&A</p>
      <h2>Ask TenderLens</h2>
      <p>
        Ask questions about the uploaded tender document.
      </p>
    </div>

    <div className="ask-tender-card">
      <div className="question-box">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. What documents are required?"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              askTender()
            }
          }}
        />

        <button
          onClick={askTender}
          disabled={asking}
        >
          {asking ? "Asking..." : "Ask"}
        </button>
      </div>

      {answer && (
        <div className="answer-box">
          <h3>Answer</h3>
          <p>{answer}</p>
        </div>
      )}
    </div>
  </section>
)}
{/* Extracted Text */}
{extractedText && (
  <section className="extracted-text-section">

    <div className="section-heading">
      <p className="section-label">DOCUMENT CONTENT</p>

      <h2>Extracted Document Text</h2>

      <button
        className="text-toggle-button"
        onClick={() =>
          setShowExtractedText(!showExtractedText)
        }
      >
        {showExtractedText
          ? "Hide extracted text ↑"
          : "View extracted text ↓"}
      </button>
    </div>

    {showExtractedText && (
      <div className="extracted-text-box">
        {extractedText}
      </div>
    )}

  </section>
)}

          </div>

        

        </section>


        {/* Features Section */}
        <section
          className="features"
          id="features"
        >

          <div className="section-heading">

            <p className="section-label">
              HOW TENDERLENS DOES
            </p>

            <h2>
              Turn complex documents into clear insights.
            </h2>

          </div>


          <div className="feature-grid">

            <div className="feature-card">

              <div className="feature-icon">
                01
              </div>

              <h3>
                AI Document Analysis
              </h3>

              <p>
                Extract key information from lengthy tender
                documents automatically.
              </p>

            </div>


            <div className="feature-card">

              <div className="feature-icon">
                02
              </div>

              <h3>
                RAG-Powered Answers
              </h3>

              <p>
                Ask questions about your documents and receive
                answers grounded in the uploaded content.
              </p>

            </div>


            <div className="feature-card">

              <div className="feature-icon">
                03
              </div>

              <h3>
                Smart Requirements
              </h3>

              <p>
                Identify eligibility criteria, deadlines,
                required documents, and technical requirements.
              </p>

            </div>

          </div>

        </section>


        {/* How It Works */}
        <section
          className="how-it-works"
          id="how-it-works"
        >

          <div className="section-heading">

            <p className="section-label">
              HOW IT WORKS
            </p>

            <h2>
              Three steps. One intelligent workflow.
            </h2>

          </div>


          <div className="steps">

            <div className="step">

              <span>
                01
              </span>

              <h3>
                Upload
              </h3>

              <p>
                Upload your tender or RFP document.
              </p>

            </div>


            <div className="step">

              <span>
                02
              </span>

              <h3>
                Analyze
              </h3>

              <p>
                Our AI processes and retrieves relevant
                information.
              </p>

            </div>


            <div className="step">

              <span>
                03
              </span>

              <h3>
                Understand
              </h3>

              <p>
                Get actionable answers, insights, and
                requirements.
              </p>

            </div>

          </div>

        </section>

      </main>


      {/* Footer */}
      <footer>

        <p>
          © 2026 TenderLens AI
        </p>

        

      </footer>

    </div>
  )
}

export default App