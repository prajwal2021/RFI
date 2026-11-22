"""Ready-made RFI forms every RFI account starts with.

Each new RFI user gets a private "Starter templates" workspace holding these forms as drafts. They can edit,
publish, copy or delete them. Field names (first_name, email, phone, courses, sms_opt_in...) are the ones the
Call Center recognises, so responses link to the right person and course interests automatically.
"""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import RFI, RFIStatus, User, Workspace

WORKSPACE_NAME = "Starter templates"
WORKSPACE_DESCRIPTION = "Ready-made forms to copy or edit. Publish one to get a shareable link. Responses link to the Call Center automatically."

COURSES = [
    "Communication for the Workplace",
    "Leadership for the Workplace",
    "Technical Skills for the Workplace: AI",
    "Project Management",
    "Digital Literacy",
    "Change Management",
]

CONTACT_PANEL = {
    "type": "panel",
    "name": "contact_details",
    "title": "Your contact details",
    "elements": [
        {"type": "text", "name": "first_name", "title": "First name", "isRequired": True},
        {"type": "text", "name": "last_name", "title": "Last name", "isRequired": True, "startWithNewLine": False},
        {"type": "text", "name": "email", "title": "Email", "inputType": "email", "isRequired": True},
        {"type": "text", "name": "phone", "title": "Phone", "inputType": "tel", "startWithNewLine": False},
    ],
}

CONSENT = [
    {"type": "boolean", "name": "email_opt_in", "title": "I agree to receive emails from TTU Online about programs and deadlines", "defaultValue": True},
    {"type": "boolean", "name": "sms_opt_in", "title": "I agree to receive text message updates (message and data rates may apply)"},
]


def _form(title: str, description: str, elements: list, thank_you: str) -> dict:
    return {
        "subject": title,
        "thank_you": thank_you,
        "survey": {
            "title": title,
            "description": description,
            "showQuestionNumbers": "off",
            "completeText": "Submit",
            "pages": [{"name": "page1", "elements": elements}],
        },
    }


TEMPLATES = [
    _form(
        "Program information request",
        "Tell us what you are interested in and an advisor will get back to you within two business days.",
        [
            CONTACT_PANEL,
            {"type": "checkbox", "name": "courses", "title": "Which programs are you interested in?", "choices": COURSES, "showOtherItem": True, "colCount": 2, "isRequired": True},
            {"type": "radiogroup", "name": "start_term", "title": "When would you like to start?", "choices": ["As soon as possible", "Next term", "Within a year", "Just exploring"]},
            {"type": "comment", "name": "question", "title": "Anything you would like to ask us?"},
            *CONSENT,
        ],
        "Thank you! An advisor will contact you within two business days.",
    ),
    _form(
        "Course enrollment interest",
        "Reserve your interest in an upcoming course. We will send enrollment details as soon as registration opens.",
        [
            CONTACT_PANEL,
            {"type": "text", "name": "r_number", "title": "R-number (current or former TTU students)", "placeholder": "R12345678"},
            {"type": "dropdown", "name": "course", "title": "Course", "choices": COURSES, "isRequired": True},
            {"type": "radiogroup", "name": "funding", "title": "How do you plan to pay?", "choices": ["Self-pay", "Employer reimbursement", "Financial aid", "Not sure yet"]},
            *CONSENT,
        ],
        "You're on the list. We'll email you when enrollment opens.",
    ),
    _form(
        "Request a callback",
        "Prefer to talk? Leave your number and the best time to reach you.",
        [
            CONTACT_PANEL,
            {"type": "radiogroup", "name": "best_time", "title": "Best time to call", "choices": ["Morning (8-12)", "Afternoon (12-5)", "Evening (5-7)"], "isRequired": True},
            {"type": "dropdown", "name": "topic", "title": "What would you like to talk about?", "choices": ["Program information", "Enrollment", "Cost and financial aid", "Technical help", "Something else"]},
            {"type": "comment", "name": "question", "title": "Tell us a little more (optional)"},
            *CONSENT,
        ],
        "Thanks! Our team will call you at the time you chose.",
    ),
    _form(
        "Employer and partner training inquiry",
        "Training for your team: tell us about your organization and goals.",
        [
            CONTACT_PANEL,
            {"type": "text", "name": "organization", "title": "Organization", "isRequired": True},
            {"type": "text", "name": "job_title", "title": "Your job title", "startWithNewLine": False},
            {"type": "dropdown", "name": "team_size", "title": "How many people would take the training?", "choices": ["1-5", "6-20", "21-50", "51+"]},
            {"type": "checkbox", "name": "courses", "title": "Topics of interest", "choices": COURSES, "colCount": 2},
            {"type": "comment", "name": "goals", "title": "What are your training goals?"},
            *CONSENT[:1],
        ],
        "Thank you! A partnership manager will reach out shortly.",
    ),
    _form(
        "Information session registration",
        "Join a free online information session to learn about TTU Online programs.",
        [
            CONTACT_PANEL,
            {"type": "radiogroup", "name": "session", "title": "Choose a session", "choices": ["Tuesday 12:00 PM", "Wednesday 6:00 PM", "Saturday 10:00 AM"], "isRequired": True},
            {"type": "checkbox", "name": "courses", "title": "Programs you'd like to hear about", "choices": COURSES, "colCount": 2},
            {"type": "radiogroup", "name": "heard_about", "title": "How did you hear about us?", "choices": ["Search engine", "Social media", "Friend or colleague", "Employer", "Email", "Other"]},
            *CONSENT,
        ],
        "You're registered! We'll email you the session link.",
    ),
    _form(
        "Student support request",
        "Current students: tell us what you need help with.",
        [
            CONTACT_PANEL,
            {"type": "text", "name": "r_number", "title": "R-number", "placeholder": "R12345678", "isRequired": True},
            {"type": "dropdown", "name": "support_topic", "title": "What do you need help with?", "isRequired": True,
             "choices": ["Registration or enrollment", "Billing and payment", "Login or Canvas", "Transcripts or certificates", "Accessibility accommodation", "Other"]},
            {"type": "comment", "name": "details", "title": "Describe the issue", "isRequired": True},
            {"type": "radiogroup", "name": "contact_method", "title": "How should we reach you?", "choices": ["Email", "Phone", "Text message"]},
        ],
        "Thanks, we've received your request and will get back to you within one business day.",
    ),
]


async def give_starter_templates(db: AsyncSession, user: User) -> bool:
    """Create the user's Starter templates workspace once. Returns True when something was created.

    The caller commits. Only RFI accounts get templates, and only the first time (deleting the workspace is respected).
    """
    if user.templates_seeded or not (user.is_rfi_user or user.is_admin):
        return False
    user.templates_seeded = True
    exists = (await db.execute(select(Workspace.id).where(Workspace.owner_id == user.id, Workspace.name == WORKSPACE_NAME))).first()
    if exists:
        return False
    ws = Workspace(name=WORKSPACE_NAME, description=WORKSPACE_DESCRIPTION, created_by=user.email, owner_id=user.id, visibility="private")
    db.add(ws)
    await db.flush()
    for t in TEMPLATES:
        db.add(RFI(
            subject=t["subject"], question="", status=RFIStatus.DRAFT, created_by=user.email, owner_id=user.id, workspace_id=ws.id,
            content={"surveyDefinition": t["survey"], "surveyTheme": {}, "surveyEditor": "clone"}, thank_you_message=t["thank_you"],
        ))
    return True


async def backfill_starter_templates(db: AsyncSession) -> int:
    users = (await db.execute(select(User).where(User.templates_seeded.is_(False)))).scalars().all()
    n = 0
    for u in users:
        # call-center-only accounts stay unseeded, so they get templates if they later become RFI users
        if await give_starter_templates(db, u):
            n += 1
    await db.commit()
    return n
