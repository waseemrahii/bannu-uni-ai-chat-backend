// import { askGemini } from "../services/geminiService.js"

// const INTENT_DEFS = [
//   // Add UNIVERSITY_STATUS with higher priority
//   {
//     name: "UNIVERSITY_STATUS",
//     patterns: [
//       /\b(university|college|institute|classes?)\s*(open|close|closed|opening|closing|will|available)\b/i,
//       /\b(is|will|does)\s+(the\s+)?(university|college|institute|classes?)\s+(be\s+)?(open|close|closed|available)\b/i,
//       /\b(university|college|institute)\s+(tomorrow|today|yesterday|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
//       /\b(open|close|closed)\s+(tomorrow|today|yesterday|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
//       /\b(holiday|leave|break|closed?)\s+(tomorrow|today)\b/i,
//     ],
//   },
//   {
//     name: "TODAY_CLASSES",
//     patterns: [
//       /\btoday\b/i,
//       /\btoday\b.*\b(class|lecture|lab|period|time|schedule)\b/i,
//       /\b(class|lecture|lab|period|time|schedule)\b.*\btoday\b/i,
//     ],
//   },
//   {
//     name: "TOMORROW_CLASSES",
//     patterns: [
//       /\b(tomorrow|tmrw|tommorow|tomorow|tommorrow)\b/i,
//       /\b(tomorrow|tmrw|tommorow|tomorow|tommorrow)\b.*\b(class|lecture|lab|period|time|schedule)\b/i,
//       /\b(class|lecture|lab|period|time|schedule)\b.*\b(tomorrow|tmrw|tommorow|tomorow|tommorrow)\b/i,
//     ],
//   },
//   {
//     name: "YESTERDAY_CLASSES",
//     patterns: [
//       /\byesterday\b/i,
//       /\byesterday\b.*\b(class|lecture|lab|period|time|schedule)\b/i,
//       /\b(class|lecture|lab|period|time|schedule)\b.*\byesterday\b/i,
//     ],
//   },
//   {
//     name: "NEXT_CLASS",
//     patterns: [
//       /\b(next|upcoming|coming|this)\b.*\b(class|lecture|lab|period)\b/i,
//       /\b(class|lecture|lab|period)\b.*\b(next|upcoming|coming|this)\b/i,
//     ],
//   },
//   {
//     name: "DAY_CLASSES",
//     patterns: [
//       /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
//       /\b(on|for|this|next|coming)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
//     ],
//   },
//   {
//   name: "EVENT_INQUIRY",
//   patterns: [
//     /\b(program|party|event|celebration|festival|function|ceremony|gathering|meetup|social)\b/i,
//     /\b(is\s+there|are\s+there|any)\s+(program|party|event|celebration|festival|function)\b/i,
//     /\b(what|when|where)\s+(is|are)\s+(the\s+)?(program|party|event|celebration)\b/i,
//     /\b(upcoming|coming)\s+(program|party|event|celebration)\b/i,
//   ],
// },
// {
//   name: "EXAM_SCHEDULE",
//   patterns: [
//     /\b(exam|paper|date\s*sheet|datesheet|timetable|schedule|finals?|mid\s?term|midterm)\b/i,
//     /\b(upcoming|coming|next)\s+(exam|paper)\b/i,
//     /\bexam\s+(schedule|timetable|dates)\b/i,
//     /\bwhen\s+is\s+(my|the)\s+(exam|paper)\b/i,
//   ],
// },
// {
//   name: "QUIZ",
//   patterns: [
//     /\b(quiz|quize|assignment|asigment|asg|test)\b/i,
//     /\bdeadline|due\b.*\b(quiz|quize|assignment|asigment|asg)\b/i,
//     /\b(upcoming|coming)\s+(quiz|assignment|test)\b/i,
//     /\bwhen\s+is\s+(my|the)\s+(quiz|assignment|test)\b/i,
//   ],
// },
//   {
//     name: "RESULT",
//     patterns: [/\b(result|marks|grade|gpa|cgpa|transcript)\b/i],
//   },
//   {
//     name: "EVENT",
//     patterns: [/\b(event|seminar|workshop|orientation|meeting|webinar)\b/i],
//   },
//   {
//     name: "HOLIDAY",
//     patterns: [
//       /\b(holiday|vacation|break|eid|off\s*day|gazetted)\b/i,
//       /\b(public\s+holiday|national\s+holiday|religious\s+holiday)\b/i,
//     ],
//   },
//   {
//     name: "GENERAL_INFO",
//     patterns: [/\b(fee|fees|admission|guideline|notice|info|policy|form|deadline|scholarship)\b/i],
//   },
// ]

// // Simple rule-based detection (fallback)
// export const detectIntent = async (message) => {
//   const text = String(message || "").toLowerCase()
  
//   console.log(`🔍 Intent Detection for: "${message}"`)
  
//   // University Status - HIGHEST PRIORITY
//   if (/(university|college|institute).*(open|close|closed|will|available)/i.test(text)) return "UNIVERSITY_STATUS"
//   if (/(is|will|does).*(university|college|institute).*(open|close|closed)/i.test(text)) return "UNIVERSITY_STATUS"
//   if (/(open|close|closed).*(tomorrow|today|university)/i.test(text)) return "UNIVERSITY_STATUS"
//   if (/(holiday|leave|break).*(tomorrow|today)/i.test(text)) return "UNIVERSITY_STATUS"

//   // Class-related intents
//   if (/(class|lecture|lab|schedule)/.test(text)) {
//     if (/(today|now|current)/.test(text)) return "TODAY_CLASSES"
//     if (/(tomorrow|tmrw|tommorow)/.test(text)) return "TOMORROW_CLASSES"
//     if (/(yesterday)/.test(text)) return "YESTERDAY_CLASSES"
//     if (/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/.test(text)) return "DAY_CLASSES"
//     if (/(next|upcoming|coming)/.test(text)) return "NEXT_CLASS"
//     return "TODAY_CLASSES"
//   }
  
//   // Other intents
//   if (/(quiz|test|assignment)/.test(text)) return "QUIZ"
//   if (/(exam|paper|datesheet|timetable)/.test(text)) return "EXAM_SCHEDULE"
//   if (/(result|marks|grade|gpa)/.test(text)) return "RESULT"
//   if (/(event|seminar|workshop)/.test(text)) return "EVENT"
//   if (/(holiday|vacation|break)/.test(text)) return "HOLIDAY"
//   if (/(fee|admission|notice|info)/.test(text)) return "GENERAL_INFO"
 
//   // Add to the simple rule-based detection (after UNIVERSITY_STATUS):
// if (/(program|party|event|celebration|festival|function|ceremony)/i.test(text)) return "EVENT_INQUIRY"
// if (/(is there|are there|any).*(program|party|event|celebration)/i.test(text)) return "EVENT_INQUIRY"

//   console.log(`❓ No intent matched, using AI detection`)
  
//   // Fallback to AI detection
//   const systemPrompt = `
// You are a chatbot for a university department.
// Analyze the student message and respond with ONLY ONE intent name.

// Possible intents: 
// - UNIVERSITY_STATUS: Questions about university open/close status, holidays, closures
// - TODAY_CLASSES: Classes for today
// - TOMORROW_CLASSES: Classes for tomorrow  
// - YESTERDAY_CLASSES: Classes for yesterday
// - DAY_CLASSES: Classes for specific days (Monday, Tuesday, etc.)
// - NEXT_CLASS: Next upcoming class
// - QUIZ: Quizzes, assignments, tests
// - EXAM_SCHEDULE: Exams, papers, date sheets
// - RESULT: Results, marks, grades
// - EVENT: Events, seminars, workshops
// - HOLIDAY: Holidays, vacations, breaks
// - GENERAL_INFO: Fees, admissions, notices, policies
// - UNKNOWN: Anything else

// Student message: "${message}"
// Respond with exactly one intent name only.`
  
//   try {
//     const aiIntent = await askGemini(systemPrompt)
//     const clean = (aiIntent || "").trim().toUpperCase()
//     console.log(`🤖 AI detected intent: ${clean}`)
    
//     const valid = [
//       "UNIVERSITY_STATUS", "TODAY_CLASSES", "TOMORROW_CLASSES", "YESTERDAY_CLASSES", 
//       "NEXT_CLASS", "DAY_CLASSES", "QUIZ", "EXAM_SCHEDULE", "RESULT", "EVENT", 
//       "HOLIDAY", "GENERAL_INFO", "UNKNOWN"
//     ]
//     return valid.includes(clean) ? clean : "UNKNOWN"
//   } catch (error) {
//     console.error("❌ AI intent detection failed:", error.message)
//     return "UNKNOWN"
//   }
// }

import { askGemini } from "../services/geminiService.js"

const INTENT_DEFS = [
  // Add UNIVERSITY_STATUS with higher priority
  {
    name: "UNIVERSITY_STATUS",
    patterns: [
      /\b(university|college|institute|classes?)\s*(open|close|closed|opening|closing|will|available)\b/i,
      /\b(is|will|does)\s+(the\s+)?(university|college|institute|classes?)\s+(be\s+)?(open|close|closed|available)\b/i,
      /\b(university|college|institute)\s+(tomorrow|today|yesterday|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
      /\b(open|close|closed)\s+(tomorrow|today|yesterday|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
      /\b(holiday|leave|break|closed?)\s+(tomorrow|today)\b/i,
    ],
  },
  {
    name: "TODAY_CLASSES",
    patterns: [
      /\btoday\b/i,
      /\btoday\b.*\b(class|lecture|lab|period|time|schedule)\b/i,
      /\b(class|lecture|lab|period|time|schedule)\b.*\btoday\b/i,
    ],
  },
  {
    name: "TOMORROW_CLASSES",
    patterns: [
      /\b(tomorrow|tmrw|tommorow|tomorow|tommorrow)\b/i,
      /\b(tomorrow|tmrw|tommorow|tomorow|tommorrow)\b.*\b(class|lecture|lab|period|time|schedule)\b/i,
      /\b(class|lecture|lab|period|time|schedule)\b.*\b(tomorrow|tmrw|tommorow|tomorow|tommorrow)\b/i,
    ],
  },
  {
    name: "YESTERDAY_CLASSES",
    patterns: [
      /\byesterday\b/i,
      /\byesterday\b.*\b(class|lecture|lab|period|time|schedule)\b/i,
      /\b(class|lecture|lab|period|time|schedule)\b.*\byesterday\b/i,
    ],
  },
  {
    name: "NEXT_CLASS",
    patterns: [
      /\b(next|upcoming|coming|this)\b.*\b(class|lecture|lab|period)\b/i,
      /\b(class|lecture|lab|period)\b.*\b(next|upcoming|coming|this)\b/i,
    ],
  },
  {
    name: "DAY_CLASSES",
    patterns: [
      /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
      /\b(on|for|this|next|coming)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
    ],
  },
  {
    name: "EVENT_INQUIRY",
    patterns: [
      /\b(program|party|event|celebration|festival|function|ceremony|gathering|meetup|social)\b/i,
      /\b(is\s+there|are\s+there|any)\s+(program|party|event|celebration|festival|function)\b/i,
      /\b(what|when|where)\s+(is|are)\s+(the\s+)?(program|party|event|celebration)\b/i,
      /\b(upcoming|coming)\s+(program|party|event|celebration)\b/i,
    ],
  },
  {
    name: "EXAM_SCHEDULE",
    patterns: [
      /\b(exam|paper|date\s*sheet|datesheet|timetable|schedule|finals?|mid\s?term|midterm)\b/i,
      /\b(upcoming|coming|next)\s+(exam|paper)\b/i,
      /\bexam\s+(schedule|timetable|dates)\b/i,
      /\bwhen\s+is\s+(my|the)\s+(exam|paper)\b/i,
    ],
  },
  // ADD ASSIGNMENT INTENT - HIGHER PRIORITY THAN QUIZ
  {
    name: "ASSIGNMENT",
    patterns: [
      /\b(assignment|homework|project)\b/i,
      /\b(deadline|due|submit|submission)\s+(date|time)?\b/i,
      /\bwhen\s+is\s+(my|the)\s+(assignment|homework|project)\b/i,
      /\b(upcoming|coming)\s+(assignment|homework|project)\b/i,
      /\b(assignment|homework|project)\s+(due|deadline|submit)\b/i,
    ],
  },
  {
    name: "QUIZ",
    patterns: [
      /\b(quiz|quize|test)\b/i,
      /\b(upcoming|coming)\s+(quiz|test)\b/i,
      /\bwhen\s+is\s+(my|the)\s+(quiz|test)\b/i,
    ],
  },
  {
    name: "RESULT",
    patterns: [/\b(result|marks|grade|gpa|cgpa|transcript)\b/i],
  },
  {
    name: "EVENT",
    patterns: [/\b(event|seminar|workshop|orientation|meeting|webinar)\b/i],
  },
  {
    name: "HOLIDAY",
    patterns: [
      /\b(holiday|vacation|break|eid|off\s*day|gazetted)\b/i,
      /\b(public\s+holiday|national\s+holiday|religious\s+holiday)\b/i,
    ],
  },
  {
    name: "GENERAL_INFO",
    patterns: [/\b(fee|fees|admission|guideline|notice|info|policy|form|deadline|scholarship)\b/i],
  },
]

// Simple rule-based detection (fallback)
export const detectIntent = async (message) => {
  const text = String(message || "").toLowerCase()
  
  console.log(`🔍 Intent Detection for: "${message}"`)
  
  // University Status - HIGHEST PRIORITY
  if (/(university|college|institute).*(open|close|closed|will|available)/i.test(text)) return "UNIVERSITY_STATUS"
  if (/(is|will|does).*(university|college|institute).*(open|close|closed)/i.test(text)) return "UNIVERSITY_STATUS"
  if (/(open|close|closed).*(tomorrow|today|university)/i.test(text)) return "UNIVERSITY_STATUS"
  if (/(holiday|leave|break).*(tomorrow|today)/i.test(text)) return "UNIVERSITY_STATUS"

  // Assignment-specific intents - HIGH PRIORITY
  if (/(assignment|homework|project)/.test(text)) {
    if (/(deadline|due|submit|overdue|late)/.test(text)) return "ASSIGNMENT"
    if (/(today|now|current)/.test(text)) return "ASSIGNMENT"
    if (/(tomorrow|tmrw|tommorow)/.test(text)) return "ASSIGNMENT"
    if (/(yesterday)/.test(text)) return "ASSIGNMENT"
    if (/(upcoming|coming|next)/.test(text)) return "ASSIGNMENT"
    return "ASSIGNMENT"
  }
  
  // Class-related intents
  if (/(class|lecture|lab|schedule)/.test(text)) {
    if (/(today|now|current)/.test(text)) return "TODAY_CLASSES"
    if (/(tomorrow|tmrw|tommorow)/.test(text)) return "TOMORROW_CLASSES"
    if (/(yesterday)/.test(text)) return "YESTERDAY_CLASSES"
    if (/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/.test(text)) return "DAY_CLASSES"
    if (/(next|upcoming|coming)/.test(text)) return "NEXT_CLASS"
    return "TODAY_CLASSES"
  }
  
  // Quiz/Test intents
  if (/(quiz|test)/.test(text)) return "QUIZ"
  
  // Other intents
  if (/(exam|paper|datesheet|timetable)/.test(text)) return "EXAM_SCHEDULE"
  if (/(result|marks|grade|gpa)/.test(text)) return "RESULT"
  if (/(event|seminar|workshop)/.test(text)) return "EVENT"
  if (/(holiday|vacation|break)/.test(text)) return "HOLIDAY"
  if (/(fee|admission|notice|info)/.test(text)) return "GENERAL_INFO"
 
  // Event inquiry
  if (/(program|party|event|celebration|festival|function|ceremony)/i.test(text)) return "EVENT_INQUIRY"
  if (/(is there|are there|any).*(program|party|event|celebration)/i.test(text)) return "EVENT_INQUIRY"

  console.log(`❓ No intent matched, using AI detection`)
  
  // Fallback to AI detection
  const systemPrompt = `
You are a chatbot for a university department.
Analyze the student message and respond with ONLY ONE intent name.

Possible intents: 
- UNIVERSITY_STATUS: Questions about university open/close status, holidays, closures
- TODAY_CLASSES: Classes for today
- TOMORROW_CLASSES: Classes for tomorrow  
- YESTERDAY_CLASSES: Classes for yesterday
- DAY_CLASSES: Classes for specific days (Monday, Tuesday, etc.)
- NEXT_CLASS: Next upcoming class
- ASSIGNMENT: Assignments, homework, projects, deadlines, due dates
- QUIZ: Quizzes, tests
- EXAM_SCHEDULE: Exams, papers, date sheets
- RESULT: Results, marks, grades
- EVENT: Events, seminars, workshops
- HOLIDAY: Holidays, vacations, breaks
- GENERAL_INFO: Fees, admissions, notices, policies
- UNKNOWN: Anything else

Student message: "${message}"
Respond with exactly one intent name only.`
  
  try {
    const aiIntent = await askGemini(systemPrompt)
    const clean = (aiIntent || "").trim().toUpperCase()
    console.log(`🤖 AI detected intent: ${clean}`)
    
    const valid = [
      "UNIVERSITY_STATUS", "TODAY_CLASSES", "TOMORROW_CLASSES", "YESTERDAY_CLASSES", 
      "NEXT_CLASS", "DAY_CLASSES", "ASSIGNMENT", "QUIZ", "EXAM_SCHEDULE", "RESULT", "EVENT", 
      "HOLIDAY", "GENERAL_INFO", "UNKNOWN"
    ]
    return valid.includes(clean) ? clean : "UNKNOWN"
  } catch (error) {
    console.error("❌ AI intent detection failed:", error.message)
    return "UNKNOWN"
  }
}