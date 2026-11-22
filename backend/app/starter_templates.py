"""Ready-made RFI forms every RFI account starts with.

Each RFI user gets a private "Starter templates" workspace. The six forms together show off what the form builder
can do (multi-page forms, progress bars, logos, banners and images, conditional logic, validation, picture choices,
matrices, repeatable sections, file upload, signatures, ratings, answer piping, themes and translations), so people
learn the tool by opening them. Field names (first_name, email, phone, courses, sms_opt_in...) are the ones the Call
Center recognises, so responses link to the right person and course interests automatically.
"""
import hashlib
import json

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import RFI, ImageAsset, RFIStatus, RFISubmission, User, Workspace

WORKSPACE_NAME = "Starter templates"
WORKSPACE_DESCRIPTION = "Six ready-made forms that show what the builder can do. Edit one or publish it to get a shareable link. Responses link to the Call Center automatically."
VERSION = 2

COURSES = [
    "Communication for the Workplace",
    "Leadership for the Workplace",
    "Technical Skills for the Workplace: AI",
    "Project Management",
    "Digital Literacy",
    "Change Management",
]
AI_COURSE = "Technical Skills for the Workplace: AI"

PHONE_RE = r"^[0-9()+.\-\s]{7,20}$"

IMAGE_KEYS = [
    "logo-ttu-online", "logo-ttu-online-dark", "logo-micro-credentials", "logo-professional-development", "logo-texas-tech",
    "banner-rfi-scarlet", "banner-registration-midnight", "banner-help-desk-scarlet",
    "banner-welcome-midnight", "bg-dots-light", "bg-soft-light",
    "icon-laptop", "icon-globe", "icon-book", "icon-graduation-cap", "icon-certificate", "icon-check-seal",
]


def L(en: str, es: str) -> dict:
    """A string with a Spanish translation (the form shows a language picker when a translation exists)."""
    return {"default": en, "es": es}


def _contact_panel(img, spanish: bool = False, title="Your contact details") -> dict:
    t = (lambda en, es: L(en, es)) if spanish else (lambda en, es: en)
    return {
        "type": "panel",
        "name": "contact_details",
        "title": t(title, "Sus datos de contacto"),
        "description": t("We only use these to answer your request.", "Solo los usamos para responder a su solicitud."),
        "elements": [
            {"type": "text", "name": "first_name", "title": t("First name", "Nombre"), "isRequired": True, "maxLength": 60},
            {"type": "text", "name": "last_name", "title": t("Last name", "Apellido"), "isRequired": True, "startWithNewLine": False, "maxLength": 60},
            {"type": "text", "name": "email", "title": t("Email", "Correo electrónico"), "inputType": "email", "isRequired": True,
             "placeholder": "name@example.com", "validators": [{"type": "email", "text": t("Enter a valid email address.", "Ingrese un correo válido.")}]},
            {"type": "text", "name": "phone", "title": t("Phone", "Teléfono"), "inputType": "tel", "startWithNewLine": False, "placeholder": "(806) 555-0123",
             "validators": [{"type": "regex", "regex": PHONE_RE, "text": t("Enter a phone number with digits only.", "Ingrese un número de teléfono válido.")}]},
        ],
    }


def _consent(spanish: bool = False, sms: bool = True) -> dict:
    t = (lambda en, es: L(en, es)) if spanish else (lambda en, es: en)
    els = [
        {"type": "boolean", "name": "email_opt_in", "title": t("I agree to receive emails from TTU Online about programs and deadlines",
                                                                 "Acepto recibir correos de TTU Online sobre programas y fechas límite"),
         "defaultValue": True, "labelTrue": t("Yes", "Sí"), "labelFalse": t("No", "No")},
    ]
    if sms:
        els.append({"type": "boolean", "name": "sms_opt_in", "title": t("I agree to receive text message updates (message and data rates may apply)",
                                                                        "Acepto recibir mensajes de texto (pueden aplicarse tarifas)"),
                    "labelTrue": t("Yes", "Sí"), "labelFalse": t("No", "No"), "enableIf": "{phone} notempty",
                    "description": t("Add a phone number above to turn this on.", "Agregue un teléfono arriba para activarlo.")})
    return {
        "type": "panel", "name": "stay_in_touch", "title": t("Stay in touch", "Manténgase en contacto"),
        "appearance": json.dumps({"backgroundColor": "#fbf7f0", "borderColor": "#e8dcc6", "borderRadius": 12}),
        "elements": els,
    }


def _intro(html) -> dict:
    return {"type": "html", "name": "intro", "html": html}


def _banner(img, key: str, alt: str) -> list:
    url = img(key)
    return [{"type": "image", "name": "banner", "imageLink": url, "altText": alt, "imageFit": "cover", "imageHeight": "180", "imageWidth": "100%"}] if url else []


def _logo(img, key: str) -> dict:
    url = img(key)
    return {"logo": url, "logoPosition": "right", "logoFit": "contain", "logoWidth": "160px", "logoHeight": "56px"} if url else {}


def _thanks(heading: str, body: str, color: str) -> str:
    return (f'<div style="text-align:center;padding:32px 12px">'
            f'<div style="width:64px;height:64px;margin:0 auto 16px;border-radius:50%;background:{color};color:#fff;font-size:34px;line-height:64px">&#10003;</div>'
            f'<h2 style="margin:0 0 8px;font-size:26px">{heading}</h2><p style="margin:0;font-size:16px;opacity:.8">{body}</p></div>')


# ───────────────────────── 1. Program information request (multi-page, translated, logic) ─────────────────────────

def program_information(img) -> dict:
    formats = [("online", "Fully online", "Totalmente en línea", "icon-laptop"), ("hybrid", "Online + live sessions", "En línea + sesiones en vivo", "icon-globe"),
               ("self_paced", "Self-paced", "A su propio ritmo", "icon-book")]
    survey = {
        "title": L("Program information request", "Solicitud de información del programa"),
        "description": L("Three quick steps. An advisor will reply within two business days.", "Tres pasos rápidos. Un asesor responderá en dos días hábiles."),
        **_logo(img, "logo-ttu-online"),
        "showProgressBar": "top",
        "progressBarType": "pages",
        "showQuestionNumbers": "off",
        "pageNextText": L("Next", "Siguiente"), "pagePrevText": L("Back", "Atrás"), "completeText": L("Send my request", "Enviar solicitud"),
        "completedHtml": L(_thanks("Thank you, {first_name}!", "An advisor will contact you at {email} within two business days.", "#cc0000"),
                           _thanks("¡Gracias, {first_name}!", "Un asesor le escribirá a {email} en dos días hábiles.", "#cc0000")),
        "pages": [
            {"name": "about_you", "title": L("About you", "Sobre usted"), "elements": [
                *_banner(img, "banner-rfi-scarlet", "Request for information"),
                _intro(L('<p style="font-size:15px">Thinking about a <b>TTU Online microcertificate</b>? Tell us a little about yourself and what you are looking for.</p>'
                         '<ul><li>100% online, built for working adults</li><li>Short courses you can finish in weeks</li><li>Earn a credential employers recognise</li></ul>',
                         '<p style="font-size:15px">¿Piensa en un <b>microcertificado de TTU Online</b>? Cuéntenos un poco sobre usted y lo que busca.</p>'
                         '<ul><li>100% en línea, pensado para adultos que trabajan</li><li>Cursos cortos que termina en semanas</li><li>Una credencial que los empleadores reconocen</li></ul>')),
                _contact_panel(img, spanish=True),
                {"type": "radiogroup", "name": "contact_type", "title": L("Which best describes you?", "¿Cuál le describe mejor?"), "colCount": 2,
                 "choices": [{"value": "Prospective student", "text": L("Prospective student", "Futuro estudiante")},
                             {"value": "Current TTU student", "text": L("Current TTU student", "Estudiante actual de TTU")},
                             {"value": "Employer or HR", "text": L("Employer or HR", "Empleador o RR. HH.")},
                             {"value": "Parent or family", "text": L("Parent or family", "Padre o familiar")}]},
                {"type": "text", "name": "r_number", "title": L("R-number", "Número R"), "placeholder": "R12345678", "visibleIf": "{contact_type} = 'Current TTU student'",
                 "description": L("Shown because you picked Current TTU student.", "Aparece porque eligió Estudiante actual."),
                 "validators": [{"type": "regex", "regex": "^[Rr]\\d{8}$", "text": L("R-numbers look like R12345678.", "El número R tiene el formato R12345678.")}]},
            ]},
            {"name": "interests", "title": L("Your interests", "Sus intereses"), "elements": [
                {"type": "checkbox", "name": "courses", "title": L("{first_name}, which programs interest you?", "{first_name}, ¿qué programas le interesan?"),
                 "description": L("Pick up to three.", "Elija hasta tres."), "isRequired": True, "colCount": 2, "showOtherItem": True,
                 "choices": COURSES, "validators": [{"type": "answercount", "maxCount": 3, "text": L("Pick up to three programs.", "Elija hasta tres programas.")}]},
                {"type": "comment", "name": "ai_experience", "title": L("What would you like to do with AI at work?", "¿Qué le gustaría hacer con IA en su trabajo?"),
                 "visibleIf": f"{{courses}} contains '{AI_COURSE}'", "rows": 3,
                 "description": L("This question appears only when you pick the AI course.", "Esta pregunta aparece solo si elige el curso de IA.")},
                {"type": "imagepicker", "name": "learning_format", "title": L("How do you like to learn?", "¿Cómo prefiere aprender?"), "showLabel": True,
                 "imageFit": "contain", "imageHeight": 100, "imageWidth": 190, "colCount": 3,
                 "choices": [{"value": v, "text": L(en, es), "imageLink": img(k)} for v, en, es, k in formats if img(k)]},
                {"type": "radiogroup", "name": "start_term", "title": L("When would you like to start?", "¿Cuándo le gustaría empezar?"),
                 "choices": [{"value": "As soon as possible", "text": L("As soon as possible", "Lo antes posible")},
                             {"value": "Next term", "text": L("Next term", "El próximo período")},
                             {"value": "Within a year", "text": L("Within a year", "En un año")},
                             {"value": "Just exploring", "text": L("Just exploring", "Solo estoy explorando")}]},
                {"type": "rating", "name": "likelihood", "title": L("How likely are you to enroll?", "¿Qué tan probable es que se inscriba?"), "rateType": "stars", "rateCount": 5, "rateMax": 5,
                 "minRateDescription": L("Just curious", "Solo curiosidad"), "maxRateDescription": L("Ready to go", "Listo para empezar")},
            ]},
            {"name": "finish", "title": L("Almost done", "Casi listo"), "elements": [
                {"type": "comment", "name": "question", "title": L("Anything you would like to ask us?", "¿Algo que quiera preguntarnos?"), "rows": 4, "maxLength": 1000,
                 "placeholder": L("Cost, schedule, credit transfer…", "Costo, horario, transferencia de créditos…")},
                {"type": "dropdown", "name": "heard_about", "title": L("How did you hear about us?", "¿Cómo supo de nosotros?"),
                 "choices": [{"value": v, "text": L(v, es)} for v, es in (("Search engine", "Buscador"), ("Social media", "Redes sociales"), ("Friend or colleague", "Amigo o colega"),
                                                                           ("Employer", "Empleador"), ("Email", "Correo electrónico"), ("Event", "Evento"))],
                 "showOtherItem": True},
                _consent(spanish=True),
            ]},
        ],
    }
    return {"subject": "Program information request", "survey": survey,
            "theme": {"preset": "TTU Scarlet", "primary": "#cc0000", "text": "#1f1f1f", "pageBg": "#f7f3ee", "cardBg": "#ffffff", "cornerRadius": 12,
                      "headingColor": "#8f0000", "borderColor": "#e8dcc6"},
            "thank_you": "Thank you! An advisor will contact you within two business days."}


# ───────────────────────── 2. Course enrollment interest (validation, file upload, signature, ranking) ─────────────────────────

def course_enrollment(img) -> dict:
    survey = {
        "title": "Course enrollment interest",
        "description": "Reserve your place. We will email enrollment details as soon as registration opens.",
        **_logo(img, "logo-micro-credentials"),
        "showProgressBar": "top",
        "showQuestionNumbers": "on",
        "questionTitlePattern": "numTitleRequire",
        "completeText": "Reserve my place",
        "completedHtml": _thanks("You're on the list, {first_name}", "We'll email {email} the moment enrollment for {course} opens.", "#1e3a8a"),
        "pages": [
            {"name": "course", "title": "Choose your course", "elements": [
                *_banner(img, "banner-registration-midnight", "Registration"),
                {"type": "dropdown", "name": "course", "title": "Course", "isRequired": True, "choices": COURSES, "placeholder": "Select a course"},
                {"type": "text", "name": "preferred_start", "title": "Preferred start date", "inputType": "date", "startWithNewLine": False},
                {"type": "ranking", "name": "schedule_preference", "title": "Rank these schedule options (drag to reorder)",
                 "choices": ["Weekday evenings", "Weekends", "Weekday daytime", "Fully self-paced"]},
                {"type": "radiogroup", "name": "funding", "title": "How do you plan to pay?", "isRequired": True, "colCount": 2,
                 "choices": ["Self-pay", "Employer reimbursement", "Financial aid", "Not sure yet"]},
                {"type": "panel", "name": "employer_panel", "title": "Employer details", "visibleIf": "{funding} = 'Employer reimbursement'",
                 "description": "This section appears because you chose employer reimbursement.",
                 "elements": [
                     {"type": "text", "name": "organization", "title": "Employer", "requiredIf": "{funding} = 'Employer reimbursement'"},
                     {"type": "text", "name": "manager_email", "title": "Manager or HR email", "inputType": "email", "startWithNewLine": False,
                      "validators": [{"type": "email"}]},
                 ]},
            ]},
            {"name": "you", "title": "About you", "elements": [
                _contact_panel(img),
                {"type": "boolean", "name": "ttu_student", "title": "Are you a current or former TTU student?", "labelTrue": "Yes", "labelFalse": "No"},
                {"type": "text", "name": "r_number", "title": "R-number", "placeholder": "R12345678", "visibleIf": "{ttu_student} = true", "requiredIf": "{ttu_student} = true",
                 "validators": [{"type": "regex", "regex": "^[Rr]\\d{8}$", "text": "R-numbers look like R12345678."}]},
                {"type": "multipletext", "name": "address", "title": "Mailing address (for your certificate)", "colCount": 2,
                 "items": [{"name": "street", "title": "Street"}, {"name": "city", "title": "City"}, {"name": "state", "title": "State"}, {"name": "zip", "title": "ZIP",
                            "validators": [{"type": "regex", "regex": "^\\d{5}(-\\d{4})?$", "text": "Use a 5-digit ZIP."}]}]},
                {"type": "file", "name": "transcript", "title": "Upload a transcript or résumé (optional)", "allowMultiple": False, "maxSize": 1048576,
                 "acceptedTypes": ".pdf,.doc,.docx,.png,.jpg", "description": "PDF, Word or image, up to 1 MB."},
            ]},
            {"name": "confirm", "title": "Confirm", "elements": [
                {"type": "html", "name": "summary", "html": "<h3>Please check your details</h3><p><b>{first_name} {last_name}</b> · {email}<br>Course: <b>{course}</b><br>Payment: {funding}</p>"},
                {"type": "checkbox", "name": "acknowledgements", "title": "Please confirm", "isRequired": True,
                 "choices": ["I understand this reserves my interest and is not a payment", "I meet the course prerequisites or will ask an advisor"],
                 "validators": [{"type": "answercount", "minCount": 2, "text": "Please tick both boxes."}]},
                {"type": "signaturepad", "name": "signature", "title": "Sign here", "signatureWidth": 500, "signatureHeight": 160, "penColor": "#1e3a8a", "allowClear": True},
                _consent(),
            ]},
        ],
    }
    return {"subject": "Course enrollment interest", "survey": survey,
            "theme": {"preset": "Midnight", "primary": "#1e3a8a", "text": "#0f172a", "pageBg": "#eef2fb", "cardBg": "#ffffff", "cornerRadius": 10,
                      "headingColor": "#1e3a8a", "questionTitleColor": "#1e293b"},
            "thank_you": "You're on the list. We'll email you when enrollment opens."}


# ───────────────────────── 3. Request a callback (short, one page, smart help text) ─────────────────────────

def request_callback(img) -> dict:
    survey = {
        "title": "Request a callback",
        "description": "Prefer to talk? Leave your number and the best time to reach you. It takes less than a minute.",
        **_logo(img, "logo-ttu-online"),
        "questionsOnPageMode": "singlePage",
        "showQuestionNumbers": "off",
        "completeText": "Call me back",
        "completedHtml": _thanks("We'll call you, {first_name}", "Expect a call at {phone} on {callback_date} ({best_time}).", "#7c1fff"),
        "pages": [{"name": "page1", "elements": [
            _contact_panel(img, title="Who should we call?"),
            {"type": "text", "name": "callback_date", "title": "Preferred day", "inputType": "date", "isRequired": True},
            {"type": "radiogroup", "name": "best_time", "title": "Best time to call (Central Time)", "isRequired": True, "colCount": 3,
             "choices": ["Morning (8-12)", "Afternoon (12-5)", "Evening (5-7)"], "startWithNewLine": False},
            {"type": "dropdown", "name": "topic", "title": "What would you like to talk about?", "isRequired": True,
             "choices": ["Program information", "Enrollment", "Cost and financial aid", "Technical help", "Something else"]},
            {"type": "html", "name": "tech_tip", "visibleIf": "{topic} = 'Technical help'",
             "html": '<div style="border-left:4px solid #7c1fff;background:#f4edff;padding:10px 14px;border-radius:8px">'
                     '<b>Need help right now?</b> The IT Help Desk is open 24/7 at (806) 742-4357. We will still call you back.</div>'},
            {"type": "comment", "name": "question", "title": "Tell us a little more", "rows": 3,
             "requiredIf": "{topic} = 'Something else'", "description": "Required when you choose Something else."},
            {"type": "boolean", "name": "sms_opt_in", "title": "Text me a reminder before the call", "enableIf": "{phone} notempty",
             "description": "Available once you enter a phone number."},
        ]}],
    }
    return {"subject": "Request a callback", "survey": survey,
            "theme": {"preset": "Violet", "primary": "#7c1fff", "text": "#1e1b4b", "pageBg": "#f5f1ff", "cardBg": "#ffffff", "cornerRadius": 16},
            "thank_you": "Thanks! Our team will call you at the time you chose."}


# ───────────────────────── 4. Employer and partner training (matrix, dynamic panel, numeric validation) ─────────────────────────

def employer_training(img) -> dict:
    survey = {
        "title": "Employer and partner training inquiry",
        "description": "Upskill your team with TTU Online. Tell us about your organization and we will put together a proposal.",
        **_logo(img, "logo-professional-development"),
        "logoPosition": "right",
        "showProgressBar": "both",
        "progressBarType": "pages",
        "showQuestionNumbers": "off",
        "completeText": "Request a proposal",
        "completedHtml": _thanks("Thank you, {first_name}", "A partnership manager will send a proposal for {organization} within three business days.", "#c2410c"),
        "pages": [
            {"name": "organization", "title": "Your organization", "elements": [
                _intro('<div style="border-radius:14px;padding:28px 30px;color:#fff;background:linear-gradient(120deg,#9a3412,#ea580c 60%,#fb923c)">'
                       '<div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;opacity:.85">For employers and partners</div>'
                       '<div style="font-size:30px;font-weight:700;margin:6px 0 4px">Training for your whole team</div>'
                       '<div style="font-size:15px;opacity:.9">Group pricing &middot; custom start dates &middot; progress reports for managers</div></div>'),
                _contact_panel(img, title="Main contact"),
                {"type": "text", "name": "organization", "title": "Organization", "isRequired": True},
                {"type": "text", "name": "job_title", "title": "Your job title", "startWithNewLine": False},
                {"type": "dropdown", "name": "industry", "title": "Industry", "choices": ["Healthcare", "Education", "Government", "Energy", "Manufacturing", "Technology", "Nonprofit"],
                 "showOtherItem": True},
                {"type": "text", "name": "team_size", "title": "How many people would take the training?", "inputType": "number", "startWithNewLine": False,
                 "validators": [{"type": "numeric", "minValue": 1, "maxValue": 5000, "text": "Enter a number between 1 and 5,000."}]},
            ]},
            {"name": "needs", "title": "Training needs", "elements": [
                {"type": "matrix", "name": "topic_priority", "title": "How important is each topic for your team?", "isAllRowsRequired": False,
                 "columns": ["Not needed", "Nice to have", "Important", "Critical"], "rows": COURSES},
                {"type": "radiogroup", "name": "delivery", "title": "Preferred delivery", "colCount": 3,
                 "choices": ["Fully online", "Online with live sessions", "On-site workshop"]},
                {"type": "text", "name": "onsite_location", "title": "Where would the workshop take place?", "visibleIf": "{delivery} = 'On-site workshop'",
                 "requiredIf": "{delivery} = 'On-site workshop'", "placeholder": "City and venue", "description": "Shown only for on-site workshops."},
                {"type": "comment", "name": "goals", "title": "What should your team be able to do after the training?", "rows": 4},
            ]},
            {"name": "team", "title": "Team members (optional)", "elements": [
                {"type": "paneldynamic", "name": "team_members", "title": "Add the people you would like to enroll",
                 "description": "Use Add a team member for each person. You can skip this and send a list later.",
                 "templateTitle": "Team member {panelIndex}", "panelCount": 1, "minPanelCount": 0, "maxPanelCount": 25, "panelAddText": "Add a team member",
                 "panelRemoveText": "Remove", "templateElements": [
                     {"type": "text", "name": "member_name", "title": "Name"},
                     {"type": "text", "name": "member_email", "title": "Email", "inputType": "email", "startWithNewLine": False, "validators": [{"type": "email"}]},
                     {"type": "dropdown", "name": "member_course", "title": "Course", "choices": COURSES},
                 ]},
                _consent(sms=False),
            ]},
        ],
    }
    return {"subject": "Employer and partner training inquiry", "survey": survey,
            "theme": {"preset": "Amber", "primary": "#ea580c", "text": "#292524", "pageBg": "#faf6f1", "cardBg": "#ffffff", "cornerRadius": 8,
                      "headingColor": "#9a3412", "borderColor": "#eadfd3", "fontFamily": "Georgia, serif"},
            "thank_you": "Thank you! A partnership manager will reach out shortly."}


# ───────────────────────── 5. Information session registration (background image, picture choices) ─────────────────────────

def info_session(img) -> dict:
    sessions = [("tue", "Tuesday 12:00 PM · Lunch & learn", "icon-laptop"), ("wed", "Wednesday 6:00 PM · After work", "icon-graduation-cap"),
                ("sat", "Saturday 10:00 AM · Weekend", "icon-certificate")]
    survey = {
        "title": "Information session registration",
        "description": "Join a free 45-minute online session to meet advisors and see how TTU Online programs work.",
        **_logo(img, "logo-ttu-online"),
        "showQuestionNumbers": "off",
        "completeText": "Register",
        "completedHtml": _thanks("See you there, {first_name}!", "We've saved your seat. The join link goes to {email}.", "#0f766e"),
        "pages": [{"name": "page1", "elements": [
            *_banner(img, "banner-welcome-midnight", "Welcome"),
            {"type": "imagepicker", "name": "session", "title": "Choose a session", "isRequired": True, "showLabel": True, "imageFit": "contain",
             "imageHeight": 100, "imageWidth": 170, "choices": [{"value": text, "text": text, "imageLink": img(k)} for _, text, k in sessions if img(k)]},
            _contact_panel(img),
            {"type": "checkbox", "name": "courses", "title": "Programs you'd like to hear about", "choices": COURSES, "colCount": 2, "showSelectAllItem": True},
            {"type": "radiogroup", "name": "guests", "title": "Will anyone join you?", "choices": ["Just me", "Me and one guest", "A group from my workplace"], "colCount": 3},
            {"type": "text", "name": "group_size", "title": "How many people in your group?", "inputType": "number", "visibleIf": "{guests} = 'A group from my workplace'",
             "validators": [{"type": "numeric", "minValue": 2, "maxValue": 50}]},
            {"type": "rating", "name": "familiarity", "title": "How familiar are you with online learning?", "rateType": "smileys", "rateCount": 5, "rateMax": 5,
             "minRateDescription": "New to it", "maxRateDescription": "Very familiar"},
            _consent(),
        ]}],
    }
    theme = {"preset": "Teal", "primary": "#0f766e", "text": "#134e4a", "pageBg": "#ecfdf5", "cardBg": "#ffffff", "cornerRadius": 14, "headingColor": "#115e59"}
    if img("bg-dots-light"):
        theme["backgroundImage"] = img("bg-dots-light")
    return {"subject": "Information session registration", "survey": survey, "theme": theme,
            "thank_you": "You're registered! We'll email you the session link."}


# ───────────────────────── 6. Student support request (branching sections, smileys, file upload) ─────────────────────────

def student_support(img) -> dict:
    survey = {
        "title": "Student support request",
        "description": "Current students: tell us what you need and we will route it to the right team.",
        **_logo(img, "logo-texas-tech"),
        "showProgressBar": "top",
        "showQuestionNumbers": "off",
        "completeText": "Submit request",
        "completedHtml": _thanks("Request received", "Thanks, {first_name}. We'll reply to {email} within one business day.", "#0369a1"),
        "pages": [
            {"name": "who", "title": "Who you are", "elements": [
                *_banner(img, "banner-help-desk-scarlet", "Help desk"),
                _contact_panel(img),
                {"type": "text", "name": "r_number", "title": "R-number", "placeholder": "R12345678", "isRequired": True,
                 "validators": [{"type": "regex", "regex": "^[Rr]\\d{8}$", "text": "R-numbers look like R12345678."}]},
                {"type": "dropdown", "name": "course", "title": "Which course is this about?", "choices": COURSES, "showOtherItem": True, "startWithNewLine": False},
            ]},
            {"name": "issue", "title": "Your request", "elements": [
                {"type": "radiogroup", "name": "support_topic", "title": "What do you need help with?", "isRequired": True, "colCount": 2,
                 "choices": ["Registration or enrollment", "Billing and payment", "Login or Canvas", "Transcripts or certificates", "Accessibility accommodation", "Other"]},
                {"type": "panel", "name": "billing_panel", "title": "Billing details", "visibleIf": "{support_topic} = 'Billing and payment'", "elements": [
                    {"type": "text", "name": "amount", "title": "Amount in question ($)", "inputType": "number", "validators": [{"type": "numeric", "minValue": 0}]},
                    {"type": "text", "name": "invoice", "title": "Invoice or reference number", "startWithNewLine": False},
                ]},
                {"type": "panel", "name": "tech_panel", "title": "Technical details", "visibleIf": "{support_topic} = 'Login or Canvas'", "elements": [
                    {"type": "radiogroup", "name": "device", "title": "Device", "choices": ["Windows", "Mac", "Chromebook", "Phone or tablet"], "colCount": 4},
                    {"type": "dropdown", "name": "browser", "title": "Browser", "choices": ["Chrome", "Edge", "Safari", "Firefox"], "startWithNewLine": False},
                    {"type": "file", "name": "screenshot", "title": "Screenshot of the problem (optional)", "maxSize": 1048576, "acceptedTypes": "image/*"},
                ]},
                {"type": "panel", "name": "access_panel", "title": "Accommodation", "visibleIf": "{support_topic} = 'Accessibility accommodation'", "elements": [
                    {"type": "checkbox", "name": "accommodations", "title": "What would help?", "showOtherItem": True,
                     "choices": ["Extended time", "Captions or transcripts", "Screen-reader friendly materials", "Alternative assignment format"]},
                    {"type": "html", "name": "access_note", "html": "<p>You can also contact Student Disability Services directly. Everything you share stays confidential.</p>"},
                ]},
                {"type": "comment", "name": "details", "title": "Describe the issue", "isRequired": True, "rows": 5, "maxLength": 2000,
                 "placeholder": "What happened, when, and what you have tried so far"},
                {"type": "rating", "name": "urgency", "title": "How urgent is this?", "rateType": "labels", "rateCount": 4, "rateMax": 4,
                 "rateValues": [{"value": 1, "text": "Whenever"}, {"value": 2, "text": "This week"}, {"value": 3, "text": "Tomorrow"}, {"value": 4, "text": "Today"}]},
                {"type": "radiogroup", "name": "contact_method", "title": "How should we reach you?", "colCount": 3, "choices": ["Email", "Phone", "Text message"]},
            ]},
        ],
    }
    return {"subject": "Student support request", "survey": survey,
            "theme": {"preset": "Ocean", "primary": "#0369a1", "text": "#0f172a", "pageBg": "#f0f7fc", "cardBg": "#ffffff", "cornerRadius": 10},
            "thank_you": "Thanks, we've received your request and will get back to you within one business day."}


BUILDERS = [program_information, course_enrollment, request_callback, employer_training, info_session, student_support]


async def _image_resolver(db: AsyncSession):
    rows = (await db.execute(select(ImageAsset.key, ImageAsset.id).where(ImageAsset.key.in_(IMAGE_KEYS)))).all()
    urls = {k: f"/rfi-api/images/{i}/raw" for k, i in rows}
    return lambda key: urls.get(key)


def _hash(survey: dict) -> str:
    return hashlib.sha256(json.dumps(survey, sort_keys=True).encode()).hexdigest()[:16]


def _content(t: dict) -> dict:
    return {"surveyDefinition": t["survey"], "surveyTheme": t["theme"], "surveyEditor": "clone",
            "starterTemplate": {"version": VERSION, "hash": _hash(t["survey"])}}


async def build_templates(db: AsyncSession) -> list[dict]:
    img = await _image_resolver(db)
    return [b(img) for b in BUILDERS]


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
    for t in await build_templates(db):
        db.add(RFI(subject=t["subject"], question="", status=RFIStatus.DRAFT, created_by=user.email, owner_id=user.id, workspace_id=ws.id,
                   content=_content(t), thank_you_message=t["thank_you"]))
    return True


async def refresh_starter_templates(db: AsyncSession) -> int:
    """Upgrade starter forms to the latest version, but only ones nobody has touched.

    A form is replaced only when it is still a draft, has no responses, and its questions are exactly what we seeded
    (same hash, or for the first version: never saved since it was created). Anything a person edited is left alone.
    """
    templates = {t["subject"]: t for t in await build_templates(db)}
    rows = (await db.execute(
        select(RFI).join(Workspace, RFI.workspace_id == Workspace.id).where(Workspace.name == WORKSPACE_NAME, RFI.subject.in_(list(templates)))
    )).scalars().all()
    n = 0
    for r in rows:
        content = r.content or {}
        marker = content.get("starterTemplate") or {}
        if marker.get("version", 1) >= VERSION or r.is_published:
            continue
        if marker:
            untouched = marker.get("hash") == _hash(content.get("surveyDefinition") or {})
        else:
            untouched = r.created_at is not None and r.updated_at is not None and abs((r.updated_at - r.created_at).total_seconds()) < 5
        if not untouched:
            continue
        if (await db.execute(select(func.count(RFISubmission.id)).where(RFISubmission.rfi_id == r.id))).scalar_one():
            continue
        t = templates[r.subject]
        r.content = _content(t)
        r.thank_you_message = t["thank_you"]
        n += 1
    ws_rows = (await db.execute(select(Workspace).where(Workspace.name == WORKSPACE_NAME))).scalars().all()
    for w in ws_rows:
        if w.description != WORKSPACE_DESCRIPTION and w.description.startswith("Ready-made forms"):
            w.description = WORKSPACE_DESCRIPTION
    await db.commit()
    return n


async def backfill_starter_templates(db: AsyncSession) -> int:
    users = (await db.execute(select(User).where(User.templates_seeded.is_(False)))).scalars().all()
    n = 0
    for u in users:
        # call-center-only accounts stay unseeded, so they get templates if they later become RFI users
        if await give_starter_templates(db, u):
            n += 1
    await db.commit()
    return n
