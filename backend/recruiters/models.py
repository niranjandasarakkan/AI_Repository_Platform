from django.db import models

class JobPosting(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

class Candidate(models.Model):
    name = models.CharField(max_length=255, default="Unknown Candidate")
    raw_profile = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class ScreeningResult(models.Model):
    candidate = models.ForeignKey(Candidate, on_delete=models.CASCADE, related_name='screenings')
    job = models.ForeignKey(JobPosting, on_delete=models.CASCADE, related_name='screenings')
    match_score = models.IntegerField(null=True, blank=True)
    ai_summary = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.candidate.name} -> {self.job.title} (Score: {self.match_score})"