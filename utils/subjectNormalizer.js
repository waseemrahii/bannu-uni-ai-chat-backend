

const CS_SUBJECTS_NORMALIZATION = {
  // Semester 1-2 (Common Subjects)
  "ENG": ["English", "English Language", "Functional English"],
  "MATH": ["Mathematics", "Math", "Calculus", "Applied Mathematics"],
  "PHY": ["Physics", "Applied Physics"],
  "CHEM": ["Chemistry", "Applied Chemistry"],
  "ISL": ["Islamic Studies", "Islamiat"],
  "PAK": ["Pakistan Studies", "Pak Studies"],
  "CS": ["Computer Science", "Introduction to Computing", "Computing Fundamentals"],
  
  // Semester 3-4 (Core Programming)
  "PF": ["Programming Fundamentals", "C Programming", "C++", "Programming"],
  "OOP": ["Object Oriented Programming", "Java", "OOP"],
  "DSA": ["Data Structures", "Data Structures & Algorithms", "DSA"],
  "ALGO": ["Algorithms", "Algorithm Analysis", "Design & Analysis of Algorithms"],
  "DB": ["Database Systems", "Database", "DBMS", "SQL", "Database Management Systems"],
  "OS": ["Operating Systems", "OS"],
  "CN": ["Computer Networks", "Networking", "Data Communication"],
  "SE": ["Software Engineering", "Software Development"],
  "WEB": ["Web Technologies", "Web Development", "HTML/CSS/JS"],
  "DLD": ["Digital Logic Design", "Logic Design"],
  "COAL": ["Computer Organization & Assembly Language", "Assembly Language", "Computer Architecture"],
  
  // Semester 5-6 (Advanced Topics)
  "AI": ["Artificial Intelligence", "AI"],
  "ML": ["Machine Learning", "ML"],
  "DIP": ["Digital Image Processing", "Image Processing"],
  "CG": ["Computer Graphics", "Graphics"],
  "HCI": ["Human Computer Interaction", "HCI"],
  "SP": ["System Programming", "Compiler Construction"],
  "PP": ["Parallel Programming", "Parallel Computing"],
  "DM": ["Data Mining", "Data Warehousing"],
  "BIGDATA": ["Big Data Analytics", "Big Data"],
  "CC": ["Cloud Computing", "Cloud Technologies"],
  "IOT": ["Internet of Things", "IoT"],
  "IS": ["Information Security", "Cyber Security"],
  "CRYPTO": ["Cryptography", "Network Security"],
  "ERP": ["Enterprise Resource Planning", "ERP Systems"],
  
  // Semester 7-8 (Specialization & Projects)
  "SPM": ["Software Project Management", "Project Management"],
  "TQM": ["Total Quality Management", "Quality Management"],
  "PROJECT": ["Final Year Project", "FYP", "Project"],
  "INTERNSHIP": ["Internship", "Industrial Training"],
  "DMKT": ["Digital Marketing", "Digital Marketing", "Marketing"],
  "ECOM": ["E-Commerce", "E-Commerce Systems"],
  "MCOMM": ["Mobile Commerce", "M-Commerce"],
  "MCOMP": ["Mobile Computing", "Mobile Applications"],
  "DS": ["Data Science", "Data Analytics"],
  "NLP": ["Natural Language Processing", "NLP"],
  "CV": ["Computer Vision", "Vision Systems"],
  "ROBOTICS": ["Robotics", "Intelligent Systems"],
  "BIO": ["Bioinformatics", "Computational Biology"],
  
  // Theory Subjects
  "MGT": ["Management Sciences", "Business Management"],
  "ECO": ["Economics", "Engineering Economics"],
  "STAT": ["Statistics", "Probability & Statistics"],
  "LA": ["Linear Algebra", "Matrix Theory"],
  "DISCRETE": ["Discrete Mathematics", "Discrete Structures"],
  "NUM": ["Numerical Computing", "Numerical Methods"],
  "DE": ["Differential Equations", "Ordinary Differential Equations"]
}

export const normalizeSubject = (subjectText) => {
  if (!subjectText) return null
  
  const text = subjectText.toLowerCase().trim()
  
  // Direct mapping check
  for (const [normalized, variations] of Object.entries(CS_SUBJECTS_NORMALIZATION)) {
    for (const variation of variations) {
      if (text.includes(variation.toLowerCase()) || 
          variation.toLowerCase().includes(text)) {
        return normalized
      }
    }
  }
  
  // Common abbreviations mapping
  const abbreviationMap = {
    "os": "OS",
    "db": "DB", 
    "dbms": "DB",
    "ds": "DSA",
    "dsa": "DSA",
    "ai": "AI",
    "ml": "ML",
    "cn": "CN",
    "se": "SE",
    "oop": "OOP",
    "c++": "PF",
    "java": "OOP",
    "python": "PF",
    "web": "WEB",
    "networking": "CN",
    "graphics": "CG",
    "security": "IS",
    "crypto": "CRYPTO",
    "bigdata": "BIGDATA",
    "cloud": "CC",
    "iot": "IOT",
    "fyp": "PROJECT",
    "project": "PROJECT",
    "marketing": "DMKT",
    "ecom": "ECOM"
  }
  
  return abbreviationMap[text] || subjectText
}

// ADD THIS LINE: Export the object so it can be imported in other files
export { CS_SUBJECTS_NORMALIZATION }