import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, ".env") });

const app = express();
const PORT = 3000;
const ALLOW_MOCK_NO_KEY = process.env.ALLOW_MOCK_NO_KEY !== "false";

function hasUsableApiKey(value?: string): boolean {
  if (!value) return false;
  const key = value.trim();
  if (!key) return false;
  if (key.includes("MY_GEMINI_API_KEY")) return false;
  if (key.includes("điền_api_key")) return false;
  if (key.length < 20) return false;
  // Gemini API keys are ASCII; reject obvious placeholder/non-key values.
  if (!/^[\x20-\x7E]+$/.test(key)) return false;
  return true;
}

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit
  },
});

// Zod Schema for validation and JSON Schema generation
const soapSchema = z.object({
  mode: z.enum(["in_room", "dictation"]),
  language: z.literal("vi"),
  transcript: z.string().describe("Vietnamese transcript; nếu mode in_room cố gắng gắn Speaker 1/Speaker 2 nếu có thể"),
  header: z.object({
    encounter_id: z.string().describe("Mã ca khám"),
    datetime: z.string().describe("Ngày giờ"),
    department: z.string().describe("Khoa/phòng"),
    doctor: z.string().describe("Bác sĩ"),
    patient_identifier: z.string().default("").describe("CCCD / Mã bệnh nhân"),
    sex: z.string().default("").describe("Giới tính"),
    patient_info: z.string().describe("(Tuỳ chọn) Tuổi/Giới"),
    patient_name: z.string().default("").describe("Tên bệnh nhân"),
    dob: z.string().default("").describe("Ngày sinh bệnh nhân (dd/mm/yyyy hoặc yyyy-mm-dd)"),
    age: z.string().default("").describe("Tuổi bệnh nhân"),
    exam_started_at: z.string().default("").describe("Thời điểm bắt đầu khám/ghi âm"),
    exam_ended_at: z.string().default("").describe("Thời điểm kết thúc khám/ghi âm")
  }),
  subjective: z.object({
    chief_complaint: z.string().describe("Lý do khám (CC)"),
    hpi_summary: z.string().describe("Bệnh sử hiện tại (HPI) tóm tắt 2-4 câu"),
    onset: z.string().describe("Khởi phát"),
    progression: z.string().describe("Diễn tiến"),
    aggravating_alleviating_factors: z.string().describe("Yếu tố tăng/giảm"),
    allergies: z.string().describe("Dị ứng (Allergy): Có/Không/Chưa rõ (ghi cụ thể nếu có)"),
    current_meds: z.string().describe("Thuốc đang dùng: Có/Không/Chưa rõ (ghi tên nếu có)"),
    relevant_pmh: z.string().describe("Tiền sử liên quan (có thể 1 câu)")
  }),
  assessment: z.object({
    primary_diagnosis: z.string().describe("Chẩn đoán/nhận định chính"),
    differential_diagnosis: z.string().describe("Chẩn đoán phân biệt (nếu cần)"),
    risk_level: z.string().describe("Mức độ / nguy cơ (nếu cần)")
  }),
  plan: z.object({
    labs_imaging: z.string().describe("Cận lâm sàng"),
    medications: z.array(z.object({
      name: z.string(),
      dose: z.string(),
      duration: z.string()
    })).describe("Điều trị/Thuốc (tên - liều - số ngày)"),
    instructions: z.string().describe("Dặn dò"),
    follow_up: z.string().describe("Tái khám / theo dõi"),
    red_flags: z.string().describe("Dấu hiệu cảnh báo cần quay lại ngay")
  }),
  note_text: z.string().describe("format SOAP rõ ràng để copy/paste"),
  missing_info_flags: z.array(z.string()),
  uncertainty_flags: z.array(z.string()),
  disclaimer: z.string().describe("AI chỉ soạn nháp; bác sĩ xác nhận cuối")
});

// Convert Zod schema to JSON schema for Gemini API
const jsonSchema = zodToJsonSchema(soapSchema as any, { target: "openApi3" });

function createMockSoap(mode: "in_room" | "dictation", file?: Express.Multer.File) {
  const now = new Date().toLocaleString("vi-VN");
  const fileInfo = file ? `${file.originalname} (${Math.round(file.size / 1024)}KB)` : "audio chưa rõ";
  const mock = {
    mode,
    language: "vi" as const,
    transcript: `[MOCK] Chưa có GEMINI_API_KEY nên không thể nhận diện nội dung thật từ ${fileInfo}.`,
    header: {
      encounter_id: "MOCK-001",
      datetime: now,
      department: "Lớp 12A6",
      doctor: "Lee Việt Anh",
      patient_identifier: "",
      sex: "",
      patient_info: "Chưa rõ",
      patient_name: "",
      dob: "",
      age: "",
      exam_started_at: now,
      exam_ended_at: now,
    },
    subjective: {
      chief_complaint: "Chưa rõ (mock mode)",
      hpi_summary: "Không có dữ liệu phiên âm thật vì chưa cấu hình API key.",
      onset: "Chưa rõ",
      progression: "Chưa rõ",
      aggravating_alleviating_factors: "Chưa rõ",
      allergies: "Chưa rõ",
      current_meds: "Chưa rõ",
      relevant_pmh: "Chưa rõ",
    },
    assessment: {
      primary_diagnosis: "Chưa đủ dữ liệu để nhận định",
      differential_diagnosis: "",
      risk_level: "Chưa phân tầng nguy cơ",
    },
    plan: {
      labs_imaging: "",
      medications: [],
      instructions: "Cấu hình GEMINI_API_KEY để nhận kết quả AI thật.",
      follow_up: "Sau khi cấu hình key, tải lại file audio và chạy lại.",
      red_flags: "Nếu có triệu chứng nặng, cần khám trực tiếp.",
    },
    note_text:
      "SOAP (MOCK)\nS: Chưa có dữ liệu thật do thiếu GEMINI_API_KEY.\nO: Không có.\nA: Chưa đủ dữ liệu.\nP: Cấu hình key rồi chạy lại.",
    missing_info_flags: [
      "Thiếu GEMINI_API_KEY nên hệ thống đang trả dữ liệu mock.",
      "Chưa có transcript thật từ audio.",
    ],
    uncertainty_flags: ["Kết quả này chỉ để test UI/workflow."],
    disclaimer: "MOCK MODE: Đây không phải kết quả AI thực tế, chỉ dùng để kiểm thử.",
  };

  return soapSchema.parse(mock);
}

function parseDobToDate(dob: string): Date | null {
  const raw = dob.trim();
  if (!raw) return null;

  const dmy = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    const year = Number(dmy[3]);
    const date = new Date(year, month - 1, day);
    if (!Number.isNaN(date.getTime())) return date;
  }

  const ymd = raw.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymd) {
    const year = Number(ymd[1]);
    const month = Number(ymd[2]);
    const day = Number(ymd[3]);
    const date = new Date(year, month - 1, day);
    if (!Number.isNaN(date.getTime())) return date;
  }

  return null;
}

function computeAge(dob: Date, at: Date): number {
  let age = at.getFullYear() - dob.getFullYear();
  const monthDiff = at.getMonth() - dob.getMonth();
  const dayDiff = at.getDate() - dob.getDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age -= 1;
  return Math.max(0, age);
}

function normalizeSoapData(
  data: z.infer<typeof soapSchema>,
  examStartedAt?: string,
  examEndedAt?: string,
) {
  const now = new Date();

  if (!data.header.datetime?.trim()) {
    data.header.datetime = now.toLocaleString("vi-VN");
  }

  if (examStartedAt?.trim()) {
    data.header.exam_started_at = examStartedAt.trim();
  } else if (!data.header.exam_started_at?.trim()) {
    data.header.exam_started_at = data.header.datetime;
  }

  if (examEndedAt?.trim()) {
    data.header.exam_ended_at = examEndedAt.trim();
  } else if (!data.header.exam_ended_at?.trim()) {
    data.header.exam_ended_at = data.header.datetime;
  }

  const dobDate = parseDobToDate(data.header.dob || "");
  if (dobDate && !data.header.age?.trim()) {
    const refDate = new Date(data.header.exam_ended_at || data.header.datetime || now.toISOString());
    if (!Number.isNaN(refDate.getTime())) {
      data.header.age = String(computeAge(dobDate, refDate));
    }
  }

  if (!data.header.patient_info?.trim()) {
    const parts = [];
    if (data.header.patient_name?.trim()) parts.push(data.header.patient_name.trim());
    if (data.header.age?.trim()) parts.push(`${data.header.age.trim()} tuổi`);
    data.header.patient_info = parts.join(" - ");
  }

  return data;
}

app.post("/api/process-audio", upload.single("audio"), async (req, res) => {
  try {
    const file = req.file;
    const mode = req.body.mode;
    const recordingAudience =
      req.body.recordingAudience === "patient_only" ? "patient_only" : "doctor_patient";
    const examStartedAt = typeof req.body.examStartedAt === "string" ? req.body.examStartedAt : "";
    const examEndedAt = typeof req.body.examEndedAt === "string" ? req.body.examEndedAt : "";

    if (!file) {
      return res.status(400).json({ error: "No audio file provided" });
    }

    if (!["in_room", "dictation"].includes(mode)) {
      return res.status(400).json({ error: "Invalid mode. Must be 'in_room' or 'dictation'" });
    }

    if (!hasUsableApiKey(process.env.GEMINI_API_KEY)) {
      if (ALLOW_MOCK_NO_KEY) {
        const mockData = createMockSoap(mode as "in_room" | "dictation", file);
        return res.json(normalizeSoapData(mockData, examStartedAt, examEndedAt));
      }
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY!.trim() });

    // Convert buffer to base64
    const base64Audio = file.buffer.toString("base64");
    const mimeType = file.mimetype;

    const prompt = `
Bạn là một trợ lý y khoa AI chuyên nghiệp. Nhiệm vụ của bạn là nghe file ghi âm cuộc khám bệnh hoặc lời đọc của bác sĩ và tạo ra một ghi chú lâm sàng theo cấu trúc SOAP.

Chế độ hiện tại: ${mode === "in_room" ? "In-room conversation (phòng khám ồn, nhiều người nói)" : "Dictation after visit (bác sĩ đọc lại sau khám, một người nói)"}
Nguồn ghi âm: ${
  recordingAudience === "patient_only"
    ? "Bệnh nhân tự giới thiệu và kể triệu chứng"
    : "Bác sĩ và bệnh nhân trao đổi trong buổi khám"
}

Nguyên tắc an toàn:
- KHÔNG ĐƯỢC bịa thông tin. Nếu không nghe thấy hoặc không có trong audio -> để trống hoặc ghi 'Chưa rõ' và thêm vào missing_info_flags.
- KHÔNG tự ra y lệnh. Thuốc/kế hoạch chỉ là ghi nhận từ audio, không thêm mới.
- Ưu tiên tiếng Việt, văn phong ghi chú lâm sàng ngắn gọn.
- Nếu nghe được thì trích xuất rõ: tên bệnh nhân, CCCD/mã bệnh nhân, giới tính, ngày sinh, tuổi, thời điểm bắt đầu/kết thúc khám.
${mode === "dictation" ? "- Giả định bác sĩ đang đọc theo cấu trúc, ưu tiên độ chính xác." : "- Cố gắng phân biệt vai trò bác sĩ/bệnh nhân trong transcript nhưng không bắt buộc nếu audio kém."}
- Trả về JSON hợp lệ theo đúng schema được cung cấp.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // Use flash for audio processing
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Audio,
              },
            },
            { text: prompt }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: jsonSchema as any,
        temperature: 0.2,
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Empty response from Gemini");
    }

    // Parse and validate the JSON response using Zod
    let parsedData;
    try {
      const rawJson = JSON.parse(responseText);
      parsedData = soapSchema.parse(rawJson);
    } catch (parseError) {
      console.error("JSON Parse or Validation Error:", parseError);
      console.error("Raw Response:", responseText);
      return res.status(500).json({ 
        error: "Failed to parse or validate Gemini response. Please try again.",
        details: parseError instanceof Error ? parseError.message : String(parseError)
      });
    }

    const normalized = normalizeSoapData(parsedData, examStartedAt, examEndedAt);
    res.json(normalized);

  } catch (error: any) {
    console.error("Error processing audio:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

async function startServer() {
  const keyStatus = hasUsableApiKey(process.env.GEMINI_API_KEY) ? "configured" : "missing/invalid";

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Gemini key status: ${keyStatus}`);
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
