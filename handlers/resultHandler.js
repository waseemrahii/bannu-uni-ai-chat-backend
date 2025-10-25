import Result from "../models/resultModel.js";
import { askGemini } from "../services/geminiService.js";

export const handleResultQuery = async (user, message = "") => {
  try {
    // Extract semester from message if provided
    let targetSemester = null;
    if (message) {
      const semesterMatch = message.match(/(\d+)(?:st|nd|rd|th)?\s+semester/i) || 
                           message.match(/semester\s+(\d+)/i);
      if (semesterMatch) {
        targetSemester = semesterMatch[1];
      }
    }

    let results;
    let queryMessage = "";
    
    if (targetSemester) {
      results = await Result.find({ 
        rollNo: user.rollNo, 
        semester: targetSemester 
      }).sort({ createdAt: -1 });
      queryMessage = ` for Semester ${targetSemester}`;
    } else {
      // Get all results if no specific semester
      results = await Result.find({ rollNo: user.rollNo }).sort({ semester: 1 });
      queryMessage = " for all semesters";
    }

    if (!results.length) {
      return {
        reply: `No results found${queryMessage} for roll number ${user.rollNo}.`,
        intent: "RESULT"
      };
    }

    // Format detailed results with all subjects and marks
    const detailedResults = results.map(result => {
      const subjectsDetails = (result.items || [])
        .map(item => {
          const marksInfo = item.marks !== undefined ? `${item.marks} marks` : '';
          const gradeInfo = item.grade ? ` (Grade: ${item.grade})` : '';
          return `${item.subject}: ${marksInfo}${gradeInfo}`;
        })
        .join('\n    • ');

      return `📘 Semester ${result.semester}${result.className ? ` - Class ${result.className}` : ''}:
    • ${subjectsDetails || "No subject details available"}`;
    }).join('\n\n');

    // Calculate overall statistics
    const allSubjects = results.flatMap(result => result.items || []);
    const totalMarks = allSubjects.reduce((sum, item) => sum + (item.marks || 0), 0);
    const averageMarks = allSubjects.length > 0 ? (totalMarks / allSubjects.length).toFixed(2) : 0;
    
    const gradeDistribution = {};
    allSubjects.forEach(item => {
      if (item.grade) {
        gradeDistribution[item.grade] = (gradeDistribution[item.grade] || 0) + 1;
      }
    });

    const gradeSummary = Object.entries(gradeDistribution)
      .map(([grade, count]) => `${grade}: ${count} subject(s)`)
      .join(', ');

    // Create comprehensive result summary
    const resultSummary = `
📊 **Academic Results Summary for ${user.rollNo}${queryMessage}**

${detailedResults}

**Overall Performance:**
• Total Subjects: ${allSubjects.length}
• Average Marks: ${averageMarks}%
• Grade Distribution: ${gradeSummary || 'No grade data available'}

${targetSemester ? '' : '💡 *Tip: Ask for a specific semester (e.g., "1st semester results") for detailed view.*'}
    `.trim();

    // Use AI for additional insights
    let aiInsights = "";
    try {
      const prompt = `
Student with roll number ${user.rollNo} has the following results${queryMessage}:

${results.map(result => 
  `Semester ${result.semester}: ${(result.items || []).map(item => 
    `${item.subject}: ${item.marks || 'N/A'} marks${item.grade ? ` (${item.grade})` : ''}`
  ).join(', ')}`
).join('; ')}

Overall average: ${averageMarks}%
Grade distribution: ${gradeSummary}

Provide a brief, encouraging academic analysis (2-3 sentences) focusing on:
1. Key strengths or improvements
2. General performance feedback
3. Motivational message

Keep it concise and student-friendly.`;

      aiInsights = await askGemini(prompt);
      
      // Filter out generic AI failure responses
      if (aiInsights && !aiInsights.includes("AI request failed") && 
          !aiInsights.includes("No reply from AI") &&
          aiInsights.length > 20) {
        aiInsights = `\n\n🎓 **Academic Insights:**\n${aiInsights}`;
      } else {
        aiInsights = "";
      }
    } catch (aiError) {
      console.error("AI insight generation failed:", aiError.message);
      aiInsights = "";
    }

    const finalReply = resultSummary + aiInsights;

    return {
      reply: finalReply,
      intent: "RESULT",
      meta: { 
        rollNo: user.rollNo, 
        semestersCount: results.length,
        totalSubjects: allSubjects.length,
        averageMarks: parseFloat(averageMarks),
        semesterRequested: targetSemester || "all"
      }
    };

  } catch (error) {
    console.error("💥 [Result Handler Error]:", error.message);
    return {
      reply: "Sorry, I encountered an error while fetching your results. Please try again later.",
      intent: "ERROR"
    };
  }
}
