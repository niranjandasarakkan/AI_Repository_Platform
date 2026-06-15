from celery import shared_task
from crewai import Task, Crew, Process
from .agents import sourcer, screener
from .models import Candidate, JobPosting, ScreeningResult
import re

@shared_task(name="recruiters.tasks.run_screening_pipeline")
def run_screening_pipeline(candidate_id, job_id):
    # Fetch the records from the database
    candidate = Candidate.objects.get(id=candidate_id)
    job = JobPosting.objects.get(id=job_id)

    task_extract = Task(
        description=f"Analyze this raw profile: '{candidate.raw_profile}'. Extract a clean breakdown of core skills, experience level, and key projects.",
        expected_output="A structured breakdown of the candidate's core technical profile.",
        agent=sourcer
    )

    task_screen = Task(
        description=f"Take the profile from the previous task and evaluate it against this job description: '{job.description}'. Provide a Match Score (0-100) and a summary paragraph.",
        expected_output="A summary containing a numerical match score and brief justification.",
        agent=screener
    )

    crew = Crew(
        agents=[sourcer, screener],
        tasks=[task_extract, task_screen],
        process=Process.sequential,
        verbose=2
    )

    result_text = str(crew.kickoff())
    
    # Attempt to extract the numerical score from the AI's text
    match = re.search(r'\b(?:100|[1-9]?[0-9])\b', result_text)
    score = int(match.group(0)) if match else 0

    # Save the final result to the database!
    ScreeningResult.objects.create(
        candidate=candidate,
        job=job,
        match_score=score,
        ai_summary=result_text
    )
    
    return f"Screening complete. Score saved: {score}"