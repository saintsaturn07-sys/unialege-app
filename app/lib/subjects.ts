export type SeniorField = "science" | "commercial" | "art";
export type SubjectCategory = "Core" | "Science" | "Commercial / Business" | "Art / Humanities" | "Trade" | "Junior Secondary";
export type SubjectOption = { name: string; category: SubjectCategory; code: string; color: string };

const juniorNames = [
  "English Studies", "Mathematics", "Nigerian Language", "Intermediate Science",
  "Physical and Health Education", "Digital Technologies", "Religious Studies",
  "Nigerian History", "Social and Citizenship Studies", "Cultural and Creative Arts",
  "Business Studies",
];

const seniorCore = ["English Language", "General Mathematics", "Digital Technologies", "Citizenship and Heritage Studies"];
export const tradeSubjects = [
  "Solar Photovoltaic Installation and Maintenance", "Fashion Design and Garment Making",
  "Livestock Farming", "Beauty and Cosmetology", "Computer Hardware and GSM Repairs",
  "Horticulture and Crop Production",
];
const seniorOptions: Record<SeniorField, { category: SubjectCategory; names: string[] }> = {
  science: { category: "Science", names: ["Biology", "Chemistry", "Physics", "Agriculture", "Further Mathematics", "Physical Education", "Health Education", "Foods & Nutrition", "Geography", "Technical Drawing"] },
  commercial: { category: "Commercial / Business", names: ["Accounting", "Commerce", "Marketing", "Economics"] },
  art: { category: "Art / Humanities", names: ["Nigerian History", "Government", "Christian Religious Studies", "Islamic Studies", "Nigerian Language", "French", "Arabic", "Visual Arts", "Music", "Literature in English", "Home Management", "Catering Craft"] },
};
const colors = ["bg-blue-600", "bg-violet-600", "bg-emerald-600", "bg-amber-500", "bg-sky-600", "bg-rose-500", "bg-indigo-500", "bg-teal-600", "bg-orange-500"];
function codeFor(name: string) { return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 3).toUpperCase(); }
function option(name: string, category: SubjectCategory, index: number): SubjectOption { return { name, category, code: codeFor(name), color: colors[index % colors.length] }; }

export function isSeniorClass(className: string) { return /^SS\s*[123]$/i.test(className.trim()); }
export function isJuniorClass(className: string) { return /^JSS\s*[123]$/i.test(className.trim()); }
export function requiresTradeSubject(className: string) { return isJuniorClass(className) || isSeniorClass(className); }
export function getSubjectsForStudent(className: string, field: SeniorField | null | undefined, tradeSubject?: string | null): SubjectOption[] {
  if (isJuniorClass(className)) return [...juniorNames.map((name, index) => option(name, "Junior Secondary", index)), ...(tradeSubject && tradeSubjects.includes(tradeSubject) ? [option(tradeSubject, "Trade", 8)] : [])];
  if (!isSeniorClass(className) || !field || !seniorOptions[field] || !tradeSubject || !tradeSubjects.includes(tradeSubject)) return [];
  const subjectSet = seniorOptions[field];
  return [
    ...seniorCore.map((name, index) => option(name, "Core", index)),
    ...subjectSet.names.map((name, index) => option(name, subjectSet.category, index + seniorCore.length)),
    ...(tradeSubject ? [option(tradeSubject, "Trade", 8)] : []),
  ];
}

export function getSubjectCategories(subjects: SubjectOption[]): string[] {
  return ["All Subjects", ...Array.from(new Set(subjects.map((subject) => subject.category)))];
}

export function fieldLabel(field: SeniorField | null | undefined) {
  if (field === "science") return "Science";
  if (field === "commercial") return "Commercial / Business";
  if (field === "art") return "Art / Humanities";
  return "Field not assigned";
}
