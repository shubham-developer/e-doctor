import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Patient from "@/models/Patient";
import { apiResponse, apiError } from "@/lib/api";

const MALE_NAMES = [
  "Rajesh",
  "Suresh",
  "Mahesh",
  "Ramesh",
  "Dinesh",
  "Vikas",
  "Amit",
  "Rohit",
  "Pradeep",
  "Santosh",
  "Ajay",
  "Vijay",
  "Rakesh",
  "Manish",
  "Deepak",
  "Ashok",
  "Mohan",
  "Krishan",
  "Pankaj",
  "Ankit",
  "Gaurav",
  "Anil",
  "Sunil",
  "Kapil",
  "Lalit",
  "Sanjay",
  "Manoj",
  "Naveen",
  "Dhruv",
  "Arjun",
  "Nikhil",
  "Rahul",
  "Satish",
  "Mukesh",
  "Hemant",
  "Vivek",
  "Abhishek",
  "Devendra",
  "Brijesh",
  "Rajan",
];
const FEMALE_NAMES = [
  "Sunita",
  "Geeta",
  "Meena",
  "Rekha",
  "Savita",
  "Anita",
  "Mamta",
  "Pooja",
  "Priya",
  "Neha",
  "Kavita",
  "Nisha",
  "Asha",
  "Usha",
  "Lata",
  "Sushma",
  "Sudha",
  "Radha",
  "Sarita",
  "Divya",
  "Sakshi",
  "Swati",
  "Renu",
  "Pallavi",
  "Shruti",
  "Mansi",
  "Deepa",
  "Kiran",
  "Archana",
  "Vandana",
  "Reena",
  "Seema",
  "Pratibha",
  "Suman",
  "Shanti",
  "Maya",
  "Parvati",
  "Laxmi",
  "Madhuri",
  "Shubha",
];
const SURNAMES = [
  "Sharma",
  "Verma",
  "Gupta",
  "Singh",
  "Kumar",
  "Yadav",
  "Patel",
  "Joshi",
  "Mishra",
  "Tiwari",
  "Dubey",
  "Tripathi",
  "Pandey",
  "Chaudhary",
  "Agarwal",
  "Garg",
  "Jain",
  "Shah",
  "Mehta",
  "Shukla",
  "Srivastava",
  "Saxena",
  "Rastogi",
  "Kulkarni",
  "Desai",
  "Rao",
  "Reddy",
  "Nair",
  "Iyer",
  "Patil",
];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
const MARITAL = ["Single", "Married", "Married", "Married", "Widowed"];
const GENDERS: ("Male" | "Female")[] = ["Male", "Female"];
const ADDRESSES = [
  "12 Sipri Bazaar, Jhansi",
  "45 Civil Lines, Jhansi",
  "7 Naya Bazar, Jhansi",
  "23 Sadar Bazar, Jhansi",
  "89 Cantonment Road, Jhansi",
  "15 Shastri Nagar, Jhansi",
  "34 Gandhi Nagar, Jhansi",
  "56 Laxmibai Nagar, Jhansi",
  "78 Station Road, Jhansi",
  "10 Medical College Road, Jhansi",
  "22 Manik Chowk, Jhansi",
  "67 Talbehat Road, Jhansi",
  "18 Nagra, Jhansi",
  "3 Vikram Nagar, Jhansi",
  "41 Orchha Road, Jhansi",
  "28 Pahuj Nagar, Jhansi",
  "9 Maharani Laxmibai Colony, Jhansi",
  "55 Gwalior Road, Jhansi",
  "14 Raksa, Jhansi",
  "37 Babina Road, Jhansi",
];
const TPA_OPTIONS = [
  "None",
  "Star Health",
  "CGHS",
  "ESIC",
  "None",
  "None",
  "None",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function phone() {
  return `${pick(["98", "97", "96", "95", "94", "90", "88", "87", "86", "85", "70", "63"])}${String(rand(10000000, 99999999))}`;
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get("x-tenant-id");
  const role = req.headers.get("x-user-role");
  if (!tenantId) return apiError("Unauthorized", 401);
  if (role === "VIEWER") return apiError("Insufficient permissions", 403);

  await connectDB();

  const count = Number((await req.json().catch(() => ({}))).count ?? 80);
  const clampedCount = Math.min(Math.max(count, 1), 150);

  const existing = await Patient.countDocuments({ tenantId });

  const patients = Array.from({ length: clampedCount }, (_, idx) => {
    const gender = pick(GENDERS);
    const firstName = gender === "Male" ? pick(MALE_NAMES) : pick(FEMALE_NAMES);
    const surname = pick(SURNAMES);
    const ageYears = rand(1, 75);
    const ageMonths = rand(0, 11);
    const ageDays = rand(0, 28);
    const tpaVal = pick(TPA_OPTIONS);

    return {
      tenantId,
      uhid: existing + idx + 1,
      name: `${firstName} ${surname}`,
      guardianName: `${pick(MALE_NAMES)} ${surname}`,
      gender,
      age: ageYears,
      ageMonths,
      ageDays,
      bloodGroup: pick(BLOOD_GROUPS),
      maritalStatus: pick(MARITAL),
      phone: phone(),
      address: rand(0, 3) > 0 ? pick(ADDRESSES) : undefined,
      tpa: tpaVal !== "None" ? tpaVal : undefined,
      isDead: rand(0, 15) === 0,
      languagePref: pick(["hi", "hi", "hi", "en"]) as "hi" | "en",
    };
  });

  await Patient.insertMany(patients, { ordered: false });
  return apiResponse({
    inserted: clampedCount,
    total: existing + clampedCount,
  });
}
