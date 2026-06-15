import os
from crewai import Agent, Task, Crew, Process
from langchain_groq import ChatGroq

# 1. Set your Groq API key here!
os.environ["GROQ_API_KEY"] = os.environ.get("GROQ_API_KEY", "")

# 2. Connect to Groq's blazing-fast Llama 3 model
cloud_llm = ChatGroq(
    temperature=0.7,
    # Upgrade to the newest supported model!
    model_name="llama-3.1-8b-instant" 
)

# 3. Your agents (exactly the same, just using the new brain)
sourcer = Agent(
    role='Technical Talent Sourcing Specialist',
    goal='Extract and structure core technical skills, experience level, and key projects from candidate profiles.',
    backstory='You are an expert technical recruiter who excels at parsing resumes and identifying key technical competencies.',
    llm=cloud_llm,
    verbose=True,
    allow_delegation=False
)

screener = Agent(
    role='Lead Technical Screener',
    goal='Evaluate candidate profiles against job descriptions and assign a Match Score (0-100).',
    backstory='You are a senior engineering manager who rigorously evaluates how well a candidate\'s technical skills match the specific requirements of a job posting.',
    llm=cloud_llm,
    verbose=True,
    allow_delegation=False
)