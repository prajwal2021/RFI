"use client";

import { useState } from "react";
import { BookOpenCheck, Compass, LifeBuoy, Route, Search } from "lucide-react";
import { Opt } from "@/lib/crm";
import { Card, input, JourneyBadge, useMeta } from "@/components/crm/ui";
import { makeMatcher } from "@/lib/search";

const SCREENS: [string, string][] = [
  ["Global search (top bar)", "Type a name, phone (any format), email, R-number or organization. Results show as you type. Always search before creating a contact."],
  ["Home", "Your day at a glance: your open and overdue work, today's calls, queue sizes, and lists of people who need a follow-up."],
  ["Call Log", "Every call and voicemail the Call Center has taken or made, newest first, with the agent's notes. Search by person, phone or words in the notes. The RFI team can read it too."],
  ["Contacts", "Everyone who has called, been called or filled an RFI. Filter by journey status to build call lists (e.g. Responded, not contacted)."],
  ["Contact record (360)", "One page per person: highlights, consent, details, related people, course interests, open work, RFIs, and a timeline of everything."],
  ["Log activity", "On the contact record. Record each call, voicemail, email, text, chat, walk-in, meeting or internal note, with an outcome and notes."],
  ["Work Queues", "Tasks, callbacks, cases and handoffs. 'My work' is yours; team queues hold unassigned items anyone can pick up."],
  ["Team Board", "For supervisors: workload per person, queue depth, overdue counts and stalled items."],
  ["Courses", "The shared course catalog. Opening a Coming-soon course creates follow-up tasks for everyone on its waitlist."],
  ["Setup", "Add custom fields to contacts and review the standard lists (outcomes, reasons, statuses) and what each means."],
  ["Screen pop (/crm/pop)", "Opened by the phone system (CXone) when a call arrives. Finds the caller by number or offers a pre-filled New Contact."],
  ["RFI Forms → Responses", "Each RFI response shows the linked person, their journey and call history, plus a 'Send to Call Center' button."],
];

const ITEMS: [string, string][] = [
  ["Contact", "One record per real person: student, parent, employer contact. Everything else attaches to it."],
  ["Interaction", "A logged touchpoint (call, voicemail, email, SMS, chat, walk-in, meeting, note) with outcome, reason and notes."],
  ["Task", "A to-do with a due date and owner, e.g. 'Email the brochure'."],
  ["Callback", "A promise to call someone back at a set time. Created from the call form or the Callback button."],
  ["Case (ticket)", "A problem that must be resolved and closed with a written resolution, e.g. billing or a technical issue."],
  ["Handoff", "Work passed between teams, with a reason and notes. Call Center ↔ RFI Team in both directions."],
  ["Queue", "A team's list of unassigned work. Pick up an item to make it yours; return it to the queue if you cannot finish it."],
  ["Course interest", "A person's interest in one course, moved along the path: Inquiry → Interested → Waitlist → Applied → Enrolled (or Lost)."],
  ["Journey status", "Calculated for every person from their calls, RFI links, responses and interests. Tells you the next best action."],
  ["Relationship", "Links people, e.g. parent ↔ student. A call 'on behalf of' someone is logged on both records."],
  ["Consent & Do not contact", "What the person agreed to (call / email / SMS). Do not contact blocks all outbound outreach."],
  ["Merge", "Combines a duplicate record into this one. History moves over; the duplicate is removed."],
  ["Custom field", "An extra field your team adds to every contact in Setup, e.g. Employer ID."],
  ["Access types", "Set by an admin when creating a user. RFI user: builds forms and reads responses, and in the Call Center can read every person and every call with its notes (the Call Log), but cannot log calls or change courses and settings. Call Center user: the whole Call Center, plus read-only RFI responses. A person can be both."],
  ["Notifications (bell)", "The bell at the top shows work assigned to you, new items in your team's queue (RFI Team or Call Center), status changes and comments on items you sent. Click one to open it. The number is how many are unread."],
  ["Record owner", "The person responsible for a contact. The first agent to log activity becomes owner automatically."],
];

const HOWTO: { title: string; steps: string[] }[] = [
  { title: "Someone calls for the first time", steps: [
    "Search their phone number or name in the top bar.",
    "No match → click 'Create a new contact'. Ask for consent to call, email and text.",
    "On their record, Log activity: Call · Inbound · outcome · reason · course discussed · notes.",
    "If they need information by form, click Send to RFI Team and pick the reason; the RFI team sends the form.",
  ] },
  { title: "Someone calls who already filled an RFI", steps: [
    "Search them; the journey badge shows 'Responded…'.",
    "Open the RFIs card → Show answers to see what they told us.",
    "Log the call. Their journey moves to 'Responded and contacted'.",
  ] },
  { title: "A parent calls about their student", steps: [
    "Find or create the parent, then the student (or use Relationships → Add).",
    "Link them: Parent / guardian of.",
    "Log the call on the parent and choose 'Calling on behalf of' the student; it appears on both records.",
  ] },
  { title: "Caller wants a call back later", steps: [
    "Log the call with outcome 'Callback requested' and set 'Schedule callback'.",
    "A callback task appears in your My Work at that time.",
  ] },
  { title: "Something needs fixing (billing, technical, records)", steps: [
    "Click New Case on the contact, choose a category and priority.",
    "Leave 'Assigned to' empty to send it to the team queue, or assign it.",
    "Close it with a written resolution when solved.",
  ] },
  { title: "Pass someone to the RFI team", steps: [
    "Click 'Send to RFI Team' on the contact. Pick a reason (e.g. Send this person an RFI) and add notes.",
    "It lands in the RFI Team queue. Track it under Work Queues → Sent by me.",
  ] },
  { title: "RFI team wants the Call Center to phone a respondent", steps: [
    "In RFI Forms → Responses, open the response and click 'Send to Call Center'.",
    "It lands in the Call Center queue with the person and response attached.",
  ] },
  { title: "Work a follow-up list", steps: [
    "Home → People to follow up, or Contacts → filter by journey status.",
    "Start with 'Responded, not contacted', then 'RFI opened, not submitted'.",
  ] },
  { title: "Caller asks us to stop contacting them", steps: [
    "Log the call with outcome 'Asked not to be contacted' (this sets Do not contact automatically).",
    "Outbound calls, RFI links and texts are blocked from then on; inbound calls can still be logged.",
  ] },
  { title: "Found a duplicate", steps: [
    "Open the record you want to keep → merge icon → find the duplicate → Merge.",
  ] },
  { title: "A coming-soon course opens", steps: [
    "Courses → edit → set status to Available now.",
    "Everyone on its waitlist (who has not opted out) gets a follow-up task in the Call Center queue.",
  ] },
];

function List({ items }: { items: [string, string][] }) {
  const f = items;
  return (
    <dl className="divide-y divide-[#f3f3f3]">
      {f.map(([a, b]) => (
        <div key={a} className="grid sm:grid-cols-[220px_1fr] gap-1 sm:gap-4 py-2 text-[13px]">
          <dt className="font-semibold">{a}</dt><dd className="text-[#444]">{b}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function HelpPage() {
  const { meta } = useMeta();
  const [q, setQ] = useState("");
  const ql = q.trim();
  const match = makeMatcher(ql);
  const LOOP = "how the loop works call contact log personal rfi link open submit matched interest enrolled timeline journey status";
  const journey = (meta?.journey || []).filter((o: Opt) => match(`${o.label} ${o.description} journey status`));
  const screens = SCREENS.filter(([a, b]) => match(`${a} ${b}`));
  const items = ITEMS.filter(([a, b]) => match(`${a} ${b}`));
  const howto = HOWTO.filter((h) => match(`${h.title} ${h.steps.join(" ")}`));
  const showLoop = !ql || match(LOOP);
  const nothing = !!ql && !showLoop && !journey.length && !screens.length && !items.length && !howto.length;

  return (
    <div className="max-w-5xl mx-auto space-y-3">
      <div>
        <h1 className="text-[20px] font-bold">Help</h1>
        <p className="text-[13px] text-[#444]">What everything in the Call Center is and how to use it. Hover any (i) icon in the app for the same explanations.</p>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#747474]" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search help… e.g. classify a call, duplicate, callback, do not contact" className={`${input} pl-9 h-9`} autoFocus />
      </div>
      {nothing && (
        <div className="rounded border border-[#e5e5e5] bg-white p-6 text-center text-[13px] text-[#747474]">
          Nothing matches &ldquo;{ql}&rdquo;. Try a shorter word, such as <b>call</b>, <b>case</b>, <b>RFI</b> or <b>queue</b>.
        </div>
      )}

      {showLoop && <Card title="How the loop works" icon={<Route className="h-4 w-4" />} iconColor="#2e844a">
        <ol className="list-decimal pl-5 space-y-1 text-[13px] text-[#444]">
          <li>A person calls (or is called). The agent finds or creates their <b>contact</b> and <b>logs the call</b>.</li>
          <li>If they need a form, the agent sends a <b>personal RFI link</b>, or hands off to the RFI team.</li>
          <li>The app records when they <b>open</b> and <b>submit</b> the link. Any RFI response, even from the public link, is matched to the person by email, phone or R-number, or a new contact is created.</li>
          <li>Courses they pick on the RFI or discuss on the call become <b>course interests</b>, moved along the path to <b>Enrolled</b>.</li>
          <li>Both teams see the same <b>timeline</b> and <b>journey status</b>, so nobody has to ask &ldquo;did they call?&rdquo; or &ldquo;did they fill the form?&rdquo;.</li>
        </ol>
      </Card>}

      {journey.length > 0 && <Card title="Journey statuses" icon={<Compass className="h-4 w-4" />} iconColor="#dd7a01" help="Calculated automatically for every person. Use them as call lists.">
        <ul className="space-y-1.5">
          {journey.map((o: Opt) => (
            <li key={o.value} className="grid sm:grid-cols-[220px_1fr] gap-1 sm:gap-4 text-[13px]">
              <span><JourneyBadge value={o.value} label={o.label} /></span><span className="text-[#444]">{o.description}</span>
            </li>
          ))}
        </ul>
      </Card>}

      {screens.length > 0 && <Card title="Screens" icon={<BookOpenCheck className="h-4 w-4" />}><List items={screens} /></Card>}
      {items.length > 0 && <Card title="Things you work with" icon={<LifeBuoy className="h-4 w-4" />} iconColor="#5867e8"><List items={items} /></Card>}

      {howto.length > 0 && <Card title="How to…" icon={<Route className="h-4 w-4" />} iconColor="#06a59a">
        <div className="grid md:grid-cols-2 gap-4">
          {howto.map((h) => (
            <div key={h.title} className="rounded border border-[#e5e5e5] p-3">
              <h3 className="text-[13px] font-bold mb-1">{h.title}</h3>
              <ol className="list-decimal pl-5 space-y-0.5 text-[13px] text-[#444]">{h.steps.map((s) => <li key={s}>{s}</li>)}</ol>
            </div>
          ))}
        </div>
      </Card>}
    </div>
  );
}
