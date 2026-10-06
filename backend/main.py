from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from pydantic import BaseModel, Field
from typing import List, Optional
import shutil
import re
import os

# -----------------------------
# Environment
# -----------------------------

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY is not configured."
    )

gemini_client = genai.Client(
    api_key=GEMINI_API_KEY
)

# -----------------------------
# Tender AI Schema
# -----------------------------

class TenderDate(BaseModel):
    name: str = Field(
        description="Name of the date, such as submission deadline or bid opening."
    )

    date: str = Field(
        description="Date exactly as found or inferred from the document."
    )


class TenderRequirement(BaseModel):
    requirement: str = Field(
        description="Specific eligibility, financial, technical, or other requirement."
    )

    details: str = Field(
        description="Important details, thresholds, conditions, or values."
    )


class TenderDocument(BaseModel):
    document: str = Field(
        description="Name of the required document."
    )

    details: str = Field(
        description="Any specific requirement related to the document."
    )


class TenderAnalysis(BaseModel):

    tender_title: str = Field(
        description="Official tender title. Return empty string if not found."
    )

    tender_id: str = Field(
        description="Tender or bid reference number. Return empty string if not found."
    )

    organization: str = Field(
        description="Organization or department issuing the tender."
    )

    estimated_value: str = Field(
        description="Estimated tender/project value if mentioned."
    )

    earnest_money_deposit: str = Field(
        description="EMD or earnest money deposit amount if mentioned."
    )

    dates: List[TenderDate] = Field(
        description="Important tender dates."
    )

    eligibility: List[TenderRequirement] = Field(
        description="Eligibility and qualification requirements."
    )

    technical_requirements: List[TenderRequirement] = Field(
        description="Technical requirements and specifications."
    )

    financial_requirements: List[TenderRequirement] = Field(
        description="Financial requirements such as turnover or financial capacity."
    )

    required_documents: List[TenderDocument] = Field(
        description="Documents required from bidders."
    )

    scope_of_work: str = Field(
        description="Summary of the tender's scope of work."
    )

    important_conditions: List[str] = Field(
        description="Important conditions, mandatory clauses, or warnings."
    )

    summary: str = Field(
        description="Concise summary of the tender."
    )

class ExtractionRequest(BaseModel):
        chunks: List[str]

class QuestionRequest(BaseModel):
        question: str
        chunks: List[str]

# -----------------------------
# FastAPI Application
# -----------------------------

app = FastAPI(
    title="TenderLens AI",
    description="AI-powered tender analysis and RAG platform",
    version="1.0.0"
)


# -----------------------------
# CORS
# -----------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -----------------------------
# Directories
# -----------------------------

BASE_DIR = Path(__file__).resolve().parent.parent

UPLOAD_DIR = BASE_DIR / "data" / "uploads"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# -----------------------------
# Text Cleaning
# -----------------------------

def clean_text(text: str) -> str:
    """
    Clean raw text extracted from a PDF.
    """

    if not text:
        return ""

    # Normalize line breaks
    text = text.replace("\r\n", "\n")
    text = text.replace("\r", "\n")

    # Remove excessive spaces and tabs
    text = re.sub(r"[ \t]+", " ", text)

    # Remove excessive blank lines
    text = re.sub(r"\n\s*\n+", "\n\n", text)

    # Remove spaces around line breaks
    text = re.sub(r" *\n *", "\n", text)

    return text.strip()


# -----------------------------
# Text Chunking
# -----------------------------

def create_chunks(
    text: str,
    chunk_size: int = 1500,
    overlap: int = 200
):
    """
    Split document text into overlapping chunks.

    chunk_size:
        Approximate number of characters per chunk.

    overlap:
        Number of characters shared between
        consecutive chunks.
    """

    if not text:
        return []

    chunks = []

    start = 0
    text_length = len(text)

    while start < text_length:

        end = start + chunk_size

        chunk = text[start:end].strip()

        if chunk:
            chunks.append(chunk)

        if end >= text_length:
            break

        start = end - overlap

    return chunks

# ==========================================
# Gemini AI Analysis Function
# ==========================================

def analyze_chunks_with_gemini(chunks):
    if not chunks:
        raise ValueError("No document chunks provided.")

    document_text = "\n\n".join(chunks)

    # Keep the prototype input within a reasonable size
    document_text = document_text[:60000]

    prompt = f"""
    You are an expert tender and government RFP document analyst.

Analyze the following tender document and extract the information
into the requested structured format.
IMPORTANT RULES:
1. Only use information explicitly present in the document.
2. Never invent, estimate, or guess a value or date.
3. If a specific date is not present, return "Not specified".
4. Extract every important tender date that is explicitly stated.
5. For each date, use a clear name such as:
   - Tender Publication Date
   - Document Download Start Date
   - Document Download End Date
   - Pre-Bid Meeting Date
   - Bid Submission Start Date
   - Bid Submission Deadline
   - Bid Opening Date
6. If the document says "As indicated in NIT", preserve that wording
   rather than replacing it with an invented date.
7. Do not treat the date on which the PDF was downloaded or uploaded
   as a tender date.
8. Do not infer a date from another date unless the document explicitly
   states the relationship.
9. Identify eligibility conditions.
10. Identify technical and financial requirements.
11. Identify all important required documents.
12. Summarize the scope of work.
13. Highlight important conditions.
14. Keep the summary concise and useful.


DOCUMENT:

{document_text}
"""

    response = gemini_client.models.generate_content(
        model="gemini-3.5-flash-lite",
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_schema": TenderAnalysis.model_json_schema(),
        },
    )

    analysis = TenderAnalysis.model_validate_json(response.text)

    return analysis.model_dump()


# -----------------------------
# Root Endpoint
# -----------------------------

@app.get("/")
def root():
    return {
        "message": "Welcome to TenderLens AI API"
    }


# -----------------------------
# Health Check
# -----------------------------

@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }


# -----------------------------
# PDF Upload + Text Extraction
# -----------------------------

@app.post("/api/tenders/upload")
async def upload_tender(file: UploadFile = File(...)):

    # -----------------------------
    # Check file type
    # -----------------------------

    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported for now."
        )

    # -----------------------------
    # Check filename
    # -----------------------------

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No filename provided."
        )

    # -----------------------------
    # Create file path
    # -----------------------------

    file_path = UPLOAD_DIR / file.filename

    # -----------------------------
    # Save uploaded file
    # -----------------------------

    try:

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Could not save file: {str(e)}"
        )

    # -----------------------------
    # Extract PDF text
    # -----------------------------

    try:

        reader = PdfReader(str(file_path))

        extracted_text = ""

        for page in reader.pages:

            page_text = page.extract_text()

            if page_text:
                extracted_text += page_text + "\n"

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Could not extract PDF text: {str(e)}"
        )

    # -----------------------------
    # Check extracted text
    # -----------------------------

    if not extracted_text.strip():

        raise HTTPException(
            status_code=400,
            detail="The PDF was uploaded, but no readable text was found."
        )

    # -----------------------------
    # Clean extracted text
    # -----------------------------

    cleaned_text = clean_text(extracted_text)

    # -----------------------------
    # Create chunks
    # -----------------------------

    chunks = create_chunks(cleaned_text)
    try:
        analysis = analyze_chunks_with_gemini(chunks)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Ai analysis failed{str(e)}"
        )

    # -----------------------------
    # Return processed document
    # -----------------------------

    return {
    "message": "Tender uploaded and analyzed successfully",
    "filename": file.filename,
    "pages": len(reader.pages),
    "text_length": len(cleaned_text),
    "chunk_count": len(chunks),
    "chunks" : chunks,
     "text" : cleaned_text,
    "analysis": analysis
}


# -----------------------------
# Tender Analysis
# -----------------------------

@app.post("/api/tenders/analyze")
async def analyze_tender(data: dict):

    text = data.get("text", "")

    if not text.strip():

        raise HTTPException(
            status_code=400,
            detail="No document text provided."
        )

    text_lower = text.lower()

    # -----------------------------
    # Eligibility
    # -----------------------------

    eligibility_keywords = [
        "eligibility",
        "eligible",
        "qualification",
        "experience",
        "turnover",
        "registration",
        "certification"
    ]

    eligibility_found = [
        keyword
        for keyword in eligibility_keywords
        if keyword in text_lower
    ]

    # -----------------------------
    # Requirements
    # -----------------------------

    requirement_keywords = [
        "requirement",
        "technical specification",
        "scope of work",
        "qualification",
        "experience",
        "shall",
        "must"
    ]

    requirements_found = [
        keyword
        for keyword in requirement_keywords
        if keyword in text_lower
    ]

    # -----------------------------
    # Documents
    # -----------------------------

    document_keywords = [
        "documents",
        "document",
        "certificate",
        "gst",
        "pan",
        "registration certificate",
        "financial statement",
        "technical proposal"
    ]

    documents_found = [
        keyword
        for keyword in document_keywords
        if keyword in text_lower
    ]

    # -----------------------------
    # Deadline Detection
    # -----------------------------

    deadline_patterns = [
        r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b",

        r"\b\d{1,2}\s+"
        r"(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)"
        r"[a-z]*\s+\d{4}\b",

        r"\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)"
        r"[a-z]*\s+\d{1,2},?\s+\d{4}\b"
    ]

    deadlines = []

    for pattern in deadline_patterns:

        matches = re.findall(
            pattern,
            text_lower,
            re.IGNORECASE
        )

        deadlines.extend(matches)

    # Remove duplicates
    deadlines = list(dict.fromkeys(deadlines))

    # -----------------------------
    # Return Analysis
    # -----------------------------

    return {

        "message": "Tender analysis completed",

        "eligibility": eligibility_found,

        "requirements": requirements_found,

        "documents": documents_found,

        "deadlines": deadlines,

        "summary": {

            "document_characters": len(text),

            "document_words": len(text.split()),

            "eligibility_count": len(eligibility_found),

            "requirements_count": len(requirements_found),

            "documents_count": len(documents_found),

            "deadline_count": len(deadlines)

        }
    }
@app.post("/api/tenders/extract")
async def extract_tender_information(request: ExtractionRequest):

    if not request.chunks:
        raise HTTPException(
            status_code=400,
            detail="No document chunks provided."
        )

    document_text = "\n\n".join(request.chunks)

    # Prototype limit
    document_text = document_text[:60000]

    prompt = f"""
You are an expert tender and government RFP document analyst.

Analyze the following tender document and extract the information
into the requested structured format.

IMPORTANT RULES:
1. Only use information present in the document.
2. Do not invent or guess missing information.
3. If information is not available, return "Not specified".
4. Extract important dates accurately.
5. Identify eligibility conditions.
6. Identify technical and financial requirements.
7. Identify all important required documents.
8. Summarize the scope of work.
9. Highlight important conditions.
10. Keep the summary concise and useful.

DOCUMENT:

{document_text}
"""

    try:
        response = gemini_client.models.generate_content(
           model="gemini-3.5-flash-lite",
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": TenderAnalysis.model_json_schema(),
            },
        )

        analysis = TenderAnalysis.model_validate_json(response.text)

        return {
            "success": True,
            "analysis": analysis.model_dump()
        }

    except Exception as e:
        print("Gemini extraction error:", str(e))

        raise HTTPException(
            status_code=500,
            detail=f"Gemini extraction failed: {str(e)}"
        )
@app.post("/api/tenders/ask")
async def ask_tender(request: QuestionRequest):

    if not request.question.strip():
        raise HTTPException(
            status_code=400,
            detail="Please enter a question."
        )

    if not request.chunks:
        raise HTTPException(
            status_code=400,
            detail="No tender document provided."
        )

    document_text = "\n\n".join(request.chunks)
    document_text = document_text[:60000]

    prompt = f"""
You are TenderLens AI, an expert tender and government RFP assistant.

Answer the user's question using ONLY the information contained
in the tender document below.

IMPORTANT RULES:
1. Do not invent information.
2. Do not guess.
3. If the answer is not available in the document, say:
   "This information is not specified in the uploaded tender document."
4. Give a direct and useful answer.
5. When possible, mention the relevant requirement, condition,
   amount, date, or document from the tender.
6. Do not use outside knowledge.
7. Keep the answer concise but sufficiently detailed.

USER QUESTION:

{request.question}

TENDER DOCUMENT:

{document_text}
"""

    try:
        response = gemini_client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=prompt
        )

        return {
            "success": True,
            "question": request.question,
            "answer": response.text
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI question answering failed: {e}"
        )