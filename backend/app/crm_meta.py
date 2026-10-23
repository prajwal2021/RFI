"""Reference lists for the Call Center, each with a plain-language description shown as help text in the app."""


def _opts(*items):
    return [{"value": v, "label": l, "description": d} for v, l, d in items]


CHANNELS = _opts(
    ("call", "Phone call", "A live phone conversation, inbound or outbound."),
    ("voicemail", "Voicemail", "You left a voicemail, or listened to one they left."),
    ("email", "Email", "An email sent or received outside the app."),
    ("sms", "Text (SMS)", "A text message sent or received."),
    ("chat", "Chat", "A web chat conversation."),
    ("walk_in", "Walk-in", "The person came to the office in person."),
    ("meeting", "Meeting", "A scheduled meeting or video call."),
    ("note", "Note", "An internal note with no contact with the person."),
)

DIRECTIONS = _opts(
    ("inbound", "Inbound", "They contacted us."),
    ("outbound", "Outbound", "We contacted them."),
    ("internal", "Internal", "No contact with the person (internal note)."),
)

OUTCOMES = _opts(
    ("resolved", "Answered - resolved", "Spoke with them and answered everything."),
    ("follow_up", "Answered - follow-up needed", "Spoke with them; something still needs doing. Add a task or callback."),
    ("sent_info", "Answered - sent information", "Spoke with them and sent an RFI, link or brochure."),
    ("transferred", "Transferred", "Call was transferred to another team or person."),
    ("left_voicemail", "Left voicemail", "No answer; a voicemail was left."),
    ("no_answer", "No answer", "No answer and no voicemail left."),
    ("busy", "Busy / disconnected", "Line busy or the call dropped."),
    ("wrong_number", "Wrong number", "The number does not belong to this person. Update their phone."),
    ("callback_requested", "Callback requested", "They asked us to call back later. Schedule a callback."),
    ("not_interested", "Not interested", "They are not interested. Consider marking the interest Lost."),
    ("do_not_contact", "Asked not to be contacted", "They asked us to stop. Mark Do Not Contact on the record."),
)

REASONS = _opts(
    ("program_info", "Program information", "Questions about a course or program."),
    ("enrollment", "Enrollment / registration", "Wants to enroll, register or apply."),
    ("admissions", "Admissions", "Admission requirements, deadlines, transcripts."),
    ("cost", "Cost & financial aid", "Tuition, fees, payment plans, financial aid, employer reimbursement."),
    ("technical", "Technical support", "Login, Canvas, email or other technical problems."),
    ("schedule", "Schedule & deadlines", "Start dates, course schedule, deadlines."),
    ("records", "Records & transcripts", "Grades, transcripts, certificates, verification."),
    ("rfi_follow_up", "RFI follow-up", "Following up on an RFI they submitted."),
    ("complaint", "Complaint", "Something went wrong and they are unhappy."),
    ("other", "Other", "Anything else."),
)

CONTACT_TYPES = _opts(
    ("prospect", "Prospective student", "Interested in taking a course; not enrolled yet."),
    ("student", "Current student", "Currently enrolled."),
    ("parent", "Parent / guardian", "Calling about a student."),
    ("employer", "Employer / partner", "Organisation contact, HR or training manager."),
    ("alumni", "Alumni", "Completed a course or program."),
    ("faculty_staff", "Faculty / staff", "TTU employee."),
    ("other", "Other", "Anyone else."),
)

LIFECYCLE = _opts(
    ("lead", "Lead", "We know about them but have not qualified their interest yet."),
    ("prospect", "Prospect", "Confirmed interest in at least one course."),
    ("applicant", "Applicant", "Has applied or started registration."),
    ("student", "Student", "Enrolled in at least one course."),
    ("alumni", "Alumni", "Finished a course or program."),
    ("inactive", "Inactive", "No longer pursuing; kept for history."),
)

INTEREST_STAGES = _opts(
    ("inquiry", "Inquiry", "Asked about the course."),
    ("interested", "Interested", "Confirmed they want to take it."),
    ("waitlist", "Waitlist", "The course is not open yet; notify them when it opens."),
    ("applied", "Applied", "Applied or started registration."),
    ("enrolled", "Enrolled", "Enrolled in the course. This closes the loop."),
    ("lost", "Lost", "Decided not to take it. Record a reason."),
)

LOST_REASONS = _opts(
    ("cost", "Cost", "Too expensive or no funding."),
    ("timing", "Timing", "Wrong time; may come back later."),
    ("chose_other", "Chose another provider", "Went with another school or program."),
    ("not_eligible", "Not eligible", "Does not meet the requirements."),
    ("no_response", "No response", "Stopped responding after several attempts."),
    ("other", "Other", "Another reason; add a note."),
)

WORK_KINDS = _opts(
    ("task", "Task", "A to-do with a due date, e.g. 'Email the brochure'."),
    ("callback", "Callback", "A promise to call the person back at a set time."),
    ("case", "Case (ticket)", "A problem or request that must be resolved and closed, e.g. a billing issue."),
    ("handoff", "Handoff", "Work passed from one team to the other, e.g. Call Center to RFI team."),
)

TEAMS = _opts(
    ("call_center", "Call Center", "The team answering phones and working leads."),
    ("rfi", "RFI Team", "The team that builds RFIs, sends them and works the responses."),
    ("escalations", "Escalations", "Supervisors handling complaints and overdue or difficult items."),
)

WORK_STATUSES = _opts(
    ("open", "Open", "Not started. If no owner, it waits in the team's queue."),
    ("in_progress", "In progress", "Someone is working on it."),
    ("waiting", "Waiting on person", "Waiting for the student, parent or partner to respond."),
    ("done", "Done", "Completed or resolved."),
    ("cancelled", "Cancelled", "No longer needed."),
)

PRIORITIES = _opts(
    ("low", "Low", "Whenever there is time."),
    ("normal", "Normal", "Standard turnaround (1-2 business days)."),
    ("high", "High", "Same day."),
    ("urgent", "Urgent", "Right now; also notify a supervisor."),
)

CASE_CATEGORIES = _opts(
    ("enrollment_help", "Enrollment help", "Problems registering or enrolling."),
    ("billing", "Billing & payment", "Charges, refunds, payment issues."),
    ("technical", "Technical", "Login, Canvas, email or website problems."),
    ("records", "Records", "Transcripts, certificates, grade corrections."),
    ("accommodation", "Accessibility accommodation", "Requests for accommodations."),
    ("complaint", "Complaint", "Dissatisfied with a service or experience."),
    ("other", "Other", "Anything else."),
)

HANDOFF_REASONS = _opts(
    ("send_rfi", "Send this person an RFI", "Call Center asks the RFI team to send a specific form."),
    ("info_request", "Information request", "The caller needs information the RFI team owns."),
    ("enrollment_interest", "Enrollment interest", "A warm lead ready for enrollment follow-up."),
    ("call_request", "Please call this person", "RFI team asks the Call Center to phone a respondent."),
    ("rfi_question", "Question about an RFI response", "Something in a response needs clarifying."),
    ("escalation", "Escalation", "Needs a supervisor or another team's decision."),
    ("other", "Other", "Anything else; explain in the description."),
)

RELATIONS = _opts(
    ("parent", "Parent / guardian of", "This person is the parent or guardian of the related contact."),
    ("child", "Student of (child)", "This person is the student; the related contact is the parent."),
    ("spouse", "Spouse / partner", "Spouse or partner."),
    ("employer_contact", "Employer contact for", "HR or manager arranging training for the related contact."),
    ("employee", "Employee of", "This person's employer contact is the related contact."),
    ("other", "Other", "Any other relationship."),
)

LANGUAGES = ["English", "Spanish", "French", "Portuguese", "Chinese", "Vietnamese", "Arabic", "Other"]

COURSE_STATUSES = _opts(
    ("available", "Available now", "Open for enrollment."),
    ("coming_soon", "Coming soon", "Announced but not open. Interested people go on a waitlist."),
    ("closed", "Closed", "No longer offered."),
)

CUSTOM_FIELD_TYPES = _opts(
    ("text", "Text", "Free text, one line."),
    ("textarea", "Long text", "Several lines of text."),
    ("number", "Number", "A number."),
    ("date", "Date", "A calendar date."),
    ("select", "Pick list", "Choose one option from a list you define."),
    ("checkbox", "Checkbox", "Yes or no."),
    ("email", "Email", "An email address."),
    ("phone", "Phone", "A phone number."),
    ("url", "Link", "A web address."),
)

JOURNEY = _opts(
    ("new", "New", "No contact or RFI activity yet. Next: call them or send an RFI."),
    ("called_no_rfi", "Called, no RFI sent", "We spoke or tried to call, but never sent a form. Next: send an RFI if relevant."),
    ("rfi_sent", "RFI sent, not opened", "They have a personal RFI link but have not opened it. Next: remind or call."),
    ("rfi_opened", "RFI opened, not submitted", "They opened the form but dropped off. Next: call to help them finish."),
    ("responded_not_contacted", "Responded, not contacted", "They submitted an RFI but nobody has contacted them since. Next: call them."),
    ("responded_after_call", "Responded after a call", "We called first, then they submitted the RFI."),
    ("responded_contacted", "Responded and contacted", "They submitted an RFI and we followed up."),
    ("enrolled", "Enrolled", "Enrolled in at least one course. The loop is closed."),
    ("lost", "Lost", "Every course interest was marked Lost."),
    ("do_not_contact", "Do not contact", "They asked not to be contacted. All outreach is blocked."),
)


def as_dict() -> dict:
    return {
        "channels": CHANNELS, "directions": DIRECTIONS, "outcomes": OUTCOMES, "reasons": REASONS,
        "contact_types": CONTACT_TYPES, "lifecycle": LIFECYCLE, "interest_stages": INTEREST_STAGES,
        "lost_reasons": LOST_REASONS, "work_kinds": WORK_KINDS, "teams": TEAMS, "work_statuses": WORK_STATUSES,
        "priorities": PRIORITIES, "case_categories": CASE_CATEGORIES, "handoff_reasons": HANDOFF_REASONS,
        "relations": RELATIONS, "languages": LANGUAGES, "course_statuses": COURSE_STATUSES,
        "custom_field_types": CUSTOM_FIELD_TYPES, "journey": JOURNEY,
    }


def values(opts) -> set[str]:
    return {o["value"] for o in opts}


INVERSE_RELATION = {"parent": "child", "child": "parent", "spouse": "spouse", "employer_contact": "employee", "employee": "employer_contact", "other": "other"}
