import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Upload,
  FileAudio,
  CircleAlert,
  CircleCheck,
  Copy,
  Download,
  RefreshCw,
  LoaderCircle,
  Mic,
  Square,
  Activity,
  History,
  ClipboardList,
  CircleUserRound,
  TriangleAlert,
  LayoutTemplate,
  Clock3,
  Search,
  ArrowLeft,
  Play,
  Disc3,
  Volume2,
} from 'lucide-react';
import {
  chiefComplaintList,
  hpiPromptsBySystem,
  mandatoryVoiceQuestions,
  pmhChecklist,
  redFlagRules,
  syndromeModules,
  universalHpiChecklist,
  type ChiefComplaintItem,
  type SyndromeModule,
  type SystemTag,
} from './clinicalLibrary';
import creatorPhoto from './assets/creator-photo.jpg';

type Mode = 'in_room' | 'dictation';

interface Medication {
  name: string;
  dose: string;
  duration: string;
}

interface SoapData {
  mode: Mode;
  language: string;
  transcript: string;
  header: {
    encounter_id: string;
    datetime: string;
    department: string;
    doctor: string;
    patient_identifier: string;
    sex: string;
    critical_flag: boolean;
    patient_info: string;
    patient_name: string;
    dob: string;
    age: string;
    exam_started_at: string;
    exam_ended_at: string;
  };
  subjective: {
    chief_complaint: string;
    hpi_summary: string;
    onset: string;
    progression: string;
    aggravating_alleviating_factors: string;
    allergies: string;
    current_meds: string;
    relevant_pmh: string;
  };
  assessment: {
    primary_diagnosis: string;
    differential_diagnosis: string;
    risk_level: string;
  };
  plan: {
    labs_imaging: string;
    medications: Medication[];
    instructions: string;
    follow_up: string;
    red_flags: string;
  };
  note_text: string;
  evidence_lines: Record<string, string[]>;
  missing_info_flags: string[];
  uncertainty_flags: string[];
  disclaimer: string;
}

interface ExamHistoryItem {
  id: string;
  historyKey: string;
  source: 'generated' | 'saved';
  savedAt: string;
  sheetTitle: string;
  encounterId: string;
  patientName: string;
  patientIdentifier: string;
  sex: string;
  examDateTime: string;
  examStartedAt: string;
  examEndedAt: string;
  durationSec: number;
  chiefComplaint: string;
  primaryDiagnosis: string;
  riskLevel: string;
  critical: boolean;
}

type MainPage = 'exam' | 'history' | 'template' | 'creator_info';
type RecordingAudience = 'doctor_patient' | 'patient_only';
type ExamFlowPage = 'audience_picker' | 'doctor_patient' | 'patient_only';

type DemoVoiceCase = {
  id: string;
  title: string;
  subtitle: string;
  riskLabel: string;
  transcript: string;
  prefill: {
    header: Partial<SoapData['header']>;
    subjective: Partial<SoapData['subjective']>;
    assessment: Partial<SoapData['assessment']>;
    plan: Partial<SoapData['plan']>;
  };
};

export default function App() {
  const HISTORY_STORAGE_KEY = 'mednote_exam_history_v1';
  const [mode, setMode] = useState<Mode>('in_room');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SoapData | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingStartedAt, setRecordingStartedAt] = useState<Date | null>(null);
  const [recordingEndedAt, setRecordingEndedAt] = useState<Date | null>(null);
  const [examHistory, setExamHistory] = useState<ExamHistoryItem[]>([]);
  const [activePage, setActivePage] = useState<MainPage>('exam');
  const [recordingAudience, setRecordingAudience] = useState<RecordingAudience>('doctor_patient');
  const [examFlowPage, setExamFlowPage] = useState<ExamFlowPage>('audience_picker');
  const [templateExampleNotice, setTemplateExampleNotice] = useState(false);
  const [showClinicIntro, setShowClinicIntro] = useState(true);
  const [introFading, setIntroFading] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [selectedDemoCaseId, setSelectedDemoCaseId] = useState('case_1');
  const [selectedPatientDemoCaseId, setSelectedPatientDemoCaseId] = useState('patient_case_1');
  const [selectedDictationDemoCaseId, setSelectedDictationDemoCaseId] = useState('dictation_case_1');
  const [playingDemoCaseId, setPlayingDemoCaseId] = useState<string | null>(null);
  const [isVoicePaused, setIsVoicePaused] = useState(false);
  const [showSplitView, setShowSplitView] = useState(false);
  const [showEvidenceDetail, setShowEvidenceDetail] = useState(false);
  const [selectedEvidenceFieldKey, setSelectedEvidenceFieldKey] = useState('');
  const [selectedEvidenceLine, setSelectedEvidenceLine] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef(false);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const recordingStartMsRef = useRef<number | null>(null);
  const transcriptPanelRef = useRef<HTMLDivElement | null>(null);
  const liveTranscriptRef = useRef('');
  const interimTranscriptRef = useRef('');

  const emptySoap: SoapData = {
    mode: 'in_room',
    language: 'vi',
    transcript: '',
    header: {
      encounter_id: '',
      datetime: '',
      department: 'Lớp 12A6',
      doctor: 'Lee Việt Anh',
      patient_identifier: '',
      sex: '',
      critical_flag: false,
      patient_info: '',
      patient_name: '',
      dob: '',
      age: '',
      exam_started_at: '',
      exam_ended_at: '',
    },
    subjective: { chief_complaint: '', hpi_summary: '', onset: '', progression: '', aggravating_alleviating_factors: '', allergies: '', current_meds: '', relevant_pmh: '' },
    assessment: { primary_diagnosis: '', differential_diagnosis: '', risk_level: '' },
    plan: { labs_imaging: '', medications: [], instructions: '', follow_up: '', red_flags: '' },
    note_text: '',
    evidence_lines: {},
    missing_info_flags: [],
    uncertainty_flags: [],
    disclaimer: ''
  };
  const [formSoap, setFormSoap] = useState<SoapData>(emptySoap);

  useEffect(() => {
    liveTranscriptRef.current = liveTranscript;
  }, [liveTranscript]);

  useEffect(() => {
    interimTranscriptRef.current = interimTranscript;
  }, [interimTranscript]);

  const patientVoiceQuestions = useMemo(() => mandatoryVoiceQuestions, []);
  const demoVoiceCases = useMemo<DemoVoiceCase[]>(
    () => [
      {
        id: 'case_1',
        title: 'Ca 1',
        subtitle: 'Đau họng, ho, sốt nhẹ',
        riskLabel: 'Nguy cơ thấp',
        transcript: `Bác sĩ: Chào chị, cho bác sĩ xin họ tên, ngày sinh và CCCD/mã bệnh nhân.
Bệnh nhân: Dạ em Nguyễn Thị Mai, sinh 14/05/2001, CCCD 079201001234. Dạ Nữ.
Bác sĩ: Hôm nay chị đến khám vì gì?
Bệnh nhân: Em đau họng và ho 3 ngày nay, hơi sốt.
Bác sĩ: Chị mô tả ngắn tình trạng hiện tại giúp bác sĩ?
Bệnh nhân: Từ 3 ngày trước. Ngày đầu rát họng, ngày sau bắt đầu ho khan. Hôm qua sốt nhẹ, hôm nay vẫn rát họng. Em đo được 38.3 tối qua.
Bác sĩ: Chị ho khan hay có đờm? Có khó thở, đau ngực không?
Bệnh nhân: Ho khan, đờm ít. Không khó thở, không đau ngực. Có nghẹt mũi nhẹ.
Bác sĩ: Tiền sử bệnh nền gì không, dị ứng gì không, và đã uống thuốc gì chưa?
Bệnh nhân: Dạ không bệnh nền. Không ghi nhận dị ứng. Em có uống 1 viên paracetamol tối qua và ngậm kẹo ho.
Bác sĩ: Họng đỏ nhẹ, phổi nghe trong. Nhận định chính: viêm họng/viêm đường hô hấp trên. Phân biệt cúm/COVID nếu sốt tăng. Mức độ thấp.
Bác sĩ: Kế hoạch điều trị triệu chứng, nghỉ ngơi, uống nước ấm, súc họng nước muối. Nếu sốt cao, ho tăng, khó thở hoặc đau ngực thì quay lại ngay. Tái khám sau 2 đến 3 ngày nếu không đỡ.
Bệnh nhân: Dạ em cảm ơn bác sĩ.`,
        prefill: {
          header: {
            patient_name: 'Nguyễn Thị Mai',
            dob: '14/05/2001',
            patient_identifier: '079201001234',
            sex: 'Nữ',
          },
          subjective: {
            chief_complaint: 'Đau họng, ho 3 ngày, sốt nhẹ',
            onset: '3 ngày trước',
            progression: 'Ban đầu rát họng, sau đó ho khan, tối qua sốt 38.3',
            hpi_summary: 'Đau họng và ho khan 3 ngày, sốt nhẹ tối qua 38.3 độ C, nghẹt mũi nhẹ, chưa có khó thở hay đau ngực.',
            allergies: 'Không ghi nhận',
            current_meds: 'Paracetamol 1 viên tối qua, ngậm kẹo ho',
            relevant_pmh: 'Không bệnh nền',
          },
          assessment: {
            primary_diagnosis: 'Viêm họng / viêm đường hô hấp trên',
            differential_diagnosis: 'Cúm hoặc COVID nếu sốt tăng/tiếp xúc nguồn lây',
            risk_level: 'Thấp',
          },
          plan: {
            instructions: 'Nghỉ ngơi, uống nước ấm, súc họng nước muối, theo đơn triệu chứng.',
            follow_up: 'Tái khám sau 2-3 ngày nếu không đỡ hoặc sớm hơn nếu nặng.',
            red_flags: 'Sốt cao, ho tăng, khó thở, đau ngực',
            medications: [
              { name: 'Paracetamol', dose: 'Theo đơn bác sĩ', duration: 'Khi sốt' },
            ],
          },
        },
      },
      {
        id: 'case_2',
        title: 'Ca 2',
        subtitle: 'Đau thượng vị, ợ chua',
        riskLabel: 'Thấp - trung bình',
        transcript: `Bác sĩ: Chào anh, cho xin họ tên, ngày sinh, CCCD.
Bệnh nhân: Dạ em Lê Văn Bình, sinh 02/09/1988, CCCD 012088009876. Dạ Nam.
Bác sĩ: Lý do anh đến khám hôm nay?
Bệnh nhân: Em đau vùng thượng vị và ợ chua, buồn nôn nhẹ.
Bác sĩ: Triệu chứng bắt đầu khi nào?
Bệnh nhân: Khoảng 1 tuần rồi, 2 hôm nay đau nhiều hơn.
Bác sĩ: Đau kiểu gì và mức độ?
Bệnh nhân: Bỏng rát, cỡ 6 trên 10, hay đau khi đói và tối nằm xuống.
Bác sĩ: Có nôn ra máu, đi cầu phân đen, sốt hoặc sụt cân nhanh không?
Bệnh nhân: Dạ không nôn máu, không phân đen, không sốt, không sụt cân.
Bác sĩ: Có uống thuốc giảm đau gần đây không?
Bệnh nhân: Tuần trước em đau răng nên uống ibuprofen mấy ngày.
Bác sĩ: Tiền sử dạ dày, dị ứng và thuốc đang dùng?
Bệnh nhân: Em từng viêm dạ dày cách đây 2 năm. Không ghi nhận dị ứng. Không dùng thuốc thường xuyên.
Bác sĩ: Khám bụng ấn thượng vị đau nhẹ, bụng mềm.
Bác sĩ: Nhận định chính nghi viêm dạ dày hoặc GERD. Chẩn đoán phân biệt loét dạ dày tá tràng. Nguy cơ thấp đến trung bình.
Bác sĩ: Kế hoạch dùng thuốc giảm acid/bảo vệ niêm mạc theo đơn, cân nhắc xét nghiệm H. pylori nếu kéo dài.
Bác sĩ: Dặn dò tránh NSAID như ibuprofen, hạn chế cà phê, không ăn muộn, tránh cay chua và rượu bia. Tái khám sau 7 đến 10 ngày.
Bác sĩ: Nếu nôn ra máu, phân đen, đau tăng dữ dội, chóng mặt hoặc ngất thì quay lại ngay.
Bệnh nhân: Dạ hiểu rồi ạ.`,
        prefill: {
          header: {
            patient_name: 'Lê Văn Bình',
            dob: '02/09/1988',
            patient_identifier: '012088009876',
            sex: 'Nam',
          },
          subjective: {
            chief_complaint: 'Đau thượng vị, ợ chua, buồn nôn nhẹ',
            onset: 'Khoảng 1 tuần, nặng hơn 2 ngày gần đây',
            progression: 'Tăng đau trong 2 ngày gần đây, đau bỏng rát 6/10',
            hpi_summary: 'Đau thượng vị kiểu bỏng rát, tăng khi đói và khi nằm buổi tối, kèm ợ chua và buồn nôn nhẹ.',
            allergies: 'Không ghi nhận',
            current_meds: 'Đã dùng ibuprofen vài ngày tuần trước',
            relevant_pmh: 'Tiền sử viêm dạ dày cách đây 2 năm',
          },
          assessment: {
            primary_diagnosis: 'Nghi viêm dạ dày / GERD',
            differential_diagnosis: 'Loét dạ dày - tá tràng (theo dõi)',
            risk_level: 'Thấp - trung bình',
          },
          plan: {
            instructions: 'Dùng thuốc giảm acid/bảo vệ niêm mạc theo đơn, tránh NSAID, điều chỉnh ăn uống.',
            follow_up: 'Tái khám sau 7-10 ngày hoặc sớm hơn nếu nặng.',
            red_flags: 'Nôn ra máu, phân đen, đau tăng dữ dội, chóng mặt, ngất',
            medications: [
              { name: 'Thuốc giảm acid', dose: 'Theo đơn bác sĩ', duration: '7-10 ngày' },
            ],
          },
        },
      },
      {
        id: 'case_3',
        title: 'Ca 3',
        subtitle: 'Khó thở, khò khè',
        riskLabel: 'Nguy cơ trung bình',
        transcript: `Bác sĩ: Chào em, cho bác sĩ xin họ tên, ngày sinh và CCCD hoặc mã bệnh nhân.
Bệnh nhân: Dạ em Phạm Gia Khánh, sinh 30/12/2005, CCCD 045205012345. Dạ Nam.
Bác sĩ: Hôm nay em đến khám vì gì?
Bệnh nhân: Em khó thở và khò khè, tức ngực.
Bác sĩ: Bắt đầu từ khi nào?
Bệnh nhân: Từ tối qua. Em dọn phòng nhiều bụi xong bắt đầu khó thở.
Bác sĩ: Hiện tại mức độ khó thở thế nào?
Bệnh nhân: Em thấy khó thở vừa, nói được nhưng phải nghỉ giữa câu.
Bác sĩ: Có sốt không? Ho có đờm không?
Bệnh nhân: Không sốt. Ho ít, chủ yếu là khò khè.
Bác sĩ: Em có tiền sử hen hay bệnh phổi không? Dị ứng gì không?
Bệnh nhân: Dạ em hen phế quản từ nhỏ, hay dị ứng bụi và thay thời tiết.
Bác sĩ: Thuốc đang dùng gần đây?
Bệnh nhân: Em có xịt salbutamol 2 nhát nhưng vẫn còn khó thở.
Bác sĩ: Khám phổi có khò khè, cần theo dõi sinh hiệu và SpO2.
Bác sĩ: Nhận định chính là cơn hen hoặc khò khè do kích thích bụi. Chẩn đoán phân biệt viêm phế quản hoặc dị ứng hô hấp. Mức độ trung bình.
Bác sĩ: Kế hoạch xử trí theo phác đồ tại cơ sở, theo dõi hô hấp; nếu không cải thiện hoặc nặng lên cần chuyển tuyến/cấp cứu.
Bác sĩ: Dặn dò tránh bụi, đeo khẩu trang, theo dõi khó thở. Tái khám 24 đến 48 giờ hoặc sớm hơn nếu nặng.
Bác sĩ: Dấu hiệu cảnh báo gồm khó thở tăng nhanh, không nói được câu dài, tím tái, đau ngực, SpO2 thấp, lơ mơ.
Bệnh nhân: Dạ em hiểu.`,
        prefill: {
          header: {
            patient_name: 'Phạm Gia Khánh',
            dob: '30/12/2005',
            patient_identifier: '045205012345',
            sex: 'Nam',
          },
          subjective: {
            chief_complaint: 'Khó thở, khò khè, tức ngực',
            onset: 'Từ tối qua sau khi tiếp xúc bụi',
            progression: 'Khó thở mức vừa, nói được nhưng phải nghỉ giữa câu',
            hpi_summary: 'Khởi phát sau dọn phòng nhiều bụi, hiện còn khó thở dù đã xịt salbutamol 2 nhát.',
            allergies: 'Dị ứng bụi, nhạy cảm khi thay thời tiết',
            current_meds: 'Đã xịt salbutamol 2 nhát nhưng còn khó thở',
            relevant_pmh: 'Hen phế quản từ nhỏ',
          },
          assessment: {
            primary_diagnosis: 'Cơn hen / khò khè do kích thích bụi',
            differential_diagnosis: 'Viêm phế quản, dị ứng hô hấp',
            risk_level: 'Trung bình',
          },
          plan: {
            instructions: 'Xử trí theo phác đồ tại cơ sở, theo dõi hô hấp và sinh hiệu, tránh bụi và đeo khẩu trang.',
            follow_up: 'Tái khám sau 24-48 giờ hoặc sớm hơn nếu nặng.',
            red_flags: 'Khó thở tăng nhanh, không nói được câu dài, tím tái, đau ngực, SpO2 thấp, lơ mơ',
            medications: [
              { name: 'Thuốc giãn phế quản', dose: 'Theo phác đồ bác sĩ', duration: 'Theo đáp ứng điều trị' },
            ],
          },
        },
      },
    ],
    [],
  );
  const selectedDemoCase = useMemo(
    () => demoVoiceCases.find((item) => item.id === selectedDemoCaseId) || demoVoiceCases[0],
    [demoVoiceCases, selectedDemoCaseId],
  );
  const patientDemoVoiceCases = useMemo<DemoVoiceCase[]>(
    () => [
      {
        id: 'patient_case_1',
        title: 'Ca 1',
        subtitle: 'BN tự khai: đau họng/ho/sốt',
        riskLabel: 'Nguy cơ thấp',
        transcript: `Hệ thống (Câu 1/7): Họ tên – CCCD/Mã BN – Ngày sinh – Giới tính?
Bệnh nhân: Họ và tên: Nguyễn Thị Mai. CCCD/Mã BN: 079201001234. Ngày sinh: 14/05/2001. Giới tính: Nữ.
Hệ thống (Câu 2/7): Lý do khám chính hôm nay?
Bệnh nhân: Lý do khám: Đau họng và ho.
Hệ thống (Câu 3/7): Mô tả ngắn gọn triệu chứng hiện tại?
Bệnh nhân: Bắt đầu từ: 3 ngày trước. Diễn tiến: ngày đầu rát họng, sau đó ho khan, hôm qua sốt nhẹ.
Hệ thống (Câu 4/7): Mức độ triệu chứng hiện tại (đau/sốt/khó thở…)?
Bệnh nhân: Hiện tại: rát họng mức vừa, ho khan, sốt cao nhất 38.3, không khó thở, không đau ngực.
Hệ thống (Câu 5/7): Tiền sử bệnh nền quan trọng?
Bệnh nhân: Tiền sử: không có bệnh nền quan trọng.
Hệ thống (Câu 6/7): Dị ứng thuốc/thức ăn (nếu có)?
Bệnh nhân: Dị ứng: không ghi nhận.
Hệ thống (Câu 7/7): Thuốc đang dùng gần đây?
Bệnh nhân: Thuốc gần đây: paracetamol 1 viên tối qua, ngậm kẹo ho.`,
        prefill: {
          header: {
            patient_name: 'Nguyễn Thị Mai',
            patient_identifier: '079201001234',
            dob: '14/05/2001',
            sex: 'Nữ',
          },
          subjective: {
            chief_complaint: 'Đau họng và ho',
            onset: '3 ngày trước',
            progression: 'Ngày đầu rát họng, sau đó ho khan, hôm qua sốt nhẹ',
            hpi_summary: 'Rát họng mức vừa, ho khan, sốt cao nhất 38.3, chưa có khó thở hay đau ngực.',
            relevant_pmh: 'Không có bệnh nền quan trọng',
            allergies: 'Không ghi nhận',
            current_meds: 'Paracetamol 1 viên tối qua, ngậm kẹo ho',
          },
          assessment: {
            primary_diagnosis: 'Nghi viêm họng/viêm hô hấp trên',
            differential_diagnosis: 'Theo dõi cúm/COVID nếu nặng lên',
            risk_level: 'Thấp',
          },
          plan: {
            instructions: 'Theo dõi triệu chứng và khám lại nếu nặng hơn.',
            follow_up: '2-3 ngày hoặc sớm hơn nếu có dấu hiệu nặng',
            red_flags: 'Sốt cao kéo dài, khó thở, đau ngực',
            medications: [
              { name: 'Paracetamol', dose: 'Theo hướng dẫn bác sĩ', duration: 'Khi sốt' },
            ],
          },
        },
      },
      {
        id: 'patient_case_2',
        title: 'Ca 2',
        subtitle: 'BN tự khai: đau thượng vị/ợ chua',
        riskLabel: 'Thấp - trung bình',
        transcript: `Hệ thống (Câu 1/7): Họ tên – CCCD/Mã BN – Ngày sinh – Giới tính?
Bệnh nhân: Họ và tên: Lê Văn Bình. CCCD/Mã BN: 012088009876. Ngày sinh: 02/09/1988. Giới tính: Nam.
Hệ thống (Câu 2/7): Lý do khám chính hôm nay?
Bệnh nhân: Lý do khám: Đau thượng vị và ợ chua.
Hệ thống (Câu 3/7): Mô tả ngắn gọn triệu chứng hiện tại?
Bệnh nhân: Bắt đầu từ: 1 tuần trước. Diễn tiến: đau tăng khi đói và khi nằm; 2 ngày gần đây đau nhiều hơn.
Hệ thống (Câu 4/7): Mức độ triệu chứng hiện tại (đau/sốt/khó thở…)?
Bệnh nhân: Hiện tại: đau bỏng rát thượng vị 6/10, buồn nôn nhẹ, không sốt, không nôn ra máu, không đi cầu phân đen.
Hệ thống (Câu 5/7): Tiền sử bệnh nền quan trọng?
Bệnh nhân: Tiền sử: viêm dạ dày (2 năm trước).
Hệ thống (Câu 6/7): Dị ứng thuốc/thức ăn (nếu có)?
Bệnh nhân: Dị ứng: không ghi nhận.
Hệ thống (Câu 7/7): Thuốc đang dùng gần đây?
Bệnh nhân: Thuốc gần đây: tuần trước có uống ibuprofen vài ngày, gần đây có uống thuốc dạ dày/thuốc bao tử không rõ tên.`,
        prefill: {
          header: {
            patient_name: 'Lê Văn Bình',
            patient_identifier: '012088009876',
            dob: '02/09/1988',
            sex: 'Nam',
          },
          subjective: {
            chief_complaint: 'Đau thượng vị và ợ chua',
            onset: '1 tuần trước',
            progression: 'Đau tăng khi đói và khi nằm, 2 ngày gần đây đau nhiều hơn',
            hpi_summary: 'Đau bỏng rát vùng thượng vị mức 6/10, kèm ợ chua và buồn nôn nhẹ, chưa ghi nhận nôn máu hay phân đen.',
            relevant_pmh: 'Viêm dạ dày (2 năm trước)',
            allergies: 'Không ghi nhận',
            current_meds: 'Uống ibuprofen vài ngày tuần trước, có dùng thuốc dạ dày không rõ tên',
          },
          assessment: {
            primary_diagnosis: 'Nghi viêm dạ dày / GERD',
            differential_diagnosis: 'Loét dạ dày - tá tràng',
            risk_level: 'Thấp - trung bình',
          },
          plan: {
            instructions: 'Theo dõi đau thượng vị, tránh NSAID và tái khám đúng hẹn.',
            follow_up: '7-10 ngày hoặc sớm hơn nếu nặng',
            red_flags: 'Nôn ra máu, phân đen, đau tăng nhiều, chóng mặt/ngất',
            medications: [
              { name: 'Thuốc dạ dày', dose: 'Theo đơn bác sĩ', duration: '7-10 ngày' },
            ],
          },
        },
      },
      {
        id: 'patient_case_3',
        title: 'Ca 3',
        subtitle: 'BN tự khai: khó thở/khò khè',
        riskLabel: 'Nguy cơ trung bình',
        transcript: `Hệ thống (Câu 1/7): Họ tên – CCCD/Mã BN – Ngày sinh – Giới tính?
Bệnh nhân: Họ và tên: Phạm Gia Khánh. CCCD/Mã BN: 045205012345. Ngày sinh: 30/12/2005. Giới tính: Nam.
Hệ thống (Câu 2/7): Lý do khám chính hôm nay?
Bệnh nhân: Lý do khám: Khó thở và khò khè, tức ngực.
Hệ thống (Câu 3/7): Mô tả ngắn gọn triệu chứng hiện tại?
Bệnh nhân: Bắt đầu từ: tối qua sau khi dọn phòng nhiều bụi. Diễn tiến: khó thở tăng dần, có khò khè.
Hệ thống (Câu 4/7): Mức độ triệu chứng hiện tại (đau/sốt/khó thở…)?
Bệnh nhân: Hiện tại: khó thở mức vừa, nói được nhưng phải nghỉ giữa câu, không sốt, ho ít.
Hệ thống (Câu 5/7): Tiền sử bệnh nền quan trọng?
Bệnh nhân: Tiền sử: hen phế quản từ nhỏ.
Hệ thống (Câu 6/7): Dị ứng thuốc/thức ăn (nếu có)?
Bệnh nhân: Dị ứng: hay dị ứng bụi/ thay đổi thời tiết; không rõ dị ứng thuốc.
Hệ thống (Câu 7/7): Thuốc đang dùng gần đây?
Bệnh nhân: Thuốc gần đây: có xịt thuốc cắt cơn hen (salbutamol) 2 nhát nhưng vẫn còn khó thở.`,
        prefill: {
          header: {
            patient_name: 'Phạm Gia Khánh',
            patient_identifier: '045205012345',
            dob: '30/12/2005',
            sex: 'Nam',
          },
          subjective: {
            chief_complaint: 'Khó thở và khò khè, tức ngực',
            onset: 'Tối qua sau khi dọn phòng nhiều bụi',
            progression: 'Khó thở tăng dần, có khò khè',
            hpi_summary: 'Khó thở mức vừa, nói được nhưng phải nghỉ giữa câu, không sốt, ho ít.',
            relevant_pmh: 'Hen phế quản từ nhỏ',
            allergies: 'Dị ứng bụi/thay đổi thời tiết, không rõ dị ứng thuốc',
            current_meds: 'Xịt salbutamol 2 nhát nhưng vẫn còn khó thở',
          },
          assessment: {
            primary_diagnosis: 'Nghi cơn hen/khò khè do kích thích',
            differential_diagnosis: 'Viêm phế quản, dị ứng hô hấp',
            risk_level: 'Trung bình',
          },
          plan: {
            instructions: 'Theo dõi sát hô hấp và khám sớm nếu khó thở tăng.',
            follow_up: '24-48 giờ hoặc sớm hơn nếu nặng',
            red_flags: 'Khó thở tăng nhanh, không nói được câu dài, tím tái, đau ngực',
            medications: [
              { name: 'Salbutamol', dose: 'Theo hướng dẫn bác sĩ', duration: 'Theo đáp ứng' },
            ],
          },
        },
      },
    ],
    [],
  );
  const selectedPatientDemoCase = useMemo(
    () =>
      patientDemoVoiceCases.find((item) => item.id === selectedPatientDemoCaseId) || patientDemoVoiceCases[0],
    [patientDemoVoiceCases, selectedPatientDemoCaseId],
  );
  const dictationDemoVoiceCases = useMemo<DemoVoiceCase[]>(
    () => [
      {
        id: 'dictation_case_1',
        title: 'Ca 1',
        subtitle: 'Bác sĩ nam: đau họng, ho, sốt nhẹ',
        riskLabel: 'Nguy cơ thấp',
        transcript:
          'Họ và tên bệnh nhân: Nguyễn Thị Mai. Ngày sinh: 14/05/2001. Giới tính: Nữ. Căn cước công dân: 079201001234. Lý do khám: đau họng và ho. Diễn tiến: khởi phát cách đây 3 ngày, ngày đầu rát họng, ngày thứ hai bắt đầu ho khan, hôm qua sốt nhẹ cao nhất 38.3 độ C, hôm nay vẫn còn rát họng, ho khan, đờm ít, không khó thở, không đau ngực, có nghẹt mũi nhẹ. Tiền sử: không có bệnh nền đáng chú ý. Dị ứng: chưa ghi nhận dị ứng thuốc hoặc thức ăn. Thuốc đang dùng: đã uống 1 viên paracetamol tối qua và ngậm kẹo ho. Khám: họng đỏ nhẹ, amidan không mủ, phổi nghe trong. Sinh hiệu: nhiệt độ 37.8 độ C, mạch 88 lần/phút, huyết áp 110/70 mmHg, SpO2 98%. Chẩn đoán chính: viêm họng hoặc viêm đường hô hấp trên do virus. Chẩn đoán phân biệt: cúm hoặc COVID nếu sốt tăng hoặc có tiếp xúc người bệnh. Mức độ nguy cơ: thấp, chưa có dấu hiệu nặng. Kế hoạch: điều trị triệu chứng theo đơn, nghỉ ngơi, uống nước ấm, súc họng nước muối. Dặn dò theo dõi sốt cao, ho tăng, khó thở hoặc đau ngực. Tái khám sau 2 đến 3 ngày nếu không cải thiện hoặc sớm hơn nếu nặng. Dấu hiệu cảnh báo: khó thở, sốt trên 39 độ kéo dài, đau ngực, lơ mơ.',
        prefill: {
          header: {
            patient_name: 'Nguyễn Thị Mai',
            dob: '14/05/2001',
            patient_identifier: '079201001234',
            sex: 'Nữ',
          },
          subjective: {
            chief_complaint: 'Đau họng, ho 3 ngày, sốt nhẹ',
            onset: '3 ngày trước',
            progression: 'Rát họng, ho khan, sốt 38.3 độ C',
            hpi_summary: 'Đau họng và ho 3 ngày, sốt nhẹ tối qua, chưa ghi nhận khó thở hoặc đau ngực.',
            allergies: 'Không ghi nhận',
            current_meds: 'Paracetamol 1 viên, ngậm kẹo ho',
            relevant_pmh: 'Không bệnh nền quan trọng',
          },
          assessment: {
            primary_diagnosis: 'Viêm họng / viêm đường hô hấp trên do virus',
            differential_diagnosis: 'Cúm hoặc COVID nếu sốt tăng hoặc có tiếp xúc người bệnh',
            risk_level: 'Thấp',
          },
          plan: {
            instructions: 'Điều trị triệu chứng theo đơn, nghỉ ngơi, uống nước ấm, súc họng nước muối.',
            follow_up: '2-3 ngày nếu không đỡ hoặc sớm hơn nếu nặng',
            red_flags: 'Khó thở, sốt trên 39 độ kéo dài, đau ngực, lơ mơ',
            medications: [{ name: 'Paracetamol', dose: 'Theo chỉ định bác sĩ', duration: 'Khi sốt' }],
          },
        },
      },
      {
        id: 'dictation_case_2',
        title: 'Ca 2',
        subtitle: 'Bác sĩ nam: cơn gút cấp',
        riskLabel: 'Nguy cơ trung bình',
        transcript:
          'Họ và tên bệnh nhân: Trần Quốc An. Ngày sinh: 22/03/1979. Giới tính: Nam. Căn cước công dân: 034567890123. Lý do khám: đau dữ dội khớp ngón chân cái bên phải. Diễn tiến: khởi phát đột ngột lúc 1 giờ sáng, đau mức 9/10, sưng nóng đỏ, hạn chế vận động, không sốt. Trước đó có ăn hải sản và uống bia. Tiền sử: gút 3 năm, đã từng dùng allopurinol nhưng ngưng vài tháng, có tăng huyết áp đang dùng amlodipine 5 mg mỗi ngày. Dị ứng: chưa ghi nhận. Thuốc gần đây: chưa dùng thuốc giảm đau trước khi đến khám. Khám: khớp bàn ngón chân cái phải sưng nóng đỏ, ấn đau nhiều. Sinh hiệu: huyết áp 140/90 mmHg, mạch 96 lần/phút, nhiệt độ 37.2 độ C, SpO2 98%. Chẩn đoán chính: cơn gút cấp. Chẩn đoán phân biệt: viêm khớp nhiễm trùng nếu xuất hiện sốt hoặc đỏ lan nhanh. Mức độ nguy cơ: trung bình. Kế hoạch: thuốc giảm viêm và giảm đau theo đơn, xét nghiệm acid uric và chức năng thận. Dặn dò: nghỉ ngơi, chườm lạnh, hạn chế rượu bia và thực phẩm giàu đạm. Tái khám: 3 đến 5 ngày hoặc sớm hơn nếu đau không giảm. Dấu hiệu cảnh báo: sốt, đau tăng nhanh, đỏ lan rộng.',
        prefill: {
          header: {
            patient_name: 'Trần Quốc An',
            dob: '22/03/1979',
            patient_identifier: '034567890123',
            sex: 'Nam',
          },
          subjective: {
            chief_complaint: 'Đau dữ dội khớp ngón chân cái bên phải',
            onset: 'Khởi phát đột ngột lúc 1 giờ sáng',
            progression: 'Đau 9/10, sưng nóng đỏ, hạn chế vận động',
            hpi_summary: 'Đau cấp khớp bàn ngón chân cái phải, sưng nóng đỏ, xuất hiện sau ăn hải sản và uống bia.',
            allergies: 'Không ghi nhận',
            current_meds: 'Amlodipine 5 mg mỗi ngày, chưa dùng giảm đau trước khi khám',
            relevant_pmh: 'Gút 3 năm, từng dùng allopurinol nhưng đã ngưng',
          },
          assessment: {
            primary_diagnosis: 'Cơn gút cấp',
            differential_diagnosis: 'Viêm khớp nhiễm trùng nếu sốt hoặc đỏ lan nhanh',
            risk_level: 'Trung bình',
          },
          plan: {
            instructions: 'Thuốc giảm viêm/giảm đau theo đơn, nghỉ ngơi, chườm lạnh, hạn chế rượu bia và thực phẩm giàu đạm.',
            follow_up: '3-5 ngày hoặc sớm hơn nếu đau không giảm',
            red_flags: 'Sốt, đau tăng nhanh, đỏ lan rộng',
            medications: [
              { name: 'Thuốc giảm viêm và giảm đau', dose: 'Theo đơn bác sĩ', duration: '3-5 ngày' },
              { name: 'Amlodipine', dose: '5 mg mỗi ngày', duration: 'Duy trì theo chỉ định' },
            ],
          },
        },
      },
      {
        id: 'dictation_case_3',
        title: 'Ca 3',
        subtitle: 'Bác sĩ nữ: đau thượng vị, ợ chua',
        riskLabel: 'Thấp - trung bình',
        transcript:
          'Họ và tên bệnh nhân: Lê Thị Hạnh. Ngày sinh: 05/11/1995. Giới tính: Nữ. Căn cước công dân: 079012345678. Lý do khám: đau vùng thượng vị và ợ chua. Diễn tiến: triệu chứng xuất hiện 1 tuần nay, đau kiểu bỏng rát, tăng khi đói và khi nằm xuống, mức độ 6/10, không sốt, không nôn ra máu, không đi cầu phân đen, có dùng ibuprofen vài ngày trước. Tiền sử: viêm dạ dày 2 năm trước. Dị ứng: dị ứng penicillin, từng nổi mề đay. Thuốc đang dùng: hiện không dùng thuốc thường xuyên. Khám: ấn thượng vị đau nhẹ, bụng mềm. Sinh hiệu: huyết áp 110/70 mmHg, mạch 84 lần/phút, nhiệt độ 36.8 độ C, SpO2 99%. Chẩn đoán chính: viêm dạ dày hoặc trào ngược dạ dày thực quản. Chẩn đoán phân biệt: loét dạ dày tá tràng. Mức độ nguy cơ: thấp đến trung bình. Kế hoạch: thuốc giảm tiết acid theo đơn, cân nhắc xét nghiệm Helicobacter pylori nếu kéo dài. Dặn dò: tránh NSAID, hạn chế cà phê, không ăn muộn. Tái khám: sau 7 đến 10 ngày hoặc sớm hơn nếu đau tăng. Dấu hiệu cảnh báo: nôn ra máu, đi cầu phân đen, đau tăng dữ dội, chóng mặt ngất.',
        prefill: {
          header: {
            patient_name: 'Lê Thị Hạnh',
            dob: '05/11/1995',
            patient_identifier: '079012345678',
            sex: 'Nữ',
          },
          subjective: {
            chief_complaint: 'Đau thượng vị, ợ chua',
            onset: 'Khoảng 1 tuần',
            progression: 'Đau bỏng rát tăng khi đói và khi nằm, mức độ 6/10',
            hpi_summary: 'Đau thượng vị và ợ chua kéo dài 1 tuần, chưa ghi nhận xuất huyết tiêu hóa.',
            allergies: 'Dị ứng penicillin (từng nổi mề đay)',
            current_meds: 'Không dùng thuốc thường xuyên, có dùng ibuprofen vài ngày trước',
            relevant_pmh: 'Viêm dạ dày 2 năm trước',
          },
          assessment: {
            primary_diagnosis: 'Viêm dạ dày hoặc trào ngược dạ dày thực quản',
            differential_diagnosis: 'Loét dạ dày tá tràng',
            risk_level: 'Thấp - trung bình',
          },
          plan: {
            instructions: 'Thuốc giảm tiết acid theo đơn, tránh NSAID, hạn chế cà phê, không ăn muộn.',
            follow_up: '7-10 ngày hoặc sớm hơn nếu đau tăng',
            red_flags: 'Nôn ra máu, đi cầu phân đen, đau tăng dữ dội, chóng mặt ngất',
            medications: [{ name: 'Thuốc giảm tiết acid', dose: 'Theo đơn bác sĩ', duration: '7-10 ngày' }],
          },
        },
      },
    ],
    [],
  );
  const selectedDictationDemoCase = useMemo(
    () =>
      dictationDemoVoiceCases.find((item) => item.id === selectedDictationDemoCaseId) ||
      dictationDemoVoiceCases[0],
    [dictationDemoVoiceCases, selectedDictationDemoCaseId],
  );

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const formatDateTime = (date: Date | null) => {
    if (!date) return '--';
    return date.toLocaleString('vi-VN');
  };

  const asIsoString = (date: Date | null) => {
    if (!date) return '';
    return date.toISOString();
  };

  const escapeRegex = (raw: string) => raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const normalizeCapturedValue = (raw: string) =>
    raw
      .replace(/^[\s:;,-]+/, '')
      .replace(/\s+/g, ' ')
      .replace(/[.;,\s]+$/, '')
      .trim();

  const toAsciiLower = (raw: string) =>
    raw
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

  const cleanTrailingSpokenNoise = (raw: string) =>
    normalizeCapturedValue(raw).replace(/\b(thì|thôi|ạ|à|nha|nhé)\b[\s.,;:!?-]*$/i, '').trim();

  const containsKeywordTerm = (contentLower: string, termRaw: string) => {
    const term = termRaw.toLowerCase().trim();
    if (!term) return false;
    if (term.length <= 3) {
      const boundaryPattern = new RegExp(`(^|[\\s,.;:!?()])${escapeRegex(term)}($|[\\s,.;:!?()])`, 'i');
      return boundaryPattern.test(contentLower);
    }
    return contentLower.includes(term);
  };

  const containsClinicalTerm = (normalizedAsciiText: string, termRaw: string) => {
    const term = toAsciiLower(termRaw).replace(/\s+/g, ' ').trim();
    if (!term) return false;
    if (term.length <= 3) {
      const boundaryPattern = new RegExp(`(^|[\\s,.;:!?()])${escapeRegex(term)}($|[\\s,.;:!?()])`, 'i');
      return boundaryPattern.test(normalizedAsciiText);
    }
    return normalizedAsciiText.includes(term);
  };

  const matchChiefComplaints = (text: string) => {
    const contentLower = text.toLowerCase();
    const seen = new Set<string>();
    const matched: ChiefComplaintItem[] = [];

    for (const item of chiefComplaintList) {
      const terms = [item.label, ...item.synonyms];
      const hit = terms.some((term) => containsKeywordTerm(contentLower, term));
      if (hit && !seen.has(item.id)) {
        seen.add(item.id);
        matched.push(item);
      }
    }
    return matched;
  };

  const removeSpokenLeadIn = (raw: string) => {
    let value = normalizeCapturedValue(raw);
    if (!value) return '';

    const leadinPatterns = [
      /^(?:dạ|ạ|vâng|ờ|ừ|ừm|um|uh|alo|xin chào)[,.\s-]*/i,
      /^(?:tôi|em|cháu)\s*(?:xin\s*)?(?:tự\s*giới\s*thiệu\s*)?(?:họ\s*và\s*tên|họ\s*tên|tên)\s*(?:của\s*tôi)?\s*(?:là|:)\s*/i,
      /^(?:họ\s*và\s*tên|họ\s*tên|tên\s*bệnh\s*nhân)\s*(?:là|:)\s*/i,
      /^(?:tôi|em|cháu)\s*(?:đến|tới)\s*khám\s*(?:vì|do)\s*/i,
      /^(?:tôi|em|cháu)\s*(?:đang\s*)?(?:bị|mắc)\s*(?:bệnh\s*(?:sử|sơ|sở)\s*)?(?:là|:)?\s*/i,
      /^(?:lý\s*do\s*(?:khám|đi\s*khám)(?:\s*bệnh)?)\s*(?:là|:)\s*/i,
      /^(?:bệnh\s*(?:sử|sơ|sở))\s*(?:là|:)\s*/i,
      /^(?:triệu\s*chứng\s*(?:hiện\s*tại|bắt\s*đầu))\s*(?:là|:)\s*/i,
      /^(?:bệnh\s*sử|diễn\s*tiến|tiền\s*sử(?:\s*bệnh)?)\s*(?:là|:)\s*/i,
      /^(?:hiện\s*tại\s*(?:đang\s*)?(?:có|bị)|bây\s*giờ\s*(?:đang\s*)?(?:có|bị))\s*/i,
      /^(?:dị\s*ứng(?:\s*thuốc|\s*thức\s*ăn)?)\s*(?:là|:)\s*/i,
      /^(?:thuốc\s*(?:đang\s*dùng|gần\s*đây))\s*(?:là|:)\s*/i,
      /^(?:thuốc\s*(?:nào\s*)?(?:đang\s*dùng|gần\s*đây|dùng\s*gần\s*đây|đã\s*dùng))\s*(?:là|:)?\s*/i,
    ];

    for (let i = 0; i < 4; i += 1) {
      const before = value;
      for (const pattern of leadinPatterns) {
        value = value.replace(pattern, '');
      }
      value = normalizeCapturedValue(value);
      if (value === before) break;
    }

    return cleanTrailingSpokenNoise(value);
  };

  const cutByBoundaryKeywords = (raw: string, keywords: string[]) => {
    const normalized = normalizeCapturedValue(raw);
    const lower = normalized.toLowerCase();
    let cutIndex = normalized.length;
    for (const keyword of keywords) {
      const idx = lower.indexOf(keyword.toLowerCase());
      if (idx > 0 && idx < cutIndex) cutIndex = idx;
    }
    return normalizeCapturedValue(normalized.slice(0, cutIndex));
  };

  const cutAtMedicationSection = (raw: string) => {
    const value = normalizeCapturedValue(raw);
    if (!value) return '';
    const blockers = [
      /\bthuốc\s*(?:nào\s*)?(?:đang\s*dùng|gần\s*đây|dùng\s*gần\s*đây|đã\s*dùng|uống)\b/i,
      /\brecent\s*meds?\b/i,
    ];
    let cutIndex = value.length;
    for (const blocker of blockers) {
      const matched = blocker.exec(value);
      if (matched && matched.index > 0 && matched.index < cutIndex) {
        cutIndex = matched.index;
      }
    }
    return normalizeCapturedValue(value.slice(0, cutIndex));
  };

  const uniqueValues = (values: string[]) => [...new Set(values.filter(Boolean).map((v) => normalizeCapturedValue(v)))];

  const FIELD_BOUNDARY_KEYWORDS = [
    'họ và tên',
    'họ tên',
    'tên bệnh nhân',
    'can cuoc',
    'cao cước',
    'cao cuoc',
    'cước công dân',
    'công dân',
    'cong dan',
    'năm sinh',
    'sinh năm',
    'ngày sinh',
    'giới tính',
    'cccd',
    'căn cước công dân',
    'căn cước',
    'thẻ căn cước',
    'chứng minh nhân dân',
    'cmnd',
    'mã bn',
    'mã bệnh nhân',
    'mã bệnh',
    'lý do khám',
    'lý do đi khám',
    'triệu chứng bắt đầu',
    'khởi phát',
    'hiện tại có',
    'triệu chứng hiện tại',
    'bệnh sử',
    'diễn tiến',
    'tiền sử',
    'dị ứng thuốc',
    'dị ứng thức ăn',
    'dị ứng',
    'thuốc đang dùng',
    'thuốc gần đây',
    'thuốc nào dùng gần đây',
    'hướng tính',
  ];

  const extractLabeledValue = (text: string, labels: string[], stopKeywords: string[] = []) => {
    if (!text.trim()) return '';

    const labelPattern = labels.map(escapeRegex).join('|');
    const directPatterns = [
      new RegExp(`(?:^|[\\n\\r])\\s*(?:${labelPattern})\\s*[:：-]\\s*([^\\n\\r]+)`, 'i'),
      new RegExp(`(?:^|[\\n\\r,;])\\s*(?:${labelPattern})\\s*[:：-]\\s*([^,;\\n\\r]+)`, 'i'),
      new RegExp(`(?:^|[\\n\\r,;])\\s*(?:${labelPattern})\\s*(?:là)?\\s*([^,;\\n\\r]+)`, 'i'),
    ];
    for (const pattern of directPatterns) {
      const match = text.match(pattern);
      if (match?.[1]) return normalizeCapturedValue(match[1]);
    }

    const lowerText = text.toLowerCase();
    let anchorIndex = -1;
    let anchorLabel = '';
    for (const label of labels) {
      const idx = lowerText.indexOf(label.toLowerCase());
      if (idx >= 0 && (anchorIndex === -1 || idx < anchorIndex)) {
        anchorIndex = idx;
        anchorLabel = label;
      }
    }
    if (anchorIndex < 0) return '';

    let valueStart = anchorIndex + anchorLabel.length;
    const leadingNoise = text.slice(valueStart).match(/^[\s:：\-–—,.;]*(?:là\s+)?/i);
    if (leadingNoise) valueStart += leadingNoise[0].length;

    const blockers = uniqueValues([...FIELD_BOUNDARY_KEYWORDS, ...stopKeywords]).filter(
      (keyword) => !labels.some((label) => label.toLowerCase() === keyword.toLowerCase()),
    );
    let valueEnd = text.length;
    for (const blocker of blockers) {
      const idx = lowerText.indexOf(blocker.toLowerCase(), valueStart);
      if (idx > valueStart && idx < valueEnd) valueEnd = idx;
    }

    return normalizeCapturedValue(text.slice(valueStart, valueEnd));
  };

  const parseDobFromText = (text: string) => {
    const toDobText = (dayRaw: string, monthRaw: string, yearRaw: string) => {
      const day = Number(dayRaw);
      const month = Number(monthRaw);
      const year = Number(yearRaw);
      if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return '';
      if (year < 1900 || year > 2100) return '';
      if (month < 1 || month > 12) return '';
      if (day < 1 || day > 31) return '';
      return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
    };

    const labeled = extractLabeledValue(text, ['ngày sinh', 'sinh ngày'], ['giới tính', 'cccd', 'lý do khám']);
    if (labeled) {
      const direct = labeled.match(/(\d{1,2})[\/\-\s](\d{1,2})[\/\-\s](\d{4})/);
      if (direct?.[1] && direct?.[2] && direct?.[3]) {
        const normalized = toDobText(direct[1], direct[2], direct[3]);
        if (normalized) return normalized;
      }
      const natural = labeled.match(/(?:ngày\s*)?(\d{1,2})\s*tháng\s*(\d{1,2})\s*năm\s*(\d{4})/i);
      if (natural?.[1] && natural?.[2] && natural?.[3]) {
        const normalized = toDobText(natural[1], natural[2], natural[3]);
        if (normalized) return normalized;
      }
    }

    const patterns = [
      /(?:sinh\s*ngày|ngày\s*sinh|dob)\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /\b(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\b/,
      /(?:ngày\s*sinh|sinh\s*ngày)\s*(?:là|:)?\s*(\d{1,2})[\s/.-]+(\d{1,2})[\s/.-]+(\d{4})/i,
      /(?:ngày\s*sinh|sinh\s*ngày)\s*(?:là|:)?\s*(?:ngày\s*)?(\d{1,2})\s*tháng\s*(\d{1,2})\s*năm\s*(\d{4})/i,
      /(?:^|[\s,.;:!?])(?:ngày\s*)?(\d{1,2})\s*tháng\s*(\d{1,2})\s*năm\s*(\d{4})(?:$|[\s,.;:!?])/i,
    ];
    for (const re of patterns) {
      const match = text.match(re);
      if (!match) continue;
      if (match[1] && match[2] && match[3]) {
        const normalized = toDobText(match[1], match[2], match[3]);
        if (normalized) return normalized;
      }
      if (match[1]) {
        const compact = match[1].match(/(\d{1,2})[\/\-\s](\d{1,2})[\/\-\s](\d{4})/);
        if (compact?.[1] && compact?.[2] && compact?.[3]) {
          const normalized = toDobText(compact[1], compact[2], compact[3]);
          if (normalized) return normalized;
        }
        const normalized = normalizeCapturedValue(match[1]);
        if (/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/.test(normalized)) return normalized;
      }
    }
    return '';
  };

  const parseBirthYearFromText = (text: string) => {
    const labeled = extractLabeledValue(text, ['năm sinh', 'sinh năm', 'birth year'], ['giới tính', 'cccd', 'lý do khám']);
    if (labeled && /\d{4}/.test(labeled)) return labeled.match(/\d{4}/)?.[0] || '';
    const match = text.match(/(?:năm\s*sinh|sinh\s*năm)\s*:?\s*(\d{4})/i);
    return match?.[1] || '';
  };

  const cleanCandidateName = (raw: string) => {
    const cut = cutByBoundaryKeywords(raw, [
      'năm sinh',
      'sinh năm',
      'giới tính',
      'cccd',
      'can cuoc',
      'cao cước',
      'cao cuoc',
      'cước công dân',
      'công dân',
      'cong dan',
      'cmnd',
      'căn cước công dân',
      'căn cước',
      'thẻ căn cước',
      'chứng minh nhân dân',
      'mã bn',
      'mã bệnh nhân',
      'mã bệnh',
      'lý do',
      'triệu chứng',
      'tiền sử',
      'dị ứng',
      'thuốc',
      'đi khám',
      'tới khám',
      'đến khám',
      'khởi phát',
      'bắt đầu',
      'hướng tính',
    ]);
    let cleaned = removeSpokenLeadIn(cut)
      .replace(/^(là|tên là)\s+/i, '')
      .replace(/\b(tôi|em|cháu)\b.*$/i, '')
      .replace(/[^A-Za-zÀ-ỹ\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const tokens = cleaned.split(' ').filter(Boolean);
    const trailingNoiseWords = new Set([
      'can',
      'ca',
      'cao',
      'cuoc',
      'cong',
      'dan',
      'cccd',
      'cmnd',
      'ma',
      'bn',
      'benh',
      'nhan',
      'so',
      'ngay',
      'thang',
      'nam',
      'gioi',
      'tinh',
      'huong',
      'thi',
      'la',
      'toi',
      'em',
      'chau',
      'dang',
    ]);
    while (tokens.length > 2) {
      const tail = tokens[tokens.length - 1];
      const tailNormalized = toAsciiLower(tail).replace(/[^a-z0-9]/g, '');
      if (!tailNormalized) {
        tokens.pop();
        continue;
      }
      if (trailingNoiseWords.has(tailNormalized) || /\d/.test(tailNormalized)) {
        tokens.pop();
        continue;
      }
      break;
    }
    cleaned = tokens.join(' ').trim();
    if (tokens.length < 2) return '';
    if (tokens.length > 6) cleaned = tokens.slice(0, 6).join(' ');
    return cleaned;
  };

  const parseNameFromText = (text: string) => {
    const explicitNameMatch = text.match(
      /(?:họ\s*và\s*tên|ho\s*va\s*ten|họ\s*tên|ho\s*ten|tên\s*bệnh\s*nhân|ten\s*benh\s*nhan)\s*(?:là|la|:)?\s*([A-Za-zÀ-ỹ\s]{2,80}?)(?=(?:\b(?:cccd|căn\s*cước|can\s*cuoc|cmnd|chứng\s*minh|chung\s*minh|mã\s*bn|ma\s*bn|mã\s*bệnh|ma\s*benh|ngày\s*sinh|ngay\s*sinh|giới\s*tính|gioi\s*tinh|lý\s*do|ly\s*do|triệu\s*chứng|trieu\s*chung|tiền\s*sử|tien\s*su|dị\s*ứng|di\s*ung|thuốc|thuoc)\b|[,.!?\n]|$))/i,
    );
    if (explicitNameMatch?.[1]) {
      const cleaned = cleanCandidateName(explicitNameMatch[1]);
      if (cleaned) return cleaned;
    }

    const labeled = extractLabeledValue(
      text,
      ['họ và tên', 'họ tên', 'tên bệnh nhân', 'họ tên bệnh nhân'],
      [
        'năm sinh',
        'ngày sinh',
        'giới tính',
        'cccd',
        'can cuoc',
        'cao cước',
        'cao cuoc',
        'cước công dân',
        'công dân',
        'cong dan',
        'căn cước',
        'cmnd',
        'mã bệnh',
        'lý do',
        'triệu chứng',
      ],
    );
    if (labeled) {
      return cleanCandidateName(labeled);
    }
    const patterns = [
      /(?:tôi|em|cháu)\s*(?:xin\s*giới\s*thiệu\s*)?(?:tên|họ\s*tên)\s*(?:là|:)?\s*([A-Za-zÀ-ỹ\s]{2,80}?)(?=(?:\b(?:năm\s*sinh|giới\s*tính|cccd|căn\s*cước|cmnd|chứng\s*minh|mã\s*bệnh|lý\s*do|triệu\s*chứng|tiền\s*sử|dị\s*ứng|thuốc)\b|[,.!?\n]|$))/i,
      /(?:tên|họ\s*tên)\s*(?:của)?\s*(?:tôi|em|cháu)\s*(?:là|:)\s*([A-Za-zÀ-ỹ\s]{2,80}?)(?=(?:\b(?:năm\s*sinh|giới\s*tính|cccd|căn\s*cước|cmnd|chứng\s*minh|mã\s*bệnh|lý\s*do|triệu\s*chứng|tiền\s*sử|dị\s*ứng|thuốc)\b|[,.!?\n]|$))/i,
      /(?:bệnh\s*nhân|bn)\s*(?:là|tên)\s*:?\s*([A-Za-zÀ-ỹ\s]{2,80}?)(?=(?:\b(?:năm\s*sinh|giới\s*tính|cccd|căn\s*cước|cmnd|chứng\s*minh|mã\s*bệnh|lý\s*do|triệu\s*chứng|tiền\s*sử|dị\s*ứng|thuốc)\b|[,.!?\n]|$))/i,
    ];
    for (const re of patterns) {
      const match = text.match(re);
      if (match?.[1]) {
        const cleaned = cleanCandidateName(match[1]);
        if (cleaned) return cleaned;
      }
    }

    const looseSpokenPatterns = [
      /(?:tôi|em|cháu)\s*(?:xin\s*giới\s*thiệu\s*)?(?:họ\s*và\s*tên|họ\s*tên|tên)\s*(?:của\s*(?:tôi|em|cháu))?\s*(?:là|:)?\s*([^\n]{2,160})/i,
      /(?:họ\s*và\s*tên|họ\s*tên|tên\s*bệnh\s*nhân)\s*(?:là|:)?\s*([^\n]{2,160})/i,
    ];
    for (const re of looseSpokenPatterns) {
      const match = text.match(re);
      if (match?.[1]) {
        const cleaned = cleanCandidateName(match[1]);
        if (cleaned) return cleaned;
      }
    }
    return '';
  };

  const parseSexFromText = (text: string) => {
    const labeled = extractLabeledValue(text, ['giới tính']);
    if (/\bnữ\b|nữ\s*giới/i.test(labeled)) return 'Nữ';
    if (/\bnam\b|nam\s*giới/i.test(labeled)) return 'Nam';
    if (/\bnữ\b|nữ\s*giới/i.test(text)) return 'Nữ';
    if (/\bnam\b|nam\s*giới/i.test(text)) return 'Nam';
    return '';
  };

  const parsePatientIdentifierFromText = (text: string) => {
    const normalizeIdentifier = (
      raw: string,
      options: { allowShort?: boolean; digitsOnly?: boolean } = {},
    ) => {
      const compactSource = cutByBoundaryKeywords(raw, [
        'ngày sinh',
        'sinh ngày',
        'năm sinh',
        'giới tính',
        'lý do khám',
        'triệu chứng',
        'tiền sử',
        'dị ứng',
        'thuốc',
      ]);
      const compactAlphaNum = compactSource.replace(/[^A-Za-z0-9]/g, '');
      const compactDigits = compactSource.replace(/\D/g, '');
      const minLength = options.allowShort ? 5 : 9;

      if (options.digitsOnly) {
        if (compactDigits.length >= minLength && compactDigits.length <= 14) return compactDigits;
        return '';
      }

      if (compactDigits.length >= minLength && compactDigits.length <= 14) return compactDigits;
      if (compactAlphaNum.length >= minLength && compactAlphaNum.length <= 24) return compactAlphaNum;
      return '';
    };

    const identifierLabels = [
      'cccd',
      'căn cước công dân',
      'căn cước',
      'thẻ căn cước',
      'cmnd',
      'chứng minh nhân dân',
      'mã bn',
      'mã bệnh nhân',
      'mã bệnh',
    ];

    const labeledPattern =
      /(cccd|căn\s*cước\s*công\s*dân|căn\s*cước|thẻ\s*căn\s*cước|cmnd|chứng\s*minh\s*nhân\s*dân|mã\s*bn|mã\s*bệnh\s*nhân|mã\s*bệnh)\s*(?:là|:|số)?\s*([A-Za-z0-9\s\-]{3,40})/gi;
    let labeledMatch: RegExpExecArray | null = null;
    while ((labeledMatch = labeledPattern.exec(text)) !== null) {
      const label = labeledMatch[1] || '';
      const candidate = labeledMatch[2] || '';
      const digitsOnly = /(cccd|căn\s*cước|cmnd|chứng\s*minh)/i.test(label);
      const normalized = normalizeIdentifier(candidate, { allowShort: true, digitsOnly });
      if (normalized) return normalized;
    }

    const labeled = extractLabeledValue(
      text,
      identifierLabels,
      ['ngày sinh', 'sinh ngày', 'năm sinh', 'giới tính', 'lý do khám', 'triệu chứng', 'tiền sử', 'dị ứng', 'thuốc'],
    );
    if (labeled) {
      const normalized = normalizeIdentifier(labeled, { allowShort: true });
      if (normalized) return normalized;
    }

    if (!/(cccd|căn\s*cước|cmnd|mã\s*bn|mã\s*bệnh)/i.test(text)) return '';

    const patterns = [
      /(?:cccd|căn\s*cước\s*công\s*dân|căn\s*cước|thẻ\s*căn\s*cước|cmnd|chứng\s*minh\s*nhân\s*dân|mã\s*bn|mã\s*bệnh\s*nhân|mã\s*bệnh)\s*(?:là|:|số)?\s*([A-Za-z0-9\s\-]{5,30})/i,
      /\b(\d{5,14})\b/,
      /((?:\d[\s\-]*){5,14})/,
    ];
    for (const re of patterns) {
      const match = text.match(re);
      if (!match?.[1]) continue;
      const normalized = normalizeIdentifier(match[1], {
        allowShort: true,
        digitsOnly: re === patterns[0] && /(cccd|căn\s*cước|cmnd|chứng\s*minh)/i.test(match[0] || ''),
      });
      if (normalized) return normalized;
    }
    return '';
  };

  const parseAgeFromText = (text: string) => {
    const match = text.match(/(\d{1,3})\s*tuổi/i);
    return match?.[1] || '';
  };

  const getTranscriptSentences = (text: string) =>
    text
      .replace(/\s+/g, ' ')
      .split(/[.!?\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 6);

  const extractSymptomsByKeywords = (text: string) => {
    const symptomDefs = [
      { pattern: /đau\s*đầu/i, label: 'đau đầu' },
      { pattern: /đau\s*bụng/i, label: 'đau bụng' },
      { pattern: /sốt/i, label: 'sốt' },
      { pattern: /khó\s*thở/i, label: 'khó thở' },
      { pattern: /chóng\s*mặt|choáng/i, label: 'chóng mặt/choáng' },
      { pattern: /ho/i, label: 'ho' },
      { pattern: /nôn/i, label: 'nôn' },
      { pattern: /tiêu\s*chảy/i, label: 'tiêu chảy' },
      { pattern: /đau\s*ngực/i, label: 'đau ngực' },
    ];
    const found = symptomDefs.filter((item) => item.pattern.test(text)).map((item) => item.label);
    return [...new Set(found)];
  };

  const parseCurrentSymptomsFromText = (text: string) => {
    const labeled = extractLabeledValue(
      text,
      ['hiện tại có', 'triệu chứng hiện tại', 'current symptoms'],
      ['tiền sử', 'dị ứng', 'thuốc', 'lý do khám'],
    );
    if (labeled) {
      return labeled
        .split(/[,;]+/)
        .map((s) => removeSpokenLeadIn(s))
        .filter(Boolean);
    }
    return extractSymptomsByKeywords(text);
  };

  const parseChiefComplaintFromText = (text: string) => {
    const labeled = extractLabeledValue(
      text,
      ['lý do khám', 'lý do đi khám', 'chief complaint'],
      ['triệu chứng bắt đầu', 'hiện tại có', 'tiền sử', 'dị ứng', 'thuốc'],
    );
    if (labeled) {
      return cleanTrailingSpokenNoise(
        removeSpokenLeadIn(cutByBoundaryKeywords(labeled, ['triệu chứng bắt đầu', 'hiện tại có', 'tiền sử'])),
      );
    }

    const patterns = [
      /(?:lý do (?:khám|đi khám)|đến khám vì|vào viện vì)\s*:?\s*([^.?!\n]{6,160})/i,
      /(?:tôi|em|cháu)\s*(?:bị|đang bị)\s*([^.?!\n]{6,160})/i,
    ];
    for (const re of patterns) {
      const match = text.match(re);
      if (match?.[1]) {
        const cleaned = cleanTrailingSpokenNoise(
          removeSpokenLeadIn(cutByBoundaryKeywords(match[1], ['từ', 'hiện tại', 'tiền sử'])),
        );
        if (cleaned) return cleaned;
      }
    }

    const symptoms = extractSymptomsByKeywords(text);
    if (symptoms.length) return symptoms.join(', ');
    const sentences = getTranscriptSentences(text);
    const symptomSentence = sentences.find(
      (sentence) =>
        /(đau|sốt|khó thở|ho|nôn|tiêu chảy|chóng mặt|choáng|mệt)/i.test(sentence) &&
        !/(tên là|năm sinh|giới tính|cccd|cmnd|mã bệnh nhân)/i.test(sentence),
    );
    if (symptomSentence) return cleanTrailingSpokenNoise(removeSpokenLeadIn(symptomSentence));
    return cleanTrailingSpokenNoise(removeSpokenLeadIn(sentences[0] || ''));
  };

  const parseOnsetFromText = (text: string) => {
    const labeled = extractLabeledValue(
      text,
      ['triệu chứng bắt đầu', 'khởi phát', 'onset'],
      ['hiện tại có', 'tiền sử', 'dị ứng', 'thuốc'],
    );
    if (labeled) return removeSpokenLeadIn(labeled);
    const patterns = [
      /(?:kéo dài|tiếp diễn|diễn tiến)\s*(?:được|khoảng|tầm)?\s*(\d+\s*(?:giờ|ngày|tuần|tháng|năm))/i,
      /(?:từ|khoảng)\s*(\d+\s*(?:giờ|ngày|tuần|tháng|năm)\s*(?:trước)?)/i,
      /(?:khởi phát)\s*:?\s*([^.?!\n]{4,100})/i,
    ];
    for (const re of patterns) {
      const match = text.match(re);
      if (match?.[1]) {
        return cleanTrailingSpokenNoise(removeSpokenLeadIn(match[1])).replace(/^(?:được|khoảng|tầm)\s+/i, '');
      }
    }
    return '';
  };

  const parseProgressionFromText = (text: string) => {
    if (/tăng dần|nặng dần|xấu dần|nặng hơn/i.test(text)) return 'Tăng dần';
    if (/giảm dần|đỡ dần|cải thiện|nhẹ hơn/i.test(text)) return 'Giảm dần';
    return '';
  };

  const parseHpiSummaryFromText = (text: string) => {
    const labeled = extractLabeledValue(text, ['bệnh sử', 'diễn tiến', 'hpi'], ['tiền sử', 'dị ứng', 'thuốc']);
    if (labeled) {
      return removeSpokenLeadIn(cutByBoundaryKeywords(labeled, ['tiền sử', 'dị ứng', 'thuốc']));
    }

    const onset = parseOnsetFromText(text);
    const symptoms = parseCurrentSymptomsFromText(text);
    if (onset || symptoms.length) {
      return [onset ? `Khởi phát ${onset}` : '', symptoms.length ? `Hiện có ${symptoms.join(', ')}` : '']
        .filter(Boolean)
        .join('. ');
    }

    const sentences = getTranscriptSentences(text).filter(
      (sentence) => !/(tên là|năm sinh|giới tính|cccd|cmnd|mã bệnh nhân)/i.test(sentence),
    );
    if (sentences.length <= 1) return '';
    return removeSpokenLeadIn(sentences.slice(0, 2).join('. '));
  };

  const parseRelevantPmhFromText = (text: string) => {
    const normalizePmh = (raw: string) => {
      const value = cleanTrailingSpokenNoise(removeSpokenLeadIn(cutByBoundaryKeywords(raw, ['dị ứng', 'thuốc'])));
      if (!value) return '';
      if (/^(?:không|chưa|none)\b/i.test(value) || /không\s*có|chưa\s*có|không\s*ghi\s*nhận/i.test(value)) {
        return 'Không ghi nhận bệnh nền';
      }
      return value;
    };
    const labeled = extractLabeledValue(text, ['tiền sử', 'tiền sử bệnh', 'bệnh nền'], ['dị ứng', 'thuốc']);
    if (labeled) return normalizePmh(labeled);
    const match = text.match(/tiền\s*sử(?:\s*bệnh)?\s*:?\s*([^.?!\n]{4,180})/i);
    return normalizePmh(match?.[1] || '');
  };

  const parseAllergiesFromText = (text: string) => {
    const normalizeAllergy = (raw: string) => {
      let value = cutAtMedicationSection(cutByBoundaryKeywords(raw, ['thuốc đang dùng', 'thuốc gần đây', 'thuốc nào']));
      value = cleanTrailingSpokenNoise(removeSpokenLeadIn(value))
        .replace(/^(?:với|là)\s+/i, '')
        .trim();
      if (!value) return '';
      if (/^(?:không|chưa|none)\b/i.test(value) && !/đậu\s*phộng|hải\s*sản|trứng|sữa|penicillin|aspirin/i.test(value)) {
        return 'Không ghi nhận';
      }
      return value;
    };

    const allergyStopWords = ['thuốc đang dùng', 'thuốc gần đây', 'thuốc nào', 'tiền sử', 'chẩn đoán'];
    const drugAllergy = normalizeAllergy(extractLabeledValue(text, ['dị ứng thuốc'], ['dị ứng thức ăn', ...allergyStopWords]));
    const foodAllergy = normalizeAllergy(extractLabeledValue(text, ['dị ứng thức ăn'], ['dị ứng thuốc', ...allergyStopWords]));
    const generic = normalizeAllergy(extractLabeledValue(text, ['dị ứng'], allergyStopWords));
    const explicitMention = normalizeAllergy((text.match(/dị\s*ứng\s*(?:với|là|:)?\s*([^.?!\n]{2,140})/i)?.[1] || ''));
    const merged = [
      drugAllergy ? `Dị ứng thuốc: ${drugAllergy}` : '',
      foodAllergy ? `Dị ứng thức ăn: ${foodAllergy}` : '',
      !drugAllergy && !foodAllergy && (generic || explicitMention) ? generic || explicitMention : '',
    ]
      .filter(Boolean)
      .join('; ');
    if (merged) return merged;
    if (/không dị ứng|chưa dị ứng|không có dị ứng|dị ứng\s*:\s*không/i.test(text)) return 'Không ghi nhận';
    return '';
  };

  const parseCurrentMedsFromText = (text: string) => {
    const cleanMeds = (raw: string) =>
      cleanTrailingSpokenNoise(
        removeSpokenLeadIn(
          cutByBoundaryKeywords(raw, ['tiền sử', 'dị ứng', 'chẩn đoán', 'lý do khám', 'triệu chứng']),
        ),
      )
        .replace(/^(?:nào\s*)?(?:dùng|uống)\s*gần\s*đây\s*/i, '')
        .replace(/^là\s+/i, '')
        .trim();

    const labeled = extractLabeledValue(
      text,
      ['thuốc đang dùng gần đây', 'thuốc đang dùng', 'thuốc gần đây', 'recent meds'],
      ['tiền sử', 'dị ứng', 'chẩn đoán'],
    );
    if (labeled) {
      const cleaned = cleanMeds(labeled);
      if (cleaned) return cleaned;
    }
    const patterns = [
      /thuốc\s*(?:nào\s*)?(?:dùng\s*gần\s*đây|đang\s*dùng|đã\s*dùng|gần\s*đây)\s*(?:là|:)?\s*([^.?!\n]{2,200})/i,
      /thuốc\s*(?:đang\s*dùng|đã\s*dùng)\s*:?\s*([^.?!\n]{3,200})/i,
      /(?:đang dùng|uống)\s*([A-Za-zÀ-ỹ0-9%.\-\s]{4,200})/i,
    ];
    for (const re of patterns) {
      const match = text.match(re);
      if (match?.[1]) {
        const cleaned = cleanMeds(match[1]);
        if (cleaned) return cleaned;
      }
    }
    const commonMeds = ['Panadol', 'Paracetamol', 'Ibuprofen', 'Aspirin', 'Amoxicillin', 'Cetirizine', 'Omeprazole'];
    const detected = commonMeds.filter((med) => new RegExp(`\\b${escapeRegex(med)}\\b`, 'i').test(text));
    if (detected.length) return [...new Set(detected)].join(', ');
    return '';
  };

  type TriageLevel = 'emergency' | 'urgent_same_day' | 'routine';

  interface ClinicalContext {
    matchedComplaints: ChiefComplaintItem[];
    matchedSystems: SystemTag[];
    matchedPmh: string[];
  }

  interface InferenceGate {
    readyForDifferential: boolean;
    missingForDifferential: string[];
    associatedSymptomCount: number;
    hasRiskFactor: boolean;
    suggestedQuestions: string[];
  }

  interface TriageInsight {
    level: TriageLevel;
    riskLevel: string;
    critical: boolean;
    followUp: string;
    instruction: string;
    redFlags: string[];
    matchedRules: string[];
    matchedSystems: SystemTag[];
    matchedComplaints: string[];
    matchedPmh: string[];
    recommendedQuestions: string[];
  }

  type ChecklistQuestionId = 'q1' | 'q2' | 'q3' | 'q4' | 'q5' | 'q6' | 'q7';

  const checklistQuestionLabel: Record<ChecklistQuestionId, string> = {
    q1: 'Họ tên - năm sinh - giới tính',
    q2: 'CCCD hoặc mã bệnh nhân',
    q3: 'Lý do khám chính',
    q4: 'Mô tả triệu chứng hiện tại',
    q5: 'Mức độ hiện tại + triệu chứng kèm',
    q6: 'Tiền sử bệnh nền',
    q7: 'Dị ứng + thuốc đang dùng',
  };

  const evaluateChecklistAnswers = (draft: SoapData, transcript: string) => {
    const transcriptText = transcript || '';
    const transcriptName = parseNameFromText(transcriptText);
    const transcriptSex = parseSexFromText(transcriptText);
    const transcriptIdentifier = parsePatientIdentifierFromText(transcriptText);
    const transcriptDob = parseDobFromText(transcriptText);
    const transcriptBirthYear = parseBirthYearFromText(transcriptText);
    const transcriptAge = parseAgeFromText(transcriptText) || inferAgeFromBirthYear(transcriptBirthYear, new Date());
    const transcriptSymptoms = parseCurrentSymptomsFromText(transcriptText);
    const transcriptPmh = parseRelevantPmhFromText(transcriptText);
    const transcriptAllergies = parseAllergiesFromText(transcriptText);
    const transcriptMeds = parseCurrentMedsFromText(transcriptText);
    const hpiSignals = /đau|sốt|khó thở|choáng|chóng mặt|nôn|tiêu chảy/i.test(draft.subjective.hpi_summary || '');
    const hasFullHistorySection3 = Boolean(
      (draft.subjective.relevant_pmh.trim() || transcriptPmh.trim()) &&
      (draft.subjective.allergies.trim() || transcriptAllergies.trim()) &&
      (draft.subjective.current_meds.trim() || transcriptMeds.trim()),
    );
    const hasIdentityAnchor = Boolean(
      (draft.header.patient_name.trim() || transcriptName.trim()) ||
        (draft.header.patient_identifier.trim() || transcriptIdentifier.trim()),
    );
    const hasPatientCore = Boolean(
      hasIdentityAnchor &&
        (draft.header.sex.trim() || transcriptSex.trim()) &&
        (draft.header.dob.trim() || draft.header.age.trim() || transcriptDob.trim() || transcriptAge.trim()),
    );

    const qStatus: Record<ChecklistQuestionId, boolean> = {
      q1: hasPatientCore,
      q2: Boolean(draft.header.patient_identifier.trim() || transcriptIdentifier.trim()),
      q3: Boolean(draft.subjective.chief_complaint.trim()),
      q4: Boolean(draft.subjective.hpi_summary.trim()),
      q5: Boolean(transcriptSymptoms.length || hpiSignals),
      q6: Boolean(draft.subjective.relevant_pmh.trim() || transcriptPmh.trim()),
      q7: hasFullHistorySection3,
    };

    const missingIds = (Object.keys(qStatus) as ChecklistQuestionId[]).filter((id) => !qStatus[id]);
    return {
      qStatus,
      missingIds,
      missingLabels: missingIds.map((id) => checklistQuestionLabel[id]),
      completedCount: (Object.keys(qStatus) as ChecklistQuestionId[]).filter((id) => qStatus[id]).length,
    };
  };

  const matchSyndromeModulesFromContext = (
    context: ClinicalContext,
    symptoms: string[],
    transcript: string,
  ): SyndromeModule[] => {
    const normalizedText = toAsciiLower(`${transcript} ${symptoms.join(' ')}`).replace(/\s+/g, ' ').trim();
    const complaintIds = new Set(context.matchedComplaints.map((item) => item.id));

    const matched = syndromeModules.filter((module) => {
      const complaintHit = module.chiefComplaintIds.some((id) => complaintIds.has(id));
      const keywordHit = module.keywords.some((keyword) => containsClinicalTerm(normalizedText, keyword));
      const systemHit = module.systemTags.some((tag) => context.matchedSystems.includes(tag));
      return complaintHit || keywordHit || systemHit;
    });

    if (matched.length > 0) return matched;
    if (context.matchedSystems.length === 0) return [];
    return syndromeModules.filter((module) => module.systemTags.includes(context.matchedSystems[0]));
  };

  const collectLibraryDiagnosisTerms = (modules: SyndromeModule[]): string[] =>
    uniqueValues(modules.flatMap((module) => [...module.commonDiagnoses, ...module.notToMissDiagnoses]));

  const isDiagnosisOutsideLibrary = (draft: SoapData, modules: SyndromeModule[]): boolean => {
    const diagnosisRaw = normalizeCapturedValue(
      `${draft.assessment.primary_diagnosis || ''}. ${draft.assessment.differential_diagnosis || ''}`,
    );
    if (!diagnosisRaw) return false;

    const normalizedDiagnosis = toAsciiLower(diagnosisRaw).replace(/\s+/g, ' ').trim();
    const referenceTerms = collectLibraryDiagnosisTerms(modules.length > 0 ? modules : syndromeModules);
    if (referenceTerms.length === 0) return false;

    return !referenceTerms.some((term) => containsClinicalTerm(normalizedDiagnosis, term));
  };

  const inferSystemsFromSymptoms = (symptoms: string[]): SystemTag[] => {
    const inferred = new Set<SystemTag>();
    for (const symptom of symptoms) {
      if (/ho|khó thở|khò khè|đau ngực/.test(symptom)) inferred.add('respiratory');
      if (/hồi hộp|ngất/.test(symptom)) inferred.add('cardio');
      if (/đau bụng|nôn|tiêu chảy|phân đen/.test(symptom)) inferred.add('gastro');
      if (/đau đầu|choáng|chóng mặt|co giật|yếu liệt/.test(symptom)) inferred.add('neuro');
      if (/đau khớp|sưng/.test(symptom)) inferred.add('musculoskeletal');
      if (/tiểu|hông lưng|đau vùng thận/.test(symptom)) inferred.add('urinary');
      if (/mẩn|ban|mề đay|ngứa/.test(symptom)) inferred.add('dermatology');
      if (/đỏ mắt|mờ mắt|đau mắt/.test(symptom)) inferred.add('ophthalmology');
      if (/khát|tiểu nhiều|hạ đường huyết/.test(symptom)) inferred.add('endocrine');
      if (/mất ngủ|lo âu|trầm/.test(symptom)) inferred.add('mental');
      if (/sốt|mệt/.test(symptom)) inferred.add('general');
    }
    return Array.from(inferred);
  };

  const deriveClinicalContext = (
    transcript: string,
    chiefComplaint: string,
    symptoms: string[],
    parsedPmh: string,
  ): ClinicalContext => {
    const searchText = [transcript, chiefComplaint, symptoms.join(', '), parsedPmh].filter(Boolean).join(' ');
    const matchedComplaints = matchChiefComplaints(searchText);
    const matchedSystemSet = new Set<SystemTag>(matchedComplaints.map((item) => item.systemTag));
    for (const inferred of inferSystemsFromSymptoms(symptoms)) matchedSystemSet.add(inferred);

    const normalizedText = toAsciiLower(searchText).replace(/\s+/g, ' ').trim();
    const matchedPmh: string[] = [];
    for (const group of pmhChecklist) {
      for (const item of group.items) {
        const terms = [item.label, ...item.synonyms];
        if (terms.some((term) => containsClinicalTerm(normalizedText, term))) {
          matchedPmh.push(item.label);
          break;
        }
      }
    }

    return {
      matchedComplaints,
      matchedSystems: Array.from(matchedSystemSet),
      matchedPmh: uniqueValues(matchedPmh),
    };
  };

  const detectTriageFromTranscript = (
    transcript: string,
    symptoms: string[],
    context: ClinicalContext,
  ): TriageInsight => {
    const normalizedText = toAsciiLower(`${transcript} ${symptoms.join(' ')}`).replace(/\s+/g, ' ').trim();

    const matchedRules = redFlagRules.filter((rule) =>
      rule.triggers.some((trigger) => containsClinicalTerm(normalizedText, trigger)),
    );
    const emergencyRules = matchedRules.filter((rule) => rule.level === 'emergency');
    const urgentRules = matchedRules.filter((rule) => rule.level === 'urgent_same_day');

    const emergencyHeuristicFlags: string[] = [];
    if (/khong tho|tim tai|noi khong thanh cau/.test(normalizedText)) emergencyHeuristicFlags.push('Khó thở nặng/tím tái');
    if (/co giat|hon me|lo mo|ngat/.test(normalizedText)) emergencyHeuristicFlags.push('Rối loạn ý thức/co giật');
    if (/non ra mau|phan den|di cau ra mau/.test(normalizedText)) emergencyHeuristicFlags.push('Xuất huyết tiêu hóa');

    const urgentSymptomFlags = symptoms.filter((symptom) =>
      /(khó thở|choáng|chóng mặt|sốt|đau đầu|đau bụng|nôn|tiêu chảy|đau ngực)/i.test(symptom),
    );

    const highRiskPmhTags = [
      'Bệnh mạch vành',
      'Suy tim',
      'Đái tháo đường',
      'Bệnh thận mạn',
      'COPD',
      'Hen phế quản',
      'Xơ gan',
    ];
    const highRiskPmhDetected = context.matchedPmh.filter((item) =>
      highRiskPmhTags.some((tag) => toAsciiLower(item) === toAsciiLower(tag)),
    );
    const acuteSymptomSignal = /(kho tho|dau nguc|choang|chong mat|ngat|sot|dau bung|non|tieu chay|co giat)/.test(
      normalizedText,
    );

    let level: TriageLevel = 'routine';
    if (emergencyRules.length > 0 || emergencyHeuristicFlags.length > 0) {
      level = 'emergency';
    } else if (
      urgentRules.length > 0 ||
      urgentSymptomFlags.length >= 2 ||
      urgentSymptomFlags.some((flag) => /khó thở|choáng|chóng mặt|đau ngực/i.test(flag)) ||
      (highRiskPmhDetected.length > 0 && acuteSymptomSignal)
    ) {
      level = 'urgent_same_day';
    }

    const routineFollowUpBySystem: Partial<Record<SystemTag, string>> = {
      respiratory: 'Tái khám 2-3 ngày nếu ho/sốt chưa cải thiện hoặc sớm hơn khi khó thở tăng.',
      gastro: 'Tái khám 7-10 ngày nếu triệu chứng tiêu hóa không giảm hoặc xuất hiện dấu hiệu báo động.',
      urinary: 'Tái đánh giá sau 48-72 giờ nếu tiểu buốt/đau hông lưng chưa cải thiện.',
      musculoskeletal: 'Tái khám 24-72 giờ nếu sưng đau khớp không giảm hoặc tăng đau.',
    };
    const firstSystem = context.matchedSystems[0];
    const followUp =
      level === 'emergency'
        ? 'Không hẹn tái khám thường quy. Chuyển cấp cứu ngay.'
        : level === 'urgent_same_day'
          ? 'Khám trong ngày hoặc trong 24 giờ; nếu cho theo dõi tại nhà thì tái đánh giá 24-48 giờ.'
          : routineFollowUpBySystem[firstSystem || 'general'] ||
            'Tái khám 2-3 ngày nếu không cải thiện hoặc sớm hơn khi có dấu hiệu nặng.';

    const topRuleRecommendations = matchedRules.slice(0, 2).map((rule) => rule.recommendation);
    const recommendedQuestions = context.matchedSystems.length
      ? context.matchedSystems.flatMap((system) => hpiPromptsBySystem[system]?.followUps.slice(0, 2) || []).slice(0, 8)
      : universalHpiChecklist.slice(0, 5);

    const redFlags = uniqueValues([
      ...matchedRules.map((rule) => rule.label),
      ...emergencyHeuristicFlags,
      ...urgentSymptomFlags,
      ...highRiskPmhDetected.map((item) => `Bệnh nền nguy cơ: ${item}`),
    ]);

    const riskLevel =
      level === 'emergency'
        ? 'Khẩn cấp (Level 3) - Cần khám cấp cứu ngay'
        : level === 'urgent_same_day'
          ? 'Nguy cơ cao (Level 2) - Cần khám trong ngày/24 giờ'
          : 'Thông thường (Level 1) - Theo dõi ngoại trú';

    const instruction =
      level === 'emergency'
        ? 'Không trì hoãn. Ưu tiên cấp cứu ngay và xử trí theo quy trình khẩn.'
        : level === 'urgent_same_day'
          ? `Ưu tiên đánh giá trực tiếp sớm. ${topRuleRecommendations[0] || ''}`.trim()
          : 'Theo dõi triệu chứng, bổ sung dữ liệu còn thiếu và tái khám theo hẹn nếu không cải thiện.';

    return {
      level,
      riskLevel,
      critical: level === 'emergency',
      followUp,
      instruction,
      redFlags,
      matchedRules: matchedRules.map((rule) => rule.label),
      matchedSystems: context.matchedSystems,
      matchedComplaints: context.matchedComplaints.map((item) => item.label),
      matchedPmh: context.matchedPmh,
      recommendedQuestions,
    };
  };

  const buildInferenceGate = (
    draft: SoapData,
    transcript: string,
    symptoms: string[],
    triage: TriageInsight,
  ): InferenceGate => {
    const checklist = evaluateChecklistAnswers(draft, transcript);
    const associatedSymptomCount = symptoms.length;
    const hasRiskFactor = triage.matchedPmh.length > 0;
    const missingForDifferential = checklist.missingLabels.map((label) => `Thiếu mục checklist: ${label}.`);

    const suggestedQuestions = uniqueValues([
      ...checklist.missingLabels.map((label) => `Bổ sung mục checklist: ${label}`),
      ...triage.recommendedQuestions,
      ...universalHpiChecklist,
    ]).slice(0, 8);

    return {
      readyForDifferential: missingForDifferential.length === 0,
      missingForDifferential: uniqueValues(missingForDifferential),
      associatedSymptomCount,
      hasRiskFactor,
      suggestedQuestions,
    };
  };

  const buildPrimaryAssessmentFromSymptoms = (
    symptoms: string[],
    triage: TriageInsight,
    gate: InferenceGate,
    matchedModules: SyndromeModule[],
  ) => {
    if (!gate.readyForDifferential) {
      const topMissing = gate.missingForDifferential.slice(0, 2).join(' ');
      return `Chưa đủ dữ kiện để nhận định sâu (insufficient_data). ${topMissing}`;
    }
    if (matchedModules.length > 0) {
      const topModule = matchedModules[0];
      const commonTop = topModule.commonDiagnoses.slice(0, 2).join('; ');
      const notToMissTop = topModule.notToMissDiagnoses.slice(0, 2).join('; ');
      const urgencyNote =
        triage.level === 'emergency'
          ? 'Ca này có dấu hiệu nguy cơ cao, ưu tiên xử trí khẩn trước.'
          : triage.level === 'urgent_same_day'
            ? 'Cần khám trực tiếp sớm trong ngày/24 giờ.'
            : 'Theo dõi ngoại trú và đối chiếu khám lâm sàng.';
      const redFlagIntro =
        triage.level === 'emergency' && triage.redFlags.length > 0
          ? `RED FLAGS: ${triage.redFlags.slice(0, 3).join('; ')}. `
          : '';
      return `${redFlagIntro}Định hướng theo module ${topModule.label}: Thường gặp ${commonTop || 'Chưa rõ'}. Không được bỏ sót ${notToMissTop || 'Chưa rõ'}. ${urgencyNote} Bác sĩ xác nhận chẩn đoán cuối cùng.`;
    }
    if (!symptoms.length && !triage.matchedSystems.length) {
      return 'Nhận định sơ bộ: Đã đủ checklist tối thiểu nhưng triệu chứng còn mô tả chung, cần bác sĩ xác nhận chẩn đoán cuối cùng.';
    }
    const syndromeBySystem: Partial<Record<SystemTag, string>> = {
      general: 'hội chứng sốt/toàn thân',
      respiratory: 'hội chứng hô hấp',
      cardio: 'hội chứng tim mạch',
      gastro: 'hội chứng tiêu hóa',
      neuro: 'hội chứng thần kinh',
      musculoskeletal: 'hội chứng cơ xương khớp',
      urinary: 'hội chứng tiết niệu',
      dermatology: 'hội chứng dị ứng/da liễu',
      ophthalmology: 'hội chứng mắt',
      endocrine: 'hội chứng nội tiết/chuyển hóa',
      mental: 'hội chứng tâm thần - giấc ngủ',
      administrative: 'nhu cầu khám hành chính/tái khám',
    };
    const syndromeText = triage.matchedSystems.length
      ? triage.matchedSystems.map((system) => syndromeBySystem[system] || system).slice(0, 2).join(' + ')
      : symptoms.slice(0, 5).join(' + ');
    return `Nhận định hội chứng: ${syndromeText}. Cần bác sĩ khám trực tiếp để xác nhận chẩn đoán cuối cùng.`;
  };

  const buildDifferentialFromSymptoms = (
    symptoms: string[],
    triage: TriageInsight,
    gate: InferenceGate,
    matchedModules: SyndromeModule[],
  ) => {
    if (!gate.readyForDifferential) {
      return `Chưa đủ dữ kiện để lập chẩn đoán phân biệt (insufficient_data). ${gate.missingForDifferential
        .slice(0, 3)
        .join(' ')}`;
    }

    if (matchedModules.length > 0) {
      const requiredChecks = uniqueValues(matchedModules.flatMap((module) => module.requiredChecks)).slice(0, 6);
      const commonDiagnoses = uniqueValues(matchedModules.flatMap((module) => module.commonDiagnoses)).slice(0, 6);
      const notToMiss = uniqueValues(matchedModules.flatMap((module) => module.notToMissDiagnoses)).slice(0, 6);
      const redFlags = uniqueValues(matchedModules.flatMap((module) => module.emergencyRedFlags)).slice(0, 6);

      return [
        `(1) Dấu hiệu cần hỏi/khám: ${requiredChecks.join('; ') || 'Chưa rõ'}.`,
        `(2) Chẩn đoán thường gặp: ${commonDiagnoses.join('; ') || 'Chưa rõ'}.`,
        `(3) Ít gặp nhưng không được bỏ sót (Not-to-miss): ${notToMiss.join('; ') || 'Chưa rõ'}.`,
        `(4) Red flags ưu tiên cấp cứu/khẩn: ${redFlags.join('; ') || 'Chưa rõ'}.`,
      ].join(' ');
    }

    const differentialBySystem: Partial<Record<SystemTag, string[]>> = {
      respiratory: ['Nhiễm trùng hô hấp/virus (cần loại trừ).', 'Đợt cấp hen/COPD nếu có khò khè/khó thở.'],
      cardio: ['Hội chứng vành cấp/rối loạn nhịp cần loại trừ theo mức độ.', 'Nguyên nhân tim mạch chức năng cần đánh giá thêm.'],
      gastro: ['Bệnh lý tiêu hóa cấp (viêm dạ dày-ruột/GERD) cần loại trừ.', 'Nguyên nhân bụng cấp cần theo dõi nếu đau tăng.'],
      neuro: ['Nguyên nhân thần kinh/tuần hoàn cần theo dõi thêm.', 'Rối loạn tiền đình/chóng mặt ngoại biên cần đánh giá.'],
      urinary: ['Nhiễm trùng tiểu hoặc sỏi tiết niệu cần loại trừ.', 'Biến chứng thận-tiết niệu cần đánh giá nếu sốt/đau hông lưng.'],
      musculoskeletal: ['Đợt viêm khớp/gút cần phân biệt.', 'Nguy cơ nhiễm trùng khớp nếu sưng nóng đỏ kèm sốt.'],
      dermatology: ['Phản ứng dị ứng da niêm cần theo dõi mức độ.', 'Nhiễm trùng da mô mềm cần loại trừ khi sưng nóng đỏ.'],
      endocrine: ['Rối loạn đường huyết/chuyển hóa cần đánh giá thêm.', 'Bệnh lý nội tiết đi kèm cần khảo sát theo xét nghiệm.'],
      general: ['Hội chứng nhiễm trùng toàn thân mức độ nhẹ-trung bình cần loại trừ.'],
    };

    const clues: string[] = [];
    for (const system of triage.matchedSystems) {
      clues.push(...(differentialBySystem[system] || []));
    }
    if (!clues.length && symptoms.length) {
      clues.push('Cần khai thác thêm triệu chứng và khám lâm sàng để lập chẩn đoán phân biệt.');
    }
    if (triage.matchedPmh.length) {
      clues.push(`Yếu tố bệnh nền liên quan: ${triage.matchedPmh.slice(0, 3).join(', ')}.`);
    }
    if (triage.level === 'emergency') {
      clues.push('Ưu tiên loại trừ nguyên nhân cấp cứu trước khi hoàn thiện chẩn đoán phân biệt.');
    }
    if (!clues.length) {
      clues.push('Chẩn đoán phân biệt tạm thời: cần đối chiếu thêm khám lâm sàng và cận lâm sàng để xác nhận.');
    }
    return uniqueValues(clues).join(' ');
  };

  const buildMissingInfoFlags = (
    draft: SoapData,
    birthYear: string,
    transcript: string,
    triage: TriageInsight,
    gate: InferenceGate,
  ) => {
    const flags: string[] = [];
    if (!draft.header.patient_name.trim()) flags.push('Thiếu họ và tên bệnh nhân.');
    if (!draft.header.sex.trim()) flags.push('Thiếu giới tính bệnh nhân.');
    if (!draft.header.patient_identifier.trim()) flags.push('Thiếu CCCD hoặc mã bệnh nhân.');
    if (!draft.header.dob.trim()) {
      if (birthYear) {
        flags.push(`Mới có năm sinh ${birthYear}, cần hỏi thêm ngày/tháng/năm sinh đầy đủ.`);
      } else {
        flags.push('Thiếu ngày tháng năm sinh.');
      }
    }
    if (!draft.subjective.chief_complaint.trim()) flags.push('Thiếu lý do khám chính.');
    if (!draft.subjective.relevant_pmh.trim()) flags.push('Thiếu tiền sử bệnh nền quan trọng.');

    const allergyText = toAsciiLower(draft.subjective.allergies || '');
    const hasDrugAllergyStatus =
      /di ung thuoc/.test(allergyText) || /khong ghi nhan/.test(allergyText) || /khong di ung/.test(allergyText);
    const hasFoodAllergyStatus =
      /di ung thuc an/.test(allergyText) ||
      /dau phong|hai san|trung|sua/.test(allergyText) ||
      /khong ghi nhan/.test(allergyText) ||
      /khong di ung/.test(allergyText);
    if (!hasDrugAllergyStatus) flags.push('Chưa rõ dị ứng thuốc.');
    if (!hasFoodAllergyStatus) flags.push('Chưa rõ dị ứng thức ăn.');
    if (!draft.subjective.current_meds.trim()) flags.push('Chưa có thông tin thuốc bệnh nhân đã dùng gần đây.');

    if (triage.level === 'urgent_same_day') {
      flags.push('Có dấu hiệu nguy cơ, cần khám trong ngày hoặc trong 24 giờ.');
    }
    if (triage.level === 'emergency') {
      flags.push('Có dấu hiệu cảnh báo nặng, cần chuyển cấp cứu ngay.');
    }

    const ageValue = Number(draft.header.age || inferAgeFromBirthYear(birthYear, new Date()));
    if (Number.isFinite(ageValue) && ageValue > 0 && ageValue < 18) {
      flags.push('Bệnh nhân dưới 18 tuổi: cần bổ sung thông tin người giám hộ và số điện thoại.');
    }

    if (!gate.readyForDifferential) {
      flags.push('Chưa đạt đủ 7 mục checklist để suy luận chẩn đoán phân biệt.');
      for (const missing of gate.missingForDifferential.slice(0, 4)) {
        flags.push(missing);
      }
      for (const q of gate.suggestedQuestions.slice(0, 3)) {
        flags.push(`Cần hỏi thêm: ${q}`);
      }
    }

    return uniqueValues(flags);
  };

  const buildUncertaintyFlags = (
    draft: SoapData,
    transcript: string,
    triage: TriageInsight,
    gate: InferenceGate,
    diagnosisOutsideLibrary: boolean,
  ) => {
    const flags: string[] = [];
    if (transcript.trim().length < 30) flags.push('Transcript quá ngắn, mức độ chắc chắn thấp.');
    if (!draft.header.dob.trim() && !draft.header.age.trim()) flags.push('Chưa đủ dữ liệu để tính tuổi chính xác.');
    if (draft.subjective.current_meds && !/\d/.test(draft.subjective.current_meds)) {
      flags.push('Thuốc gần đây chưa rõ liều dùng/thời điểm dùng cuối.');
    }
    if (!triage.matchedSystems.length) {
      flags.push('Chưa nhận diện rõ hội chứng, cần bệnh nhân trả lời theo đúng thứ tự câu hỏi.');
    }
    if (!gate.readyForDifferential) {
      flags.push('Hệ thống đang ở chế độ insufficient_data: chỉ định hướng hỏi thêm, chưa lập chẩn đoán phân biệt.');
    }
    if (diagnosisOutsideLibrary) {
      flags.push('bác sĩ chẩn đoán');
    }
    return uniqueValues(flags);
  };

  const normalizeEvidenceText = (raw: string) =>
    toAsciiLower(raw)
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const evidenceStopWords = new Set([
    'toi',
    'ten',
    'la',
    'benh',
    'nhan',
    'ngay',
    'thang',
    'nam',
    'gioi',
    'tinh',
    'co',
    'khong',
    'va',
    'thi',
    'dang',
    'bi',
    'duoc',
    'cua',
    'trong',
    'mot',
  ]);

  const tokenizeEvidence = (raw: string) =>
    normalizeEvidenceText(raw)
      .split(' ')
      .map((token) => token.trim())
      .filter((token) => token.length >= 3 && !evidenceStopWords.has(token));

  const shortenEvidenceLine = (raw: string, limit = 180) => {
    const normalized = normalizeCapturedValue(raw);
    if (normalized.length <= limit) return normalized;
    return `${normalized.slice(0, limit).trim()}...`;
  };

  const pickEvidenceLines = (transcript: string, value: string, hints: string[] = [], limit = 2) => {
    const sentences = getTranscriptSentences(transcript);
    if (!sentences.length) return [];

    const valueNormalized = normalizeEvidenceText(value);
    const valueTokens = tokenizeEvidence(value).slice(0, 8);
    const hintTokens = hints.flatMap((hint) => tokenizeEvidence(hint)).slice(0, 12);

    const scored = sentences
      .map((sentence, index) => {
        const sentenceNormalized = normalizeEvidenceText(sentence);
        let score = 0;
        if (valueNormalized && valueNormalized.length >= 4 && sentenceNormalized.includes(valueNormalized)) {
          score += 12;
        }
        for (const token of valueTokens) {
          if (sentenceNormalized.includes(token)) score += token.length >= 5 ? 3 : 2;
        }
        for (const token of hintTokens) {
          if (sentenceNormalized.includes(token)) score += 2;
        }
        return { sentence, sentenceNormalized, score, index };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => (b.score === a.score ? a.index - b.index : b.score - a.score));

    if (!scored.length) {
      const fallback = sentences
        .filter((sentence) => {
          const normalized = normalizeEvidenceText(sentence);
          return hintTokens.some((token) => normalized.includes(token));
        })
        .slice(0, limit)
        .map((line) => shortenEvidenceLine(line));
      return uniqueValues(fallback);
    }

    const selected: string[] = [];
    const seen = new Set<string>();
    for (const item of scored) {
      const key = item.sentenceNormalized;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      selected.push(shortenEvidenceLine(item.sentence));
      if (selected.length >= limit) break;
    }
    return selected;
  };

  const buildEvidenceMapFromTranscript = (
    transcript: string,
    draft: SoapData,
    symptoms: string[],
    triage: TriageInsight,
  ) => {
    const evidence: Record<string, string[]> = {};
    const addEvidence = (fieldKey: string, value: string, hints: string[]) => {
      evidence[fieldKey] = pickEvidenceLines(transcript, value, hints);
    };

    addEvidence('header.patient_name', draft.header.patient_name, ['họ tên', 'tên bệnh nhân', 'tôi tên']);
    addEvidence('header.patient_identifier', draft.header.patient_identifier, ['cccd', 'căn cước', 'cmnd', 'mã bệnh nhân']);
    addEvidence('header.dob', draft.header.dob, ['ngày sinh', 'sinh ngày', 'năm sinh']);
    addEvidence('header.sex', draft.header.sex, ['giới tính', 'nam', 'nữ']);

    addEvidence('subjective.chief_complaint', draft.subjective.chief_complaint, ['lý do khám', ...symptoms]);
    addEvidence('subjective.onset', draft.subjective.onset, ['khởi phát', 'bắt đầu', 'từ', 'khoảng']);
    addEvidence('subjective.progression', draft.subjective.progression, ['diễn tiến', 'tăng', 'giảm', 'nặng']);
    addEvidence('subjective.hpi_summary', draft.subjective.hpi_summary, ['bệnh sử', 'diễn tiến', 'hiện tại có', ...symptoms]);
    addEvidence('subjective.relevant_pmh', draft.subjective.relevant_pmh, ['tiền sử', 'bệnh nền', ...triage.matchedPmh]);
    addEvidence('subjective.allergies', draft.subjective.allergies, ['dị ứng', 'dị ứng thuốc', 'dị ứng thức ăn']);
    addEvidence('subjective.current_meds', draft.subjective.current_meds, ['thuốc đang dùng', 'thuốc gần đây', 'đã dùng']);

    addEvidence('assessment.primary_diagnosis', draft.assessment.primary_diagnosis, [
      ...symptoms,
      ...triage.matchedComplaints,
      ...triage.redFlags,
    ]);
    addEvidence('assessment.differential_diagnosis', draft.assessment.differential_diagnosis, [
      ...symptoms,
      ...triage.matchedSystems,
    ]);
    addEvidence('assessment.risk_level', draft.assessment.risk_level, [...triage.redFlags, ...triage.matchedRules]);

    addEvidence('plan.medications', medicationsToText(draft.plan.medications), [...triage.redFlags, ...triage.matchedRules]);
    addEvidence('plan.instructions', draft.plan.instructions, [...triage.redFlags, 'đánh giá trực tiếp']);
    addEvidence('plan.follow_up', draft.plan.follow_up, ['tái khám', 'trong ngày', '24 giờ', ...triage.redFlags]);
    addEvidence('plan.red_flags', draft.plan.red_flags, [...triage.redFlags]);

    return evidence;
  };

  const parseDateAny = (raw: string) => {
    const value = raw.trim();
    if (!value) return null;
    const dmy = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (dmy) {
      const day = Number(dmy[1]);
      const month = Number(dmy[2]);
      const y = Number(dmy[3]);
      const year = y < 100 ? y + 1900 : y;
      const date = new Date(year, month - 1, day);
      if (!Number.isNaN(date.getTime())) return date;
    }
    const ymd = value.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (ymd) {
      const year = Number(ymd[1]);
      const month = Number(ymd[2]);
      const day = Number(ymd[3]);
      const date = new Date(year, month - 1, day);
      if (!Number.isNaN(date.getTime())) return date;
    }
    return null;
  };

  const calculateAge = (dob: Date, at: Date) => {
    let age = at.getFullYear() - dob.getFullYear();
    const monthDiff = at.getMonth() - dob.getMonth();
    const dayDiff = at.getDate() - dob.getDate();
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age -= 1;
    return Math.max(0, age);
  };

  const inferAgeFromBirthYear = (birthYearRaw: string, at: Date) => {
    const birthYear = Number(birthYearRaw);
    if (!Number.isFinite(birthYear)) return '';
    if (birthYear < 1900 || birthYear > at.getFullYear()) return '';
    return String(Math.max(0, at.getFullYear() - birthYear));
  };

  const inferMedicationPlan = (triage: TriageInsight): Medication[] => {
    if (triage.level === 'emergency') {
      return [
        {
          name: 'Ưu tiên xử trí cấp cứu',
          dose: 'Không trì hoãn để tự dùng thuốc tại nhà',
          duration: 'Khám cấp cứu ngay',
        },
      ];
    }
    if (triage.level === 'urgent_same_day') {
      return [
        {
          name: 'Cần bác sĩ khám và kê đơn trong ngày',
          dose: 'Không tự tăng/đổi thuốc khi chưa khám trực tiếp',
          duration: 'Trong 24 giờ',
        },
      ];
    }
    return [
      {
        name: 'Theo dõi ngoại trú',
        dose: 'Thuốc cụ thể sẽ do bác sĩ xác nhận sau khám',
        duration: 'Tái khám nếu không cải thiện',
      },
    ];
  };

  const hydrateSoapFromTranscript = (
    base: SoapData,
    transcriptRaw: string,
    options: { overwriteExisting?: boolean } = {},
  ): SoapData => {
    const overwrite = options.overwriteExisting === true;
    const next: SoapData = JSON.parse(JSON.stringify(base));
    const now = recordingEndedAt || new Date();
    const nowText = now.toLocaleString('vi-VN');
    const isUnknownPlaceholder = (value: string) => {
      const normalized = toAsciiLower(normalizeCapturedValue(value));
      return [
        'chua ro',
        'khong ro',
        'khong xac dinh',
        'unknown',
        'n/a',
        'na',
        'null',
        'undefined',
      ].includes(normalized);
    };
    const assign = (current: string, candidate: string) => {
      const normalized = normalizeCapturedValue(candidate || '');
      if (!normalized) return current;
      const currentNormalized = normalizeCapturedValue(current || '');
      if (overwrite || !currentNormalized || isUnknownPlaceholder(currentNormalized)) return normalized;
      return current;
    };

    next.transcript = transcriptRaw;
    next.header.datetime = assign(next.header.datetime, nowText);
    next.header.department = assign(next.header.department, 'Lớp 12A6');
    next.header.doctor = assign(next.header.doctor, 'Lee Việt Anh');

    const parsedName = parseNameFromText(transcriptRaw);
    const parsedSex = parseSexFromText(transcriptRaw);
    const parsedIdentifier = parsePatientIdentifierFromText(transcriptRaw);
    const parsedDob = parseDobFromText(transcriptRaw);
    const parsedBirthYear = parseBirthYearFromText(transcriptRaw);
    const parsedAge = parseAgeFromText(transcriptRaw);
    const parsedChief = parseChiefComplaintFromText(transcriptRaw);
    const parsedOnset = parseOnsetFromText(transcriptRaw);
    const parsedProgression = parseProgressionFromText(transcriptRaw);
    const parsedSymptoms = parseCurrentSymptomsFromText(transcriptRaw);
    const parsedHistory = parseHpiSummaryFromText(transcriptRaw);
    const parsedPmh = parseRelevantPmhFromText(transcriptRaw);
    const parsedAllergies = parseAllergiesFromText(transcriptRaw);
    const parsedCurrentMeds = parseCurrentMedsFromText(transcriptRaw);
    const clinicalContext = deriveClinicalContext(transcriptRaw, parsedChief, parsedSymptoms, parsedPmh);
    const triage = detectTriageFromTranscript(transcriptRaw, parsedSymptoms, clinicalContext);

    next.header.patient_name = assign(next.header.patient_name, parsedName);
    next.header.sex = assign(next.header.sex, parsedSex);
    next.header.patient_identifier = assign(next.header.patient_identifier, parsedIdentifier);
    next.header.dob = assign(next.header.dob, parsedDob);
    next.header.age = assign(next.header.age, parsedAge);

    if (!next.header.age.trim()) {
      const dobDate = parseDateAny(next.header.dob || '');
      if (dobDate) {
        next.header.age = String(calculateAge(dobDate, now));
      } else if (parsedBirthYear) {
        next.header.age = inferAgeFromBirthYear(parsedBirthYear, now);
      }
    }

    if (!next.header.exam_started_at.trim() && recordingStartedAt) {
      next.header.exam_started_at = recordingStartedAt.toLocaleString('vi-VN');
    }
    if (!next.header.exam_ended_at.trim() && recordingEndedAt) {
      next.header.exam_ended_at = recordingEndedAt.toLocaleString('vi-VN');
    }

    if (!next.header.patient_info.trim()) {
      next.header.patient_info = [next.header.patient_name, next.header.age ? `${next.header.age} tuổi` : '']
        .filter(Boolean)
        .join(' - ');
    }

    next.subjective.chief_complaint = assign(next.subjective.chief_complaint, parsedChief);
    next.subjective.onset = assign(next.subjective.onset, parsedOnset);
    next.subjective.progression = assign(next.subjective.progression, parsedProgression);
    next.subjective.hpi_summary = assign(next.subjective.hpi_summary, parsedHistory);
    next.subjective.relevant_pmh = assign(next.subjective.relevant_pmh, parsedPmh);
    next.subjective.allergies = assign(next.subjective.allergies, parsedAllergies);
    next.subjective.current_meds = assign(next.subjective.current_meds, parsedCurrentMeds);

    if (!next.subjective.hpi_summary.trim()) {
      const segments = [
        next.subjective.onset ? `Khởi phát ${next.subjective.onset}` : '',
        parsedSymptoms.length ? `Hiện có ${parsedSymptoms.join(', ')}` : '',
        next.subjective.progression ? `Diễn tiến ${next.subjective.progression.toLowerCase()}` : '',
      ].filter(Boolean);
      next.subjective.hpi_summary = segments.join('. ');
    }

    const matchedModules = matchSyndromeModulesFromContext(clinicalContext, parsedSymptoms, transcriptRaw);
    const inferenceGate = buildInferenceGate(next, transcriptRaw, parsedSymptoms, triage);

    next.assessment.primary_diagnosis = assign(
      next.assessment.primary_diagnosis,
      buildPrimaryAssessmentFromSymptoms(parsedSymptoms, triage, inferenceGate, matchedModules),
    );
    next.assessment.differential_diagnosis = assign(
      next.assessment.differential_diagnosis,
      buildDifferentialFromSymptoms(parsedSymptoms, triage, inferenceGate, matchedModules),
    );
    next.assessment.risk_level = assign(next.assessment.risk_level, triage.riskLevel);

    next.plan.instructions = assign(next.plan.instructions, triage.instruction);
    next.plan.follow_up = assign(next.plan.follow_up, triage.followUp);
    next.plan.red_flags = assign(next.plan.red_flags, triage.redFlags.join(', '));
    if (!next.plan.medications.length) {
      next.plan.medications = inferMedicationPlan(triage);
    }

    next.header.critical_flag = triage.level === 'emergency';
    next.evidence_lines = buildEvidenceMapFromTranscript(transcriptRaw, next, parsedSymptoms, triage);

    const diagnosisOutsideLibrary = inferenceGate.readyForDifferential && isDiagnosisOutsideLibrary(next, matchedModules);
    next.missing_info_flags = buildMissingInfoFlags(next, parsedBirthYear, transcriptRaw, triage, inferenceGate);
    next.uncertainty_flags = buildUncertaintyFlags(next, transcriptRaw, triage, inferenceGate, diagnosisOutsideLibrary);
    if (!next.disclaimer.trim()) {
      next.disclaimer = 'Thông tin do AI hỗ trợ ghi nhận. Không thay thế chẩn đoán hoặc kê đơn của bác sĩ.';
    }

    return next;
  };

  const enrichSoapData = (data: SoapData): SoapData => {
    const enriched: SoapData = JSON.parse(JSON.stringify(data));
    const transcript = enriched.transcript || '';
    if (!transcript.trim()) return enriched;
    return hydrateSoapFromTranscript(enriched, transcript, { overwriteExisting: false });
  };

  const hasSparseStructuredData = (data: SoapData) => {
    const keyFields = [
      data.header.patient_name,
      data.header.patient_identifier,
      data.subjective.chief_complaint,
      data.subjective.hpi_summary,
      data.assessment.primary_diagnosis,
      data.plan.instructions,
      data.plan.follow_up,
    ];
    const filledCount = keyFields.filter((value) => normalizeCapturedValue(value || '').length > 0).length;
    return filledCount < 2;
  };

  const isWeakTranscript = (raw: string) => {
    const normalized = toAsciiLower(normalizeCapturedValue(raw || ''));
    if (!normalized) return true;
    return (
      normalized.includes('[mock]') ||
      normalized.includes('chua ro transcript') ||
      normalized.includes('khong ro transcript') ||
      normalized.includes('khong the nhan dien noi dung that') ||
      normalized.includes('chua co transcript that')
    );
  };

  const applyDraftFromTranscript = (rawTranscript?: string, options: { overwriteExisting?: boolean } = {}) => {
    const transcriptRaw = (rawTranscript ?? `${liveTranscript} ${interimTranscript}`).trim();
    if (!transcriptRaw) return false;

    setFormSoap((prev) => {
      return hydrateSoapFromTranscript(prev, transcriptRaw, {
        overwriteExisting: options.overwriteExisting ?? true,
      });
    });

    return true;
  };

  const buildLocalSoapFromTranscript = (transcriptRaw: string): SoapData => {
    const base: SoapData = {
      ...emptySoap,
      mode,
      transcript: transcriptRaw,
      header: {
        ...emptySoap.header,
        exam_started_at: recordingStartedAt ? recordingStartedAt.toLocaleString('vi-VN') : '',
        exam_ended_at: recordingEndedAt ? recordingEndedAt.toLocaleString('vi-VN') : '',
      },
    };
    const hydrated = hydrateSoapFromTranscript(base, transcriptRaw, { overwriteExisting: true });
    return enrichSoapData(hydrated);
  };

  const stopDemoVoice = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    setPlayingDemoCaseId(null);
    setIsVoicePaused(false);
  };

  const toggleDemoVoicePause = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (!playingDemoCaseId) return;
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsVoicePaused(false);
      return;
    }
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      setIsVoicePaused(true);
    }
  };

  const playDemoVoice = (voiceCase: DemoVoiceCase) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setError('Trình duyệt không hỗ trợ phát voice mẫu.');
      return;
    }

    if (playingDemoCaseId === voiceCase.id) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        setIsVoicePaused(false);
      }
      return;
    }

    const normalizeForVoice = (raw: string) =>
      raw
        .replace(/CCCD\/Mã BN/gi, 'căn cước công dân hoặc mã bệnh nhân')
        .replace(/CCCD\/mã BN/gi, 'căn cước công dân hoặc mã bệnh nhân')
        .replace(/CCCD\/mã bệnh nhân/gi, 'căn cước công dân hoặc mã bệnh nhân')
        .replace(/CCCD/gi, 'căn cước công dân')
        .replace(/\bMã BN\b/gi, 'mã bệnh nhân')
        .replace(/\n+/g, '. ')
        .replace(/\s+/g, ' ')
        .trim();

    const splitVoiceChunks = (raw: string, maxLen = 210) => {
      const tokens = raw.split(/\s+/);
      const chunks: string[] = [];
      let current = '';
      for (const token of tokens) {
        const next = current ? `${current} ${token}` : token;
        if (next.length > maxLen && current) {
          chunks.push(current);
          current = token;
        } else {
          current = next;
        }
      }
      if (current) chunks.push(current);
      return chunks;
    };

    const clearText = normalizeForVoice(voiceCase.transcript);
    const repeatedText = `${clearText}. Nhắc lại lần hai để nghe rõ hơn. ${clearText}`;
    const chunks = splitVoiceChunks(repeatedText);
    const voices = window.speechSynthesis.getVoices();
    const vietnameseVoice = voices.find((voice) => /^vi(-|_)?/i.test(voice.lang || ''));

    window.speechSynthesis.cancel();
    setError(null);
    setPlayingDemoCaseId(voiceCase.id);
    setIsVoicePaused(false);

    let currentIndex = 0;
    const speakNext = () => {
      if (currentIndex >= chunks.length) {
        setPlayingDemoCaseId((prev) => (prev === voiceCase.id ? null : prev));
        setIsVoicePaused(false);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(chunks[currentIndex]);
      utterance.lang = 'vi-VN';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      if (vietnameseVoice) utterance.voice = vietnameseVoice;
      utterance.onpause = () => setIsVoicePaused(true);
      utterance.onresume = () => setIsVoicePaused(false);
      utterance.onend = () => {
        currentIndex += 1;
        setIsVoicePaused(false);
        speakNext();
      };
      utterance.onerror = () => {
        setPlayingDemoCaseId(null);
        setIsVoicePaused(false);
        setError('Không phát được voice mẫu. Vui lòng thử lại.');
      };
      window.speechSynthesis.speak(utterance);
    };

    speakNext();
  };

  const openAudiencePage = (audience: RecordingAudience) => {
    stopDemoVoice();
    setRecordingAudience(audience);
    setExamFlowPage(audience === 'patient_only' ? 'patient_only' : 'doctor_patient');
    setError(null);
  };

  const backToAudiencePicker = () => {
    if (isRecording) return;
    setExamFlowPage('audience_picker');
    stopDemoVoice();
  };

  const applyDemoVoiceCase = (voiceCase: DemoVoiceCase) => {
    const nowText = new Date().toLocaleString('vi-VN');
    const base: SoapData = {
      ...emptySoap,
      mode: 'in_room',
      transcript: voiceCase.transcript,
      header: {
        ...emptySoap.header,
        datetime: nowText,
        exam_started_at: nowText,
        exam_ended_at: nowText,
      },
      disclaimer: 'DỮ LIỆU MÔ PHỎNG: Voice demo để luyện quy trình. Bác sĩ cần xác nhận trước khi dùng thật.',
    };

    const hydrated = hydrateSoapFromTranscript(base, voiceCase.transcript, { overwriteExisting: true });
    const merged: SoapData = {
      ...hydrated,
      mode: 'in_room',
      header: { ...hydrated.header, ...voiceCase.prefill.header },
      subjective: { ...hydrated.subjective, ...voiceCase.prefill.subjective },
      assessment: { ...hydrated.assessment, ...voiceCase.prefill.assessment },
      plan: {
        ...hydrated.plan,
        ...voiceCase.prefill.plan,
        medications: voiceCase.prefill.plan.medications ?? hydrated.plan.medications,
      },
      disclaimer: base.disclaimer,
    };
    const enriched = enrichSoapData(merged);

    setMode('in_room');
    setRecordingAudience('doctor_patient');
    setExamFlowPage('doctor_patient');
    setSelectedDemoCaseId(voiceCase.id);
    setTemplateExampleNotice(true);
    setLiveTranscript(voiceCase.transcript);
    setInterimTranscript('');
    setFile(null);
    setError(null);
    setShowSplitView(true);
    setResult(enriched);
    setFormSoap(enriched);
    addToHistory(enriched, 'generated');
  };

  const applyPatientDemoVoiceCase = (voiceCase: DemoVoiceCase) => {
    const nowText = new Date().toLocaleString('vi-VN');
    const base: SoapData = {
      ...emptySoap,
      mode: 'in_room',
      transcript: voiceCase.transcript,
      header: {
        ...emptySoap.header,
        datetime: nowText,
        exam_started_at: nowText,
        exam_ended_at: nowText,
      },
      disclaimer:
        'DỮ LIỆU MÔ PHỎNG: Bệnh nhân tự khai 7 câu để luyện nhập liệu. Bác sĩ cần xác nhận trước khi dùng thật.',
    };

    const hydrated = hydrateSoapFromTranscript(base, voiceCase.transcript, { overwriteExisting: true });
    const merged: SoapData = {
      ...hydrated,
      mode: 'in_room',
      header: { ...hydrated.header, ...voiceCase.prefill.header },
      subjective: { ...hydrated.subjective, ...voiceCase.prefill.subjective },
      assessment: { ...hydrated.assessment, ...voiceCase.prefill.assessment },
      plan: {
        ...hydrated.plan,
        ...voiceCase.prefill.plan,
        medications: voiceCase.prefill.plan.medications ?? hydrated.plan.medications,
      },
      disclaimer: base.disclaimer,
    };
    const enriched = enrichSoapData(merged);

    setMode('in_room');
    setRecordingAudience('patient_only');
    setExamFlowPage('patient_only');
    setSelectedPatientDemoCaseId(voiceCase.id);
    setTemplateExampleNotice(true);
    setLiveTranscript(voiceCase.transcript);
    setInterimTranscript('');
    setFile(null);
    setError(null);
    setShowSplitView(true);
    setResult(enriched);
    setFormSoap(enriched);
    addToHistory(enriched, 'generated');
  };

  const applyDictationDemoVoiceCase = (voiceCase: DemoVoiceCase) => {
    const nowText = new Date().toLocaleString('vi-VN');
    const base: SoapData = {
      ...emptySoap,
      mode: 'dictation',
      transcript: voiceCase.transcript,
      header: {
        ...emptySoap.header,
        datetime: nowText,
        exam_started_at: nowText,
        exam_ended_at: nowText,
      },
      disclaimer:
        'DỮ LIỆU MÔ PHỎNG: Bác sĩ đọc lại sau khám để luyện nhập liệu. Bác sĩ cần xác nhận trước khi dùng thật.',
    };

    const hydrated = hydrateSoapFromTranscript(base, voiceCase.transcript, { overwriteExisting: true });
    const merged: SoapData = {
      ...hydrated,
      mode: 'dictation',
      header: { ...hydrated.header, ...voiceCase.prefill.header },
      subjective: { ...hydrated.subjective, ...voiceCase.prefill.subjective },
      assessment: { ...hydrated.assessment, ...voiceCase.prefill.assessment },
      plan: {
        ...hydrated.plan,
        ...voiceCase.prefill.plan,
        medications: voiceCase.prefill.plan.medications ?? hydrated.plan.medications,
      },
      disclaimer: base.disclaimer,
    };
    const enriched = enrichSoapData(merged);

    setMode('dictation');
    setRecordingAudience('doctor_patient');
    setExamFlowPage('doctor_patient');
    setSelectedDictationDemoCaseId(voiceCase.id);
    setTemplateExampleNotice(true);
    setLiveTranscript(voiceCase.transcript);
    setInterimTranscript('');
    setFile(null);
    setError(null);
    setShowSplitView(true);
    setResult(enriched);
    setFormSoap(enriched);
    addToHistory(enriched, 'generated');
  };

  const soapView = formSoap;

  type RequiredFieldItem = {
    key: string;
    label: string;
    value: string;
    inputType: 'text' | 'textarea' | 'sex';
  };

  const requiredFieldMeta = useMemo(() => {
    const patientCore: RequiredFieldItem[] = [
      { key: 'header.patient_name', label: 'Tên bệnh nhân', value: soapView.header.patient_name, inputType: 'text' },
      { key: 'header.patient_identifier', label: 'CCCD / Mã BN', value: soapView.header.patient_identifier, inputType: 'text' },
      { key: 'header.sex', label: 'Giới tính', value: soapView.header.sex, inputType: 'sex' },
      { key: 'header.dob', label: 'Ngày sinh', value: soapView.header.dob, inputType: 'text' },
      { key: 'subjective.chief_complaint', label: 'Lý do khám', value: soapView.subjective.chief_complaint, inputType: 'textarea' },
      { key: 'subjective.hpi_summary', label: 'Bệnh sử/triệu chứng hiện tại', value: soapView.subjective.hpi_summary, inputType: 'textarea' },
      { key: 'subjective.relevant_pmh', label: 'Tiền sử bệnh nền (Mục 3)', value: soapView.subjective.relevant_pmh, inputType: 'textarea' },
      { key: 'subjective.allergies', label: 'Dị ứng (Mục 3)', value: soapView.subjective.allergies, inputType: 'textarea' },
      { key: 'subjective.current_meds', label: 'Thuốc gần đây (Mục 3)', value: soapView.subjective.current_meds, inputType: 'textarea' },
    ];

    if (recordingAudience === 'patient_only') return patientCore;

    return [
      ...patientCore,
      { key: 'assessment.primary_diagnosis', label: 'Chẩn đoán chính', value: soapView.assessment.primary_diagnosis, inputType: 'textarea' },
      { key: 'plan.instructions', label: 'Dặn dò', value: soapView.plan.instructions, inputType: 'textarea' },
      { key: 'plan.follow_up', label: 'Tái khám/theo dõi', value: soapView.plan.follow_up, inputType: 'text' },
    ];
  }, [soapView, recordingAudience]);

  const missingRequired = useMemo(
    () => requiredFieldMeta.filter((item) => !String(item.value || '').trim()),
    [requiredFieldMeta],
  );

  const updateMissingField = (key: string, value: string) => {
    switch (key) {
      case 'header.patient_name':
        updateHeaderField('patient_name', value);
        break;
      case 'header.patient_identifier':
        updateHeaderField('patient_identifier', value);
        break;
      case 'header.sex':
        updateHeaderField('sex', value);
        break;
      case 'header.dob':
        updateHeaderField('dob', value);
        break;
      case 'subjective.chief_complaint':
        updateSubjectiveField('chief_complaint', value);
        break;
      case 'subjective.hpi_summary':
        updateSubjectiveField('hpi_summary', value);
        break;
      case 'subjective.relevant_pmh':
        updateSubjectiveField('relevant_pmh', value);
        break;
      case 'subjective.allergies':
        updateSubjectiveField('allergies', value);
        break;
      case 'subjective.current_meds':
        updateSubjectiveField('current_meds', value);
        break;
      case 'assessment.primary_diagnosis':
        updateAssessmentField('primary_diagnosis', value);
        break;
      case 'plan.instructions':
        updatePlanField('instructions', value);
        break;
      case 'plan.follow_up':
        updatePlanField('follow_up', value);
        break;
      default:
        break;
    }
  };

  const patientChecklistStatus = useMemo(() => {
    const checklist = evaluateChecklistAnswers(soapView, soapView.transcript || '');
    return patientVoiceQuestions.map((item) => ({
      ...item,
      done: checklist.qStatus[item.id as keyof typeof checklist.qStatus] ?? false,
    }));
  }, [soapView, patientVoiceQuestions]);

  const completedPatientChecklist = patientChecklistStatus.filter((item) => item.done).length;
  const hasDoctorDiagnosisAlert = useMemo(
    () => (soapView.uncertainty_flags || []).some((flag) => toAsciiLower(flag || '').includes('bac si chan doan')),
    [soapView.uncertainty_flags],
  );

  const isMissingField = (key: string) => missingRequired.some((item) => item.key === key);

  const fieldClass = (key: string) =>
    `block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset px-3 placeholder:text-slate-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6 ${
      isMissingField(key) ? 'ring-red-400 bg-red-50 focus:ring-red-500' : 'ring-slate-300 focus:ring-indigo-600'
    }`;

  const getEvidenceLinesForField = (fieldKey: string) => {
    const lines = soapView.evidence_lines?.[fieldKey] || [];
    return lines.filter(Boolean).slice(0, 2);
  };

  const renderEvidenceLines = (fieldKey: string) => {
    if (!soapView.transcript.trim()) return null;
    const lines = getEvidenceLinesForField(fieldKey);
    return (
      <div className="no-print mt-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Evidence</p>
        {lines.length > 0 ? (
          lines.map((line, index) => (
            <p key={`${fieldKey}-e-${index}`} className="text-[11px] leading-snug text-slate-600">
              "{line}"
            </p>
          ))
        ) : (
          <p className="text-[11px] leading-snug text-slate-500">Chưa tìm thấy câu chứng cứ rõ cho mục này.</p>
        )}
      </div>
    );
  };

  const parseDateTimeAny = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    const normalized = trimmed
      .replace(',', '')
      .replace(/\s+/g, ' ')
      .trim();

    const match = normalized.match(
      /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:\s+(\d{1,2})(?::(\d{1,2}))?)?$/,
    );
    if (!match) return parseDateAny(trimmed);

    const day = Number(match[1]);
    const month = Number(match[2]);
    const y = Number(match[3]);
    const year = y < 100 ? y + 2000 : y;
    const hour = Number(match[4] ?? 0);
    const minute = Number(match[5] ?? 0);
    const dt = new Date(year, month - 1, day, hour, minute, 0);
    return Number.isNaN(dt.getTime()) ? null : dt;
  };

  const maybeAutoAge = (nextDob: string, nextRefDateText?: string) => {
    const dobDate = parseDateAny(nextDob);
    if (!dobDate) return '';
    const refDate =
      (nextRefDateText ? parseDateTimeAny(nextRefDateText) : null) ||
      parseDateTimeAny(soapView.header.exam_ended_at) ||
      parseDateTimeAny(soapView.header.datetime) ||
      new Date();
    return String(calculateAge(dobDate, refDate));
  };

  const updateHeaderField = (key: keyof SoapData['header'], value: string | boolean) => {
    setFormSoap((prev) => {
      const nextHeader = { ...prev.header, [key]: value };
      if (key === 'dob' && typeof value === 'string') {
        nextHeader.age = maybeAutoAge(value, prev.header.exam_ended_at || prev.header.datetime);
      }
      if (key === 'exam_ended_at' && typeof value === 'string' && prev.header.dob?.trim()) {
        nextHeader.age = maybeAutoAge(prev.header.dob, value);
      }
      return { ...prev, header: nextHeader };
    });
  };

  const updateSubjectiveField = (key: keyof SoapData['subjective'], value: string) => {
    setFormSoap((prev) => ({ ...prev, subjective: { ...prev.subjective, [key]: value } }));
  };

  const updateAssessmentField = (key: keyof SoapData['assessment'], value: string) => {
    setFormSoap((prev) => ({ ...prev, assessment: { ...prev.assessment, [key]: value } }));
  };

  const updatePlanField = (key: keyof SoapData['plan'], value: string) => {
    setFormSoap((prev) => ({ ...prev, plan: { ...prev.plan, [key]: value } }));
  };

  const medicationsToText = (meds: Medication[]) =>
    meds
      .map((m) => [m.name, m.dose, m.duration].map((x) => x.trim()).filter(Boolean).join(' - '))
      .filter(Boolean)
      .join('\n');

  const combinedHistoryText = useMemo(() => {
    const chunks = [];
    if (soapView.subjective.relevant_pmh.trim()) chunks.push(`Tiền sử: ${soapView.subjective.relevant_pmh.trim()}`);
    if (soapView.subjective.allergies.trim()) chunks.push(`Dị ứng: ${soapView.subjective.allergies.trim()}`);
    if (soapView.subjective.current_meds.trim()) chunks.push(`Thuốc đang dùng: ${soapView.subjective.current_meds.trim()}`);
    return chunks.join('\n');
  }, [soapView.subjective.relevant_pmh, soapView.subjective.allergies, soapView.subjective.current_meds]);

  const updateCombinedHistoryText = (text: string) => {
    const next = { relevant_pmh: '', allergies: '', current_meds: '' };
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) {
      setFormSoap((prev) => ({ ...prev, subjective: { ...prev.subjective, ...next } }));
      return;
    }

    const leftovers: string[] = [];
    for (const line of lines) {
      if (/^tiền\s*sử\s*:/i.test(line)) {
        next.relevant_pmh = line.replace(/^tiền\s*sử\s*:/i, '').trim();
      } else if (/^dị\s*ứng\s*:/i.test(line)) {
        next.allergies = line.replace(/^dị\s*ứng\s*:/i, '').trim();
      } else if (/^thuốc\s*đang\s*dùng\s*:/i.test(line)) {
        next.current_meds = line.replace(/^thuốc\s*đang\s*dùng\s*:/i, '').trim();
      } else {
        leftovers.push(line);
      }
    }

    if (leftovers.length && !next.relevant_pmh) {
      next.relevant_pmh = leftovers.join('; ');
    }

    setFormSoap((prev) => ({ ...prev, subjective: { ...prev.subjective, ...next } }));
  };

  const isHistorySection3Complete = Boolean(
    soapView.subjective.relevant_pmh.trim() &&
    soapView.subjective.allergies.trim() &&
    soapView.subjective.current_meds.trim(),
  );

  const buildNoteTextFromForm = (data: SoapData) => {
    const medsText = medicationsToText(data.plan.medications);
    const historyText = [
      data.subjective.relevant_pmh ? `Tiền sử: ${data.subjective.relevant_pmh}` : '',
      data.subjective.allergies ? `Dị ứng: ${data.subjective.allergies}` : '',
      data.subjective.current_meds ? `Thuốc đang dùng: ${data.subjective.current_meds}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    return [
      `Mã ca: ${data.header.encounter_id || 'Chưa rõ'}`,
      `Ngày giờ: ${data.header.datetime || 'Chưa rõ'}`,
      `Bệnh nhân: ${data.header.patient_name || 'Chưa rõ'} | CCCD/Mã BN: ${data.header.patient_identifier || 'Chưa rõ'} | Giới tính: ${data.header.sex || 'Chưa rõ'} | Tuổi: ${data.header.age || 'Chưa rõ'}`,
      `Mức ưu tiên: ${data.header.critical_flag ? 'CA NẶNG' : 'Thường'}`,
      '',
      'S - Subjective',
      `- Lý do khám: ${data.subjective.chief_complaint || 'Chưa rõ'}`,
      `- Bệnh sử/Diễn tiến: ${data.subjective.hpi_summary || 'Chưa rõ'}`,
      `- Tiền sử/Dị ứng/Thuốc: ${historyText || 'Chưa rõ'}`,
      '',
      'A - Assessment',
      `- Chẩn đoán chính: ${data.assessment.primary_diagnosis || 'Chưa rõ'}`,
      `- Chẩn đoán phân biệt: ${data.assessment.differential_diagnosis || 'Chưa rõ'}`,
      `- Mức độ nguy cơ: ${data.assessment.risk_level || 'Chưa rõ'}`,
      '',
      'P - Plan',
      `- Thuốc điều trị:\n${medsText || 'Chưa rõ'}`,
      `- Dặn dò: ${data.plan.instructions || 'Chưa rõ'}`,
      `- Tái khám: ${data.plan.follow_up || 'Chưa rõ'}`,
      `- Dấu hiệu cảnh báo: ${data.plan.red_flags || 'Chưa rõ'}`,
    ].join('\n');
  };

  const estimateDurationSec = (data: SoapData) => {
    const start = parseDateTimeAny(data.header.exam_started_at || '');
    const end = parseDateTimeAny(data.header.exam_ended_at || data.header.datetime || '');
    if (!start || !end) return recordingTime;
    return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
  };

  const normalizeTitlePart = (raw: string, fallback: string) => {
    const cleaned = (raw || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/_+/g, '_');
    return cleaned || fallback;
  };

  const normalizeHistoryKeyPart = (raw: string) =>
    (raw || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9]+/g, ' ')
      .trim()
      .toLowerCase();

  const buildHistoryKey = (input: {
    encounterId?: string;
    patientName?: string;
    patientIdentifier?: string;
    examDateTime?: string;
    examStartedAt?: string;
    examEndedAt?: string;
  }) => {
    const encounterPart = normalizeHistoryKeyPart(input.encounterId || '');
    if (encounterPart) return `enc:${encounterPart}`;

    const patientPart = normalizeHistoryKeyPart(input.patientName || '') || 'unknown_patient';
    const idPart = normalizeHistoryKeyPart(input.patientIdentifier || '') || 'unknown_id';
    const timePart =
      normalizeHistoryKeyPart(input.examStartedAt || input.examDateTime || input.examEndedAt || '') || 'unknown_time';
    return `sig:${patientPart}|${idPart}|${timePart}`;
  };

  const buildSheetTitle = (input: {
    patientName?: string;
    patientIdentifier?: string;
    disease?: string;
    chiefComplaint?: string;
  }) => {
    const patientPart = normalizeTitlePart(input.patientName || '', 'benh_nhan');
    const idPart = normalizeTitlePart(input.patientIdentifier || '', 'chua_ma');
    const diseaseSource = input.disease || input.chiefComplaint || 'benh';
    const diseasePart = normalizeTitlePart(diseaseSource, 'benh');
    return `${patientPart}_${idPart}_${diseasePart}`;
  };

  const buildHistoryItem = (data: SoapData, source: ExamHistoryItem['source']): ExamHistoryItem => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    historyKey: buildHistoryKey({
      encounterId: data.header.encounter_id,
      patientName: data.header.patient_name,
      patientIdentifier: data.header.patient_identifier,
      examDateTime: data.header.datetime,
      examStartedAt: data.header.exam_started_at,
      examEndedAt: data.header.exam_ended_at,
    }),
    source,
    savedAt: new Date().toISOString(),
    sheetTitle: buildSheetTitle({
      patientName: data.header.patient_name,
      patientIdentifier: data.header.patient_identifier,
      disease: data.assessment.primary_diagnosis,
      chiefComplaint: data.subjective.chief_complaint,
    }),
    encounterId: data.header.encounter_id || '',
    patientName: data.header.patient_name || '',
    patientIdentifier: data.header.patient_identifier || '',
    sex: data.header.sex || '',
    examDateTime: data.header.datetime || '',
    examStartedAt: data.header.exam_started_at || '',
    examEndedAt: data.header.exam_ended_at || '',
    durationSec: estimateDurationSec(data),
    chiefComplaint: data.subjective.chief_complaint || '',
    primaryDiagnosis: data.assessment.primary_diagnosis || '',
    riskLevel: data.assessment.risk_level || '',
    critical: Boolean(data.header.critical_flag),
  });

  const addToHistory = (data: SoapData, source: ExamHistoryItem['source']) => {
    const incoming = buildHistoryItem(data, source);
    setExamHistory((prev) => {
      const matchedIndex = prev.findIndex((item) => item.historyKey === incoming.historyKey);
      if (matchedIndex === -1) {
        return [incoming, ...prev].slice(0, 200);
      }

      const existing = prev[matchedIndex];
      const merged: ExamHistoryItem = {
        ...existing,
        ...incoming,
        id: existing.id,
        source: source === 'saved' || existing.source === 'saved' ? 'saved' : incoming.source,
        savedAt: new Date().toISOString(),
      };

      return [merged, ...prev.filter((_, index) => index !== matchedIndex)].slice(0, 200);
    });
  };

  const applyTemplate = () => {
    const nowText = new Date().toLocaleString('vi-VN');
    const template: SoapData = {
      ...emptySoap,
      mode,
      transcript: soapView.transcript,
      header: {
        ...emptySoap.header,
        encounter_id: 'MAU-DEMO-001',
        datetime: nowText,
        department: 'Lớp 12A6',
        doctor: 'Lee Việt Anh',
        patient_name: 'BỆNH NHÂN VÍ DỤ',
        patient_identifier: '000000000000',
        dob: '15/08/1988',
        age: '37',
        sex: 'Nam',
        exam_started_at: nowText,
        exam_ended_at: nowText,
        patient_info: 'Nguyễn Văn B - 37 tuổi',
        critical_flag: false,
      },
      subjective: {
        chief_complaint: 'Sốt, ho, mệt mỏi 2 ngày',
        hpi_summary: 'Bệnh nhân sốt nhẹ và ho khan, chưa dùng thuốc đặc hiệu.',
        onset: '2 ngày trước',
        progression: 'Tăng dần về chiều',
        aggravating_alleviating_factors: 'Đỡ khi nghỉ ngơi',
        allergies: 'Chưa ghi nhận',
        current_meds: 'Paracetamol 500mg',
        relevant_pmh: 'Không bệnh nền đáng chú ý',
      },
      assessment: {
        primary_diagnosis: 'Nhiễm siêu vi hô hấp trên',
        differential_diagnosis: 'Viêm phế quản cấp',
        risk_level: 'Thấp',
      },
      plan: {
        labs_imaging: 'Theo dõi, chưa cần CLS',
        medications: [
          { name: 'Paracetamol', dose: '500mg x 2 lần/ngày', duration: '3 ngày' },
          { name: 'Natri clorid 0.9%', dose: 'Rửa mũi 2-3 lần/ngày', duration: '5 ngày' },
        ],
        instructions: 'Uống nhiều nước, nghỉ ngơi, theo dõi sốt.',
        follow_up: 'Tái khám sau 2 ngày nếu không giảm',
        red_flags: 'Khó thở, sốt cao liên tục, lừ đừ',
      },
      note_text: '',
      missing_info_flags: [],
      uncertainty_flags: [],
      disclaimer: 'DỮ LIỆU MẪU: Không phải bệnh nhân thật. AI chỉ soạn nháp; bác sĩ xác nhận cuối.',
    };
    setShowSplitView(true);
    setResult(template);
    setFormSoap(template);
    setTemplateExampleNotice(true);
    setActivePage('exam');
  };

  const formatHistoryTime = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('vi-VN');
  };

  const formatHistoryDuration = (seconds: number) => {
    const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
    const ss = String(seconds % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const normalizedHistory = parsed.map((item: any) => {
          if (item && typeof item === 'object' && item.sheetTitle && item.historyKey) return item as ExamHistoryItem;
          return {
            ...item,
            sheetTitle: buildSheetTitle({
              patientName: item?.patientName,
              patientIdentifier: item?.patientIdentifier,
              disease: item?.primaryDiagnosis,
              chiefComplaint: item?.chiefComplaint,
            }),
            historyKey: buildHistoryKey({
              encounterId: item?.encounterId,
              patientName: item?.patientName,
              patientIdentifier: item?.patientIdentifier,
              examDateTime: item?.examDateTime,
              examStartedAt: item?.examStartedAt,
              examEndedAt: item?.examEndedAt,
            }),
          } as ExamHistoryItem;
        });
        setExamHistory(normalizedHistory);
      }
    } catch {
      // ignore corrupted history
    }
  }, [HISTORY_STORAGE_KEY]);

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(examHistory));
    } catch {
      // localStorage may be unavailable
    }
  }, [examHistory, HISTORY_STORAGE_KEY]);

  useEffect(() => {
    const resize = () => {
      const textareas = document.querySelectorAll<HTMLTextAreaElement>('textarea[data-autoresize="true"]');
      textareas.forEach((node) => {
        const minHeight = Number(node.dataset.minheight || 0);
        node.style.height = '0px';
        const nextHeight = Math.max(node.scrollHeight, minHeight);
        node.style.height = `${nextHeight}px`;
        node.style.overflowY = 'hidden';
      });
    };

    const frame = window.requestAnimationFrame(resize);
    return () => window.cancelAnimationFrame(frame);
  }, [formSoap, showSplitView, activePage, recordingAudience, result]);

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => setIntroFading(true), 850);
    const hideTimer = window.setTimeout(() => setShowClinicIntro(false), 1700);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  useEffect(() => {
    stopDemoVoice();
    setError(null);
    if (mode === 'dictation') {
      setRecordingAudience('doctor_patient');
      setExamFlowPage('doctor_patient');
      return;
    }
    setExamFlowPage('audience_picker');
  }, [mode]);

  useEffect(() => {
    if (!isRecording) return;
    if (result) return;
    const mergedTranscript = `${liveTranscript} ${interimTranscript}`.trim();
    if (!mergedTranscript) return;
    const timer = window.setTimeout(() => {
      applyDraftFromTranscript(mergedTranscript, { overwriteExisting: true });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [liveTranscript, interimTranscript, isRecording, result]);

  const startRecording = async () => {
    try {
      stopDemoVoice();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      setLiveTranscript('');
      setInterimTranscript('');
      liveTranscriptRef.current = '';
      interimTranscriptRef.current = '';
      setShowSplitView(true);
      isRecordingRef.current = true;

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'vi-VN';
        
        recognition.onresult = (event: any) => {
          let interim = '';
          let final = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              final += event.results[i][0].transcript + ' ';
            } else {
              interim += event.results[i][0].transcript;
            }
          }
          if (final) {
            setLiveTranscript(prev => {
              const next = prev + final;
              liveTranscriptRef.current = next;
              return next;
            });
          }
          interimTranscriptRef.current = interim;
          setInterimTranscript(interim);
        };
        
        recognition.onend = () => {
          if (isRecordingRef.current) {
            try { recognition.start(); } catch(e) {}
          }
        };
        
        recognitionRef.current = recognition;
        recognition.start();
      }

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `recording-${new Date().getTime()}.webm`, { type: 'audio/webm' });
        setFile(audioFile);
        setError(null);
        stream.getTracks().forEach(track => track.stop());
        handleGenerate(audioFile);
      };

      mediaRecorder.start();
      setIsRecording(true);
      const startMs = Date.now();
      recordingStartMsRef.current = startMs;
      setRecordingStartedAt(new Date(startMs));
      setRecordingEndedAt(null);
      setRecordingTime(0);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      timerRef.current = window.setInterval(() => {
        if (!recordingStartMsRef.current) return;
        const elapsed = Math.floor((Date.now() - recordingStartMsRef.current) / 1000);
        setRecordingTime(elapsed);
      }, 250);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setError("Không thể truy cập micro. Vui lòng cấp quyền cho trình duyệt.");
    }
  };

  const stopRecording = () => {
    const endMs = Date.now();
    setRecordingEndedAt(new Date(endMs));
    if (recordingStartMsRef.current) {
      const elapsed = Math.max(0, Math.floor((endMs - recordingStartMsRef.current) / 1000));
      setRecordingTime(elapsed);
    }
    recordingStartMsRef.current = null;
    isRecordingRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch(e) {}
    }
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setError(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isFileTooLarge = file ? file.size > 18 * 1024 * 1024 : false;
  const examDateForFooter =
    parseDateTimeAny(soapView.header.datetime || soapView.header.exam_ended_at || '') || new Date();

  const handleGenerate = async (fileToProcess?: File) => {
    const targetFile = fileToProcess instanceof File ? fileToProcess : file;
    if (!targetFile) {
      setError('Vui lòng chọn file audio.');
      return;
    }
    const isTooLarge = targetFile.size > 18 * 1024 * 1024;
    if (isTooLarge) {
      setError('File vượt quá 18MB. Vui lòng cắt ngắn audio.');
      return;
    }

    setLoading(true);
    setError(null);
    setShowSplitView(true);

    const formData = new FormData();
    const transcriptHint = `${liveTranscriptRef.current} ${interimTranscriptRef.current}`.trim();
    formData.append('audio', targetFile);
    formData.append('mode', mode);
    formData.append('recordingAudience', recordingAudience);
    formData.append('transcriptHint', transcriptHint);
    if (recordingStartedAt) formData.append('examStartedAt', asIsoString(recordingStartedAt));
    if (recordingEndedAt) formData.append('examEndedAt', asIsoString(recordingEndedAt));

    console.info('[process-audio] request payload', {
      audioName: targetFile.name,
      audioSize: targetFile.size,
      mode,
      recordingAudience,
      transcriptHintLength: transcriptHint.length,
    });

    if (targetFile.size === 0 && transcriptHint) {
      const localDraft = buildLocalSoapFromTranscript(transcriptHint);
      localDraft.uncertainty_flags = [
        ...localDraft.uncertainty_flags,
        'File audio rỗng; hệ thống đã parse trực tiếp từ live transcript.',
      ];
      setResult(localDraft);
      setFormSoap(localDraft);
      setTemplateExampleNotice(false);
      addToHistory(localDraft, 'generated');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/process-audio', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Lỗi khi xử lý audio');
      }

      const data: SoapData = await response.json();
      const dataWithTranscript =
        transcriptHint && isWeakTranscript(data.transcript)
          ? { ...data, transcript: transcriptHint }
          : data;
      let enriched = enrichSoapData(dataWithTranscript);
      if (transcriptHint) {
        const checklistAfterServer = evaluateChecklistAnswers(enriched, enriched.transcript || transcriptHint);
        const shouldHydrateHint =
          hasSparseStructuredData(dataWithTranscript) || !checklistAfterServer.qStatus.q1 || !checklistAfterServer.qStatus.q7;
        if (shouldHydrateHint) {
          const mergedTranscript = normalizeCapturedValue(`${enriched.transcript || ''} ${transcriptHint}`);
          enriched = hydrateSoapFromTranscript(enriched, mergedTranscript || transcriptHint, { overwriteExisting: true });
        }
      }
      setResult(enriched);
      setFormSoap(enriched);
      setTemplateExampleNotice(false);
      addToHistory(enriched, 'generated');
    } catch (err: any) {
      if (transcriptHint) {
        const localDraft = buildLocalSoapFromTranscript(transcriptHint);
        localDraft.uncertainty_flags = [
          ...localDraft.uncertainty_flags,
          'API xử lý audio lỗi; hệ thống đã fallback parse từ live transcript.',
        ];
        setResult(localDraft);
        setFormSoap(localDraft);
        setTemplateExampleNotice(false);
        addToHistory(localDraft, 'generated');
        setError(`API process-audio lỗi (${err.message || 'unknown'}), đã fallback parse từ transcript.`);
      } else {
        setError(err.message || 'Đã xảy ra lỗi không xác định.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(buildNoteTextFromForm(formSoap));
      alert('Đã copy ghi chú!');
    }
  };

  const handleDownloadJson = () => {
    if (!result) return;

    const sheetTitle = buildSheetTitle({
      patientName: formSoap.header.patient_name,
      patientIdentifier: formSoap.header.patient_identifier,
      disease: formSoap.assessment.primary_diagnosis,
      chiefComplaint: formSoap.subjective.chief_complaint,
    });

    const payload = {
      soap: formSoap,
      sheet_title: sheetTitle,
      note_text_generated: buildNoteTextFromForm(formSoap),
      missing_fields_auto: missingRequired.map((item) => item.label),
      history_snapshot: examHistory,
      saved_at: new Date().toISOString(),
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${sheetTitle}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    addToHistory(formSoap, 'saved');
  };

  const handlePrintSheet = () => window.print();

  const handleReset = () => {
    stopDemoVoice();
    setFile(null);
    setResult(null);
    setFormSoap(emptySoap);
    setError(null);
    setIsRecording(false);
    setRecordingTime(0);
    setRecordingStartedAt(null);
    setRecordingEndedAt(null);
    setTemplateExampleNotice(false);
    setLiveTranscript('');
    setInterimTranscript('');
    setMode('in_room');
    setRecordingAudience('doctor_patient');
    setExamFlowPage('audience_picker');
    setSelectedDemoCaseId('case_1');
    setSelectedPatientDemoCaseId('patient_case_1');
    setSelectedDictationDemoCaseId('dictation_case_1');
    setPlayingDemoCaseId(null);
    setShowSplitView(false);
    recordingStartMsRef.current = null;
    isRecordingRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch(e) {}
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const todayPrefix = new Date().toISOString().slice(0, 10);
  const historyToday = examHistory.filter((item) => item.savedAt.startsWith(todayPrefix));
  const criticalToday = historyToday.filter((item) => item.critical).length;
  const latestHistory = examHistory.slice(0, 8);
  const workflowStatus: 'done' | 'recording' | 'processing' | 'draft' = result
    ? 'done'
    : isRecording
      ? 'recording'
      : loading
        ? 'processing'
        : 'draft';
  const facebookProfileUrl = 'https://www.facebook.com/vietanh.lee.98892';
  const creatorPhotoUrl = creatorPhoto;
  const isDictationFlow = mode === 'dictation';
  const isPatientOnlyFlow = !isDictationFlow && recordingAudience === 'patient_only';
  const isDoctorPatientFlow = recordingAudience === 'doctor_patient';
  const activeVoiceCases = isDictationFlow
    ? dictationDemoVoiceCases
    : isDoctorPatientFlow
      ? demoVoiceCases
      : patientDemoVoiceCases;
  const activeSelectedVoiceCase = isDictationFlow
    ? selectedDictationDemoCase
    : isDoctorPatientFlow
      ? selectedDemoCase
      : selectedPatientDemoCase;
  const playingVoiceCase = [...demoVoiceCases, ...patientDemoVoiceCases, ...dictationDemoVoiceCases].find(
    (item) => item.id === playingDemoCaseId,
  );
  const isAnyVoicePlaying = Boolean(playingDemoCaseId);
  const isVoicePlayingActive = isAnyVoicePlaying && !isVoicePaused;
  const isVoicePanelVisible = (isDictationFlow || examFlowPage !== 'audience_picker') && Boolean(activeSelectedVoiceCase);
  const isSelectedVoicePlaying = Boolean(
    activeSelectedVoiceCase && playingDemoCaseId === activeSelectedVoiceCase.id && !isVoicePaused,
  );
  const isSelectedVoicePaused = Boolean(
    activeSelectedVoiceCase && playingDemoCaseId === activeSelectedVoiceCase.id && isVoicePaused,
  );
  const recordingSourceLabel = isDictationFlow
    ? 'Bác sĩ đọc lại'
    : recordingAudience === 'patient_only'
      ? 'Bệnh nhân tự giới thiệu'
      : 'Bác sĩ + bệnh nhân';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {showClinicIntro && (
        <div
          className={`fixed inset-0 z-[999] bg-gradient-to-br from-indigo-700 via-indigo-600 to-blue-600 flex items-center justify-center text-white pointer-events-none transition-opacity duration-700 ${
            introFading ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <div className={`text-center transition-transform duration-700 ${introFading ? 'scale-[1.03]' : 'scale-100'}`}>
            <p className="text-sm uppercase tracking-[0.3em] opacity-90">Hệ thống khám bệnh</p>
            <h1 className="mt-3 text-4xl md:text-5xl font-black tracking-tight">PHÒNG KHÁM ĐA KHOA MEDNOTE</h1>
            <p className="mt-4 text-sm opacity-90">Khởi tạo hồ sơ khám...</p>
          </div>
        </div>
      )}

      <div className="pointer-events-none fixed bottom-4 right-4 z-40 max-w-[min(92vw,460px)]">
        <div className="flex items-center gap-3 rounded-2xl border border-red-300 bg-red-50/95 px-3 py-2 shadow-lg backdrop-blur-sm">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-600 text-white shadow">
            <TriangleAlert className="h-5 w-5" />
          </span>
          <p className="text-xs font-semibold leading-snug text-red-700 sm:text-sm">
            app chủ yếu ghi chú thông tin còn chẩn đoán thì để bác sĩ
          </p>
        </div>
      </div>

      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-[1880px] mx-auto px-4 md:px-6 xl:px-8 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-indigo-600 min-w-[230px]">
            <FileAudio className="w-6 h-6" />
            <h1 className="text-xl font-semibold tracking-tight">MedNote-SOAP <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full ml-2 align-middle">Demo</span></h1>
          </div>

          <div className="flex items-center gap-2">
            {[
              { id: 'exam' as MainPage, icon: ClipboardList, label: 'Trang khám chính' },
              { id: 'history' as MainPage, icon: History, label: 'Lịch sử khám' },
              { id: 'template' as MainPage, icon: LayoutTemplate, label: 'Giấy mẫu khám bệnh' },
              { id: 'creator_info' as MainPage, icon: CircleUserRound, label: 'Thông tin người làm' },
            ].map((item) => {
              const Icon = item.icon;
              const active = activePage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActivePage(item.id)}
                  className={`group relative inline-flex items-center justify-center rounded-xl px-3 py-2 ring-1 ring-inset transition-all ${
                    active
                      ? 'bg-indigo-50 text-indigo-700 ring-indigo-300'
                      : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="pointer-events-none absolute top-full mt-2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="text-sm text-slate-500 font-medium hidden md:block">
            AI Clinical Assistant
          </div>
        </div>
      </header>

      <main className="max-w-[1880px] mx-auto px-4 md:px-6 xl:px-8 py-8">
        {activePage === 'exam' && (
          <div className="w-full">
            {templateExampleNotice && (
              <div className="mb-5 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-center gap-2 text-center">
                <CircleAlert className="w-4 h-4 flex-shrink-0" />
                <p className="font-semibold">
                  Bạn đang xem <span className="font-semibold">DỮ LIỆU MẪU (ví dụ)</span>, không phải bệnh nhân thật.
                  Hãy thay dữ liệu thật trước khi lưu hoặc in.
                </p>
              </div>
            )}
            {!showSplitView ? (
          <div className="max-w-5xl mx-auto space-y-8">
            {/* Mode Selection */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-medium mb-4">1. Chọn chế độ ghi âm</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className={`relative flex cursor-pointer rounded-xl border p-4 focus:outline-none ${mode === 'in_room' ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="radio" name="mode" value="in_room" className="sr-only" checked={mode === 'in_room'} onChange={() => setMode('in_room')} />
                  <span className="flex flex-1">
                    <span className="flex flex-col">
                      <span className="block text-sm font-medium text-slate-900">In-room conversation</span>
                      <span className="mt-1 flex items-center text-sm text-slate-500">Phòng khám ồn, nhiều người nói</span>
                    </span>
                  </span>
                  <CircleCheck className={`h-5 w-5 ${mode === 'in_room' ? 'text-indigo-600' : 'text-transparent'}`} />
                </label>

                <label className={`relative flex cursor-pointer rounded-xl border p-4 focus:outline-none ${mode === 'dictation' ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="radio" name="mode" value="dictation" className="sr-only" checked={mode === 'dictation'} onChange={() => setMode('dictation')} />
                  <span className="flex flex-1">
                    <span className="flex flex-col">
                      <span className="block text-sm font-medium text-slate-900">Dictation after visit</span>
                      <span className="mt-1 flex items-center text-sm text-slate-500">Bác sĩ đọc lại sau khám</span>
                    </span>
                  </span>
                  <CircleCheck className={`h-5 w-5 ${mode === 'dictation' ? 'text-indigo-600' : 'text-transparent'}`} />
                </label>
              </div>
            </section>

            {/* Audio Input */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-medium mb-4">2. Ghi âm hoặc Tải lên Audio</h2>
              {mode === 'in_room' && examFlowPage === 'audience_picker' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => openAudiencePage('doctor_patient')}
                    className="text-left rounded-xl border border-indigo-300 bg-indigo-50 px-4 py-4 text-indigo-800 transition-colors hover:bg-indigo-100"
                  >
                    <p className="text-sm font-semibold">Ghi âm bác sĩ + bệnh nhân</p>
                    <p className="text-xs mt-1 opacity-90">Vào trang riêng cho hội thoại trong phòng khám.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => openAudiencePage('patient_only')}
                    className="text-left rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-4 text-emerald-800 transition-colors hover:bg-emerald-100"
                  >
                    <p className="text-sm font-semibold">Ghi âm bệnh nhân tự giới thiệu</p>
                    <p className="text-xs mt-1 opacity-90">Vào trang riêng cho bệnh nhân tự kể triệu chứng.</p>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div
                    className={`rounded-xl border px-4 py-3 flex flex-wrap items-center justify-between gap-3 ${
                      isPatientOnlyFlow
                        ? 'border-emerald-300 bg-emerald-50'
                        : 'border-indigo-300 bg-indigo-50'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {isDictationFlow
                          ? 'Trang: Ghi âm bác sĩ đọc lại'
                          : isPatientOnlyFlow
                            ? 'Trang: Ghi âm bệnh nhân tự giới thiệu'
                            : 'Trang: Ghi âm bác sĩ + bệnh nhân'}
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {isDictationFlow
                          ? 'Chế độ bác sĩ đọc lại: ghi âm voice bác sĩ hoặc tải file voice.'
                          : 'Có đầy đủ 2 lựa chọn: bắt đầu ghi âm hoặc tải file âm thanh.'}
                      </p>
                    </div>
                    {!isDictationFlow && (
                      <button
                        type="button"
                        onClick={backToAudiencePicker}
                        disabled={isRecording}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        <ArrowLeft className="w-4 h-4" /> Quay lại chọn nguồn ghi âm
                      </button>
                    )}
                  </div>

                  {isPatientOnlyFlow && (
                    <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                      <p className="font-semibold">Gợi ý cho bệnh nhân khi ghi âm:</p>
                      <p className="mt-1 text-xs text-emerald-800">
                        Hãy nói rõ: họ tên, năm sinh, triệu chứng chính, mức độ hiện tại, thuốc đang dùng, tiền sử
                        bệnh nền/dị ứng thuốc.
                      </p>
                    </div>
                  )}

                  <div className="mt-2 grid grid-cols-1 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] gap-4">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Record Option */}
                        <div className={`flex flex-col items-center justify-center rounded-xl border ${isRecording ? 'border-red-500 bg-red-50' : 'border-slate-200 hover:border-slate-300'} p-6 transition-colors`}>
                          {isRecording ? (
                            <>
                              <div className="text-red-500 animate-pulse mb-3">
                                <Mic className="w-10 h-10" />
                              </div>
                              <div className="text-2xl font-mono text-red-600 font-medium mb-4">{formatTime(recordingTime)}</div>
                              <p className="text-xs font-semibold text-slate-700 mb-3 text-center">
                                {isDictationFlow
                                  ? 'Đang ghi âm: Bác sĩ đọc lại'
                                  : isPatientOnlyFlow
                                    ? 'Đang ghi âm: Bệnh nhân tự giới thiệu'
                                    : 'Đang ghi âm: Bác sĩ + bệnh nhân'}
                              </p>
                              <div className="w-full text-xs text-slate-600 mb-4 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span>Bắt đầu:</span>
                                  <span className="font-medium">{formatDateTime(recordingStartedAt)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span>Kết thúc:</span>
                                  <span className="font-medium">Đang ghi âm...</span>
                                </div>
                              </div>
                              <button onClick={stopRecording} className="flex items-center justify-center gap-2 bg-red-100 text-red-700 px-5 py-2.5 rounded-lg font-medium hover:bg-red-200 w-full transition-colors">
                                <Square className="w-4 h-4" fill="currentColor" /> Dừng ghi âm
                              </button>
                            </>
                          ) : (
                            <>
                              <div className="text-slate-400 mb-3">
                                <Mic className="w-10 h-10" />
                              </div>
                              <div className="text-sm text-slate-600 mb-2 text-center">
                                {isDictationFlow
                                  ? 'Ghi âm bác sĩ đọc lại sau khám'
                                  : isPatientOnlyFlow
                                    ? 'Ghi âm bệnh nhân tự kể triệu chứng'
                                    : 'Ghi âm trực tiếp bác sĩ và bệnh nhân'}
                              </div>
                              <div className="text-xs text-slate-500 mb-4 text-center">
                                {isDictationFlow
                                  ? 'Chỉ cần giọng bác sĩ, đọc rõ thông tin chính và kế hoạch.'
                                  : isPatientOnlyFlow
                                    ? 'Khuyến khích bệnh nhân nói chậm, rõ từng ý.'
                                    : 'Có thể thu cả hội thoại trong phòng khám.'}
                              </div>
                              <button onClick={startRecording} className="flex items-center justify-center gap-2 bg-indigo-50 text-indigo-700 px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-100 w-full transition-colors border border-indigo-200">
                                <Mic className="w-4 h-4" /> Bắt đầu ghi âm
                              </button>
                            </>
                          )}
                        </div>

                        {/* Upload Option */}
                        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 p-6 hover:bg-slate-50 transition-colors">
                          <Upload className="text-slate-400 w-10 h-10 mb-3" aria-hidden="true" />
                          <div className="text-sm text-slate-600 mb-4 text-center">Tải lên file có sẵn (MP3, WAV, M4A)</div>
                          <label htmlFor="file-upload" className="flex items-center justify-center gap-2 bg-white text-slate-700 px-5 py-2.5 rounded-lg font-medium hover:bg-slate-50 w-full transition-colors border border-slate-300 cursor-pointer shadow-sm">
                            <Upload className="w-4 h-4" /> Chọn file
                            <input id="file-upload" name="file-upload" type="file" accept="audio/mp3,audio/wav,audio/m4a,audio/webm,audio/*" className="sr-only" ref={fileInputRef} onChange={handleFileChange} />
                          </label>
                        </div>
                      </div>

                      {file && (
                        <div className={`p-4 rounded-lg flex items-center justify-between ${isFileTooLarge ? 'bg-red-50 border border-red-200' : 'bg-slate-50 border border-slate-200'}`}>
                          <div className="flex items-center gap-3 overflow-hidden">
                            <FileAudio className={`w-5 h-5 flex-shrink-0 ${isFileTooLarge ? 'text-red-500' : 'text-slate-500'}`} />
                            <span className="text-sm font-medium truncate" title={file.name}>{file.name}</span>
                          </div>
                          <span className={`text-xs font-medium whitespace-nowrap ml-4 ${isFileTooLarge ? 'text-red-600' : 'text-slate-500'}`}>
                            {formatFileSize(file.size)}
                          </span>
                        </div>
                      )}
                      {isFileTooLarge && (
                        <p className="text-sm text-red-600 flex items-center gap-1">
                          <CircleAlert className="w-4 h-4" /> File vượt quá 18MB. Vui lòng cắt ngắn audio.
                        </p>
                      )}

                      {(recordingStartedAt || recordingEndedAt) && (
                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                          <div className="flex items-center justify-between">
                            <span>Bắt đầu ghi âm</span>
                            <span className="font-medium">{formatDateTime(recordingStartedAt)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Kết thúc ghi âm</span>
                            <span className="font-medium">{isRecording ? 'Đang ghi âm...' : formatDateTime(recordingEndedAt)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Thời lượng</span>
                            <span className="font-medium">{formatTime(recordingTime)}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {isVoicePanelVisible && (
                      <aside
                        className={`rounded-xl border p-4 space-y-3 ${
                          isPatientOnlyFlow ? 'border-emerald-200 bg-emerald-50/60' : 'border-indigo-200 bg-indigo-50/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {isDictationFlow
                                ? 'Voice mô phỏng bác sĩ đọc lại'
                                : isDoctorPatientFlow
                                  ? 'Voice mô phỏng'
                                  : 'Voice mẫu bệnh nhân tự khai'}
                            </p>
                            <p className="text-xs text-slate-600">
                              {isDictationFlow
                                ? '3 ca bác sĩ đọc lại mẫu để nghe thử và tự điền nhanh.'
                                : isDoctorPatientFlow
                                  ? '3 ca hội thoại mẫu để nghe thử và tự điền nhanh.'
                                  : '3 ca trả lời đúng thứ tự 7 câu bắt buộc.'}
                            </p>
                          </div>
                          <Volume2 className={`w-4 h-4 mt-0.5 ${isPatientOnlyFlow ? 'text-emerald-600' : 'text-indigo-600'}`} />
                        </div>

                        <div className="space-y-2">
                          {activeVoiceCases.map((voiceCase) => {
                            const active = activeSelectedVoiceCase?.id === voiceCase.id;
                            return (
                              <button
                                key={voiceCase.id}
                                type="button"
                                onClick={() =>
                                  isDictationFlow
                                    ? setSelectedDictationDemoCaseId(voiceCase.id)
                                    : isDoctorPatientFlow
                                    ? setSelectedDemoCaseId(voiceCase.id)
                                    : setSelectedPatientDemoCaseId(voiceCase.id)
                                }
                                className={`w-full text-left rounded-lg border px-3 py-2 transition-colors ${
                                  active
                                    ? isPatientOnlyFlow
                                      ? 'border-emerald-300 bg-emerald-100 text-emerald-900'
                                      : 'border-indigo-300 bg-indigo-100 text-indigo-900'
                                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <p className="text-xs font-semibold">{voiceCase.title} - {voiceCase.subtitle}</p>
                                <p className="text-[11px] mt-0.5 opacity-80">{voiceCase.riskLabel}</p>
                              </button>
                            );
                          })}
                        </div>

                        {activeSelectedVoiceCase && (
                          <div
                            className={`rounded-lg border bg-white p-3 space-y-2 ${
                              isPatientOnlyFlow ? 'border-emerald-200' : 'border-indigo-200'
                            }`}
                          >
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => playDemoVoice(activeSelectedVoiceCase)}
                                className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                <Play className="w-3.5 h-3.5" /> {isSelectedVoicePaused ? 'Tiếp tục voice' : isSelectedVoicePlaying ? 'Đang phát...' : 'Nghe voice'}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  isDictationFlow
                                    ? applyDictationDemoVoiceCase(activeSelectedVoiceCase)
                                    : isDoctorPatientFlow
                                      ? applyDemoVoiceCase(activeSelectedVoiceCase)
                                      : applyPatientDemoVoiceCase(activeSelectedVoiceCase)
                                }
                                className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold text-white ${
                                  isPatientOnlyFlow ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-indigo-600 hover:bg-indigo-500'
                                }`}
                              >
                                <ClipboardList className="w-3.5 h-3.5" /> Tự động điền ca này
                              </button>
                            </div>

                            <div
                              className={`rounded-md border px-2.5 py-2 ${
                                isPatientOnlyFlow ? 'border-emerald-200 bg-emerald-50' : 'border-indigo-200 bg-indigo-50/60'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    className={`inline-flex h-8 w-8 items-center justify-center rounded-full border ${
                                      isAnyVoicePlaying
                                        ? isPatientOnlyFlow
                                          ? 'border-emerald-300 bg-emerald-100'
                                          : 'border-indigo-300 bg-indigo-100'
                                        : 'border-slate-300 bg-white'
                                    }`}
                                  >
                                    <Disc3
                                      className={`w-4 h-4 ${
                                        isVoicePlayingActive
                                          ? isPatientOnlyFlow
                                            ? 'animate-spin text-emerald-700'
                                            : 'animate-spin text-indigo-700'
                                          : 'text-slate-400'
                                      }`}
                                    />
                                  </span>
                                  <div className="min-w-0">
                                    <p className="text-[11px] font-semibold text-slate-700 truncate">
                                      {isAnyVoicePlaying
                                        ? isVoicePaused
                                          ? `Đã dừng tạm: ${playingVoiceCase?.title || 'Voice mô phỏng'}`
                                          : `Đang phát: ${playingVoiceCase?.title || 'Voice mô phỏng'}`
                                        : 'Chưa phát voice'}
                                    </p>
                                    <p className="text-[10px] text-slate-500">
                                      {isAnyVoicePlaying
                                        ? isVoicePaused
                                          ? 'Bấm Tiếp tục để nghe tiếp từ đoạn đang dừng.'
                                          : 'Có thể dừng tạm bất kỳ lúc nào.'
                                        : 'Bấm Nghe voice để bắt đầu.'}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={toggleDemoVoicePause}
                                  disabled={!isAnyVoicePlaying}
                                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                >
                                  {isVoicePaused ? (
                                    <>
                                      <Play className="w-3.5 h-3.5" /> Tiếp tục
                                    </>
                                  ) : (
                                    <>
                                      <Square className="w-3.5 h-3.5" fill="currentColor" /> Dừng tạm
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>

                            <div
                              className={`rounded-md border p-2 max-h-56 overflow-auto ${
                                isPatientOnlyFlow ? 'border-emerald-200 bg-emerald-50' : 'border-indigo-200 bg-indigo-50/60'
                              }`}
                            >
                              <p className={`text-[10px] font-semibold uppercase tracking-wide mb-1 ${
                                isPatientOnlyFlow ? 'text-emerald-700' : 'text-indigo-700'
                              }`}>
                                {isDictationFlow
                                  ? 'Transcript (dictation bác sĩ)'
                                  : isDoctorPatientFlow
                                    ? 'Transcript (translate từ voice)'
                                    : 'Transcript (7 câu bắt buộc)'}
                              </p>
                              <p className="text-[11px] whitespace-pre-line text-slate-700 leading-relaxed">
                                {activeSelectedVoiceCase.transcript}
                              </p>
                            </div>
                          </div>
                        )}
                      </aside>
                    )}
                  </div>

                </div>
              )}
            </section>

            {error && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
                <CircleAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Lỗi xử lý</p>
                  <p>{error}</p>
                </div>
              </div>
            )}

            {(isDictationFlow || examFlowPage !== 'audience_picker') && (
              <div className="pt-4">
                <button
                  onClick={handleGenerate}
                  disabled={!file || isFileTooLarge || loading}
                  className="w-full flex justify-center items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? (
                    <>
                      <LoaderCircle className="w-5 h-5 animate-spin" />
                      Đang xử lý bằng AI...
                    </>
                  ) : (
                    'Generate SOAP'
                  )}
                </button>
                <p className="text-center text-xs text-slate-500 mt-4 flex items-center justify-center gap-1">
                  <CircleAlert className="w-3.5 h-3.5" /> AI chỉ soạn nháp; bác sĩ xác nhận cuối.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Action Bar */}
            <div className="no-print flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200 sticky top-20 z-30">
              <div className="flex items-center gap-2">
                {workflowStatus === 'done' ? (
                  <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                    Hoàn thành
                  </span>
                ) : workflowStatus === 'recording' ? (
                  <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20 animate-pulse">
                    Đang ghi âm
                  </span>
                ) : workflowStatus === 'processing' ? (
                  <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
                    Đang xử lý AI
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-300">
                    Nháp từ live transcript
                  </span>
                )}
                <span className="text-sm text-slate-500">
                  Chế độ: {mode === 'in_room' ? 'In-room' : 'Dictation'} | Nguồn ghi âm: {recordingSourceLabel}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateHeaderField('critical_flag', !soapView.header.critical_flag)}
                  disabled={!showSplitView}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold shadow-sm ring-1 ring-inset disabled:opacity-50 ${
                    soapView.header.critical_flag
                      ? 'bg-red-100 text-red-700 ring-red-300 hover:bg-red-200'
                      : 'bg-white text-slate-900 ring-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <TriangleAlert className="w-4 h-4" />
                  {soapView.header.critical_flag ? 'Ca nặng' : 'Đánh dấu ca nặng'}
                </button>
                {(mode === 'dictation' || recordingAudience === 'patient_only') && !result && (
                  <button
                    type="button"
                    onClick={() => applyDraftFromTranscript(undefined, { overwriteExisting: true })}
                    disabled={!`${liveTranscript} ${interimTranscript}`.trim()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
                  >
                    <ClipboardList className="w-4 h-4" /> Tự điền từ transcript
                  </button>
                )}
                <button onClick={handleCopy} disabled={!result} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:opacity-50">
                  <Copy className="w-4 h-4 text-slate-500" /> Copy Note
                </button>
                <button onClick={handleDownloadJson} disabled={!result} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:opacity-50">
                  <Download className="w-4 h-4 text-slate-500" /> Lưu phiếu khám
                </button>
                <button onClick={handlePrintSheet} disabled={!result} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:opacity-50">
                  <Download className="w-4 h-4 text-slate-500" /> In / PDF
                </button>
                <button onClick={handleReset} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">
                  <RefreshCw className="w-4 h-4" /> Làm mới
                </button>
              </div>
            </div>

            {/* Warnings */}
            {showSplitView && (soapView.missing_info_flags.length > 0 || soapView.uncertainty_flags.length > 0) && (
              <div className="no-print bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-amber-800 flex items-center gap-1.5 mb-2">
                  <CircleAlert className="w-4 h-4" /> Cần lưu ý
                </h3>
                <ul className="list-disc list-inside text-sm text-amber-700 space-y-1">
                  {soapView.missing_info_flags.map((flag, i) => <li key={`m-${i}`}>{flag}</li>)}
                  {soapView.uncertainty_flags.map((flag, i) => <li key={`u-${i}`}>{flag}</li>)}
                </ul>
              </div>
            )}

            {showSplitView && recordingAudience === 'patient_only' && (
              <div className="no-print bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-slate-800 mb-1">Cách trả lời</h3>
                <p className="text-xs text-slate-700">
                  Đọc câu hỏi trước, sau đó đọc câu trả lời tương ứng theo đúng thứ tự 1 đến 7.
                </p>
              </div>
            )}

            {showSplitView && missingRequired.length > 0 && (
              <div className="no-print bg-red-50 border border-red-200 rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-red-700 flex items-center gap-1.5 mb-3">
                  <CircleAlert className="w-4 h-4" /> Mục còn thiếu, cần hỏi thêm
                </h3>
                <p className="mb-3 text-xs font-medium text-red-600">
                  AI đã tự điền từ voice. Nếu mục nào AI chưa nghe rõ, bệnh nhân chỉ cần nhập bổ sung đúng mục đó.
                </p>
                <div className="space-y-3">
                  {missingRequired.map((item) => (
                    <div key={item.key} className="rounded-lg border border-red-300 bg-white p-3">
                      <div className="text-sm font-medium text-red-700 mb-2">{item.label}</div>
                      {item.inputType === 'sex' ? (
                        <select
                          value={item.value}
                          onChange={(e) => updateMissingField(item.key, e.target.value)}
                          className="block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-red-300 focus:ring-2 focus:ring-inset focus:ring-red-500 sm:text-sm sm:leading-6 px-3"
                        >
                          <option value="">Chọn giới tính</option>
                          <option value="Nam">Nam</option>
                          <option value="Nữ">Nữ</option>
                          <option value="Khác">Khác</option>
                        </select>
                      ) : item.inputType === 'textarea' ? (
                        <textarea
                          data-autoresize="true"
                          data-minheight="74"
                          placeholder="Nhập thông tin bổ sung..."
                          value={item.value}
                          onChange={(e) => updateMissingField(item.key, e.target.value)}
                          rows={2}
                          className="block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-red-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-red-500 sm:text-sm sm:leading-6 px-3 resize-none overflow-hidden"
                        />
                      ) : (
                        <input
                          type="text"
                          placeholder={item.key === 'header.dob' ? 'DD/MM/YYYY' : 'Nhập thông tin bổ sung...'}
                          value={item.value}
                          onChange={(e) => updateMissingField(item.key, e.target.value)}
                          className="block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-red-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-red-500 sm:text-sm sm:leading-6 px-3"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={`grid grid-cols-1 gap-6 ${recordingAudience === 'patient_only' ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
              {recordingAudience === 'patient_only' && (
                <div className="no-print lg:col-span-1">
                  <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-full">
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80">
                      <h3 className="text-sm font-semibold text-slate-900">Câu hỏi cho bệnh nhân (bắt buộc)</h3>
                      <p className="mt-1 text-[11px] font-semibold text-red-600">
                        Bệnh nhân phải trả lời đủ từng câu theo thứ tự.
                      </p>
                    </div>
                    <div className="p-4 space-y-3">
                      <p className="text-xs text-slate-500">
                        Đã tích: <span className="font-semibold text-slate-700">{completedPatientChecklist}/{patientVoiceQuestions.length}</span>
                      </p>
                      {patientChecklistStatus.map((item, idx) => (
                        <label
                          key={item.id}
                          className={`flex items-start gap-2 rounded-lg border px-3 py-2 ${
                            item.done ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(item.done)}
                            readOnly
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-xs text-slate-700">
                            <span className="font-semibold">{idx + 1}.</span> {item.text}
                          </span>
                        </label>
                      ))}
                    </div>
                  </section>
                </div>
              )}

              {/* Transcript Column */}
              <div className="no-print lg:col-span-1 space-y-6">
                {isRecording && (
                  <section className="bg-white rounded-2xl shadow-sm border border-red-200 overflow-hidden p-6 text-center">
                    <div className="text-red-500 animate-pulse mb-3 flex justify-center">
                      <Mic className="w-12 h-12" />
                    </div>
                    <div className="text-3xl font-mono text-red-600 font-medium mb-4">{formatTime(recordingTime)}</div>
                    <div className="text-xs text-slate-600 mb-4 space-y-1">
                      <div className="flex items-center justify-between gap-4">
                        <span>Bắt đầu:</span>
                        <span className="font-medium">{formatDateTime(recordingStartedAt)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span>Kết thúc:</span>
                        <span className="font-medium">Đang ghi âm...</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-sm text-slate-500 mb-6">
                      <Activity className="w-4 h-4 animate-pulse" /> Đang ghi âm và nhận diện giọng nói...
                    </div>
                    <button onClick={stopRecording} className="flex items-center justify-center gap-2 bg-red-100 text-red-700 px-6 py-3 rounded-xl font-bold hover:bg-red-200 w-full transition-colors">
                      <Square className="w-5 h-5" fill="currentColor" /> Dừng & Xử lý SOAP
                    </button>
                  </section>
                )}

                {loading && !isRecording && (
                  <section className="bg-white rounded-2xl shadow-sm border border-indigo-200 overflow-hidden p-6 text-center">
                    <div className="text-indigo-500 mb-3 flex justify-center">
                      <LoaderCircle className="w-12 h-12 animate-spin" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">AI đang phân tích</h3>
                    <p className="text-sm text-slate-500">Đang trích xuất thông tin y khoa và điền vào mẫu SOAP...</p>
                  </section>
                )}

                <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[400px]">
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {result ? 'Transcript (Đã xử lý)' : 'Live Transcript (Tạm thời)'}
                    </h3>
                  </div>
                  <div className="flex-1 w-full p-4 text-sm text-slate-700 overflow-y-auto bg-slate-50">
                    {result ? (
                      <textarea
                        className="w-full h-full bg-transparent resize-none focus:outline-none"
                        value={soapView.transcript}
                        onChange={(e) => setFormSoap((prev) => ({ ...prev, transcript: e.target.value }))}
                      />
                    ) : (
                      <div className="whitespace-pre-wrap">
                        {liveTranscript}
                        <span className="text-slate-400 italic">{interimTranscript}</span>
                      </div>
                    )}
                  </div>
                </section>

              </div>

              {/* Right Column: Structured SOAP Form */}
              <div className={`relative ${recordingAudience === 'patient_only' ? 'lg:col-span-2 print:col-span-4' : 'lg:col-span-2 print:col-span-3'}`}>
                {loading && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-20 flex items-center justify-center rounded-2xl">
                    <div className="bg-white p-4 rounded-xl shadow-lg flex items-center gap-3 text-indigo-600 font-medium">
                      <LoaderCircle className="w-5 h-5 animate-spin" /> Đang điền dữ liệu...
                    </div>
                  </div>
                )}
                <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-slate-300" key={result ? 'filled' : 'empty'}>
                  <div className="p-6 md:p-8 bg-[radial-gradient(#e8edf7_1px,transparent_1px)] bg-[length:16px_16px]">
                    <div className="flex items-start justify-between gap-6 border-b border-slate-300 pb-4">
                      <div>
                        <h3 className="text-2xl font-extrabold tracking-tight text-slate-800">THPT FPT</h3>
                        <p className="text-xs text-slate-500 mt-1">Phòng khám: Lớp 12A6</p>
                      </div>
                      <div className="text-right min-w-[260px]">
                        <div className="flex items-center justify-end gap-2">
                          {soapView.header.critical_flag && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-[10px] font-bold text-red-700">
                              <TriangleAlert className="w-3 h-3" /> CA NẶNG
                            </span>
                          )}
                          <div className="text-lg font-extrabold text-indigo-700">PHIẾU KHÁM BỆNH</div>
                        </div>
                        <div className="mt-2 space-y-1 text-xs text-slate-700">
                          <div className="flex justify-between gap-3">
                            <span className="font-semibold">Mã ca khám:</span>
                            <input
                              type="text"
                              value={soapView.header.encounter_id}
                              onChange={(e) => updateHeaderField('encounter_id', e.target.value)}
                              className={`${fieldClass('header.encounter_id')} h-7 max-w-[160px] text-xs`}
                            />
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="font-semibold">Ngày khám:</span>
                            <input
                              type="text"
                              value={soapView.header.datetime}
                              onChange={(e) => updateHeaderField('datetime', e.target.value)}
                              className={`${fieldClass('header.datetime')} h-7 max-w-[160px] text-xs`}
                            />
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="font-semibold">Khoa/Phòng:</span>
                            <input
                              type="text"
                              value={soapView.header.department}
                              onChange={(e) => updateHeaderField('department', e.target.value)}
                              className={`${fieldClass('header.department')} h-7 max-w-[160px] text-xs`}
                            />
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="font-semibold">Bác sĩ:</span>
                            <input
                              type="text"
                              value={soapView.header.doctor}
                              onChange={(e) => updateHeaderField('doctor', e.target.value)}
                              className={`${fieldClass('header.doctor')} h-7 max-w-[160px] text-xs`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Họ và tên</label>
                        <input type="text" value={soapView.header.patient_name} onChange={(e) => updateHeaderField('patient_name', e.target.value)} className={fieldClass('header.patient_name')} placeholder="Nhập họ tên..." />
                        {renderEvidenceLines('header.patient_name')}
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">CCCD / Mã BN</label>
                        <input type="text" value={soapView.header.patient_identifier} onChange={(e) => updateHeaderField('patient_identifier', e.target.value)} className={fieldClass('header.patient_identifier')} placeholder="Nhập CCCD..." />
                        {renderEvidenceLines('header.patient_identifier')}
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Ngày sinh</label>
                        <input type="text" value={soapView.header.dob} onChange={(e) => updateHeaderField('dob', e.target.value)} className={fieldClass('header.dob')} placeholder="DD/MM/YYYY" />
                        {renderEvidenceLines('header.dob')}
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Giới tính</label>
                        <input type="text" value={soapView.header.sex} onChange={(e) => updateHeaderField('sex', e.target.value)} className={fieldClass('header.sex')} placeholder="Nam/Nữ" />
                        {renderEvidenceLines('header.sex')}
                      </div>
                    </div>

                    <div className="mt-5 space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">1. Lý do khám bệnh</label>
                        <textarea data-autoresize="true" data-minheight="86" value={soapView.subjective.chief_complaint} onChange={(e) => updateSubjectiveField('chief_complaint', e.target.value)} rows={2} className={`${fieldClass('subjective.chief_complaint')} min-h-[86px] resize-none overflow-hidden`} placeholder="Nhập lý do khám..." />
                        {renderEvidenceLines('subjective.chief_complaint')}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">2. Bệnh sử / Diễn tiến</label>
                        <textarea data-autoresize="true" data-minheight="112" value={soapView.subjective.hpi_summary} onChange={(e) => updateSubjectiveField('hpi_summary', e.target.value)} rows={3} className={`${fieldClass('subjective.hpi_summary')} min-h-[112px] resize-none overflow-hidden`} placeholder="Nhập bệnh sử..." />
                        {renderEvidenceLines('subjective.hpi_summary')}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">3. Tiền sử / Dị ứng / Thuốc đang dùng</label>
                        <textarea
                          data-autoresize="true"
                          data-minheight="112"
                          value={combinedHistoryText}
                          onChange={(e) => updateCombinedHistoryText(e.target.value)}
                          rows={3}
                          className={`${isHistorySection3Complete ? 'ring-slate-300 focus:ring-indigo-600' : 'ring-red-400 bg-red-50 focus:ring-red-500'} block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset px-3 placeholder:text-slate-400 focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6 min-h-[112px] resize-none overflow-hidden`}
                          placeholder="Tiền sử: ...&#10;Dị ứng: ...&#10;Thuốc đang dùng: ..."
                        />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          {renderEvidenceLines('subjective.relevant_pmh')}
                          {renderEvidenceLines('subjective.allergies')}
                          {renderEvidenceLines('subjective.current_meds')}
                        </div>
                      </div>
                    </div>

                    <div className="mt-7 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        {hasDoctorDiagnosisAlert && (
                          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-red-700 ring-1 ring-red-300">
                            <TriangleAlert className="h-3.5 w-3.5" />
                            bác sĩ chẩn đoán
                          </div>
                        )}
                        <h4 className="text-lg font-bold text-indigo-700 border-b border-indigo-200 pb-2 mb-3">Chẩn đoán & Đánh giá</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Chẩn đoán chính</label>
                            <textarea data-autoresize="true" data-minheight="120" value={soapView.assessment.primary_diagnosis} onChange={(e) => updateAssessmentField('primary_diagnosis', e.target.value)} rows={3} className={`${fieldClass('assessment.primary_diagnosis')} min-h-[120px] resize-none overflow-hidden`} />
                            {renderEvidenceLines('assessment.primary_diagnosis')}
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Chẩn đoán phân biệt</label>
                            <textarea data-autoresize="true" data-minheight="120" value={soapView.assessment.differential_diagnosis} onChange={(e) => updateAssessmentField('differential_diagnosis', e.target.value)} rows={3} className={`${fieldClass('assessment.differential_diagnosis')} min-h-[120px] resize-none overflow-hidden`} />
                            {renderEvidenceLines('assessment.differential_diagnosis')}
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Mức độ nguy cơ</label>
                            <textarea
                              data-autoresize="true"
                              data-minheight="82"
                              value={soapView.assessment.risk_level}
                              onChange={(e) => updateAssessmentField('risk_level', e.target.value)}
                              rows={2}
                              className={`${fieldClass('assessment.risk_level')} min-h-[82px] resize-none overflow-hidden`}
                            />
                            {renderEvidenceLines('assessment.risk_level')}
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-lg font-bold text-emerald-700 border-b border-emerald-200 pb-2 mb-3">Điều trị & Kế hoạch</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Gợi ý điều trị do AI suy luận</label>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                              <p className="mb-2 text-xs text-slate-500">
                                Bệnh nhân không cần nhập mục này. AI tự suy luận từ voice, bác sĩ xác nhận cuối.
                              </p>
                              <textarea
                                data-autoresize="true"
                                data-minheight="138"
                                value={medicationsToText(soapView.plan.medications)}
                                readOnly
                                rows={5}
                                className="block w-full rounded-md border-0 bg-white py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 px-3 text-sm resize-none overflow-hidden min-h-[138px]"
                              />
                              {renderEvidenceLines('plan.medications')}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Dặn dò</label>
                            <textarea data-autoresize="true" data-minheight="120" value={soapView.plan.instructions} onChange={(e) => updatePlanField('instructions', e.target.value)} rows={3} className={`${fieldClass('plan.instructions')} min-h-[120px] resize-none overflow-hidden`} />
                            {renderEvidenceLines('plan.instructions')}
                          </div>
                          <div className="grid grid-cols-1 gap-3">
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-1">Tái khám</label>
                              <textarea
                                data-autoresize="true"
                                data-minheight="82"
                                value={soapView.plan.follow_up}
                                onChange={(e) => updatePlanField('follow_up', e.target.value)}
                                rows={2}
                                className={`${fieldClass('plan.follow_up')} min-h-[82px] resize-none overflow-hidden`}
                              />
                              {renderEvidenceLines('plan.follow_up')}
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-1">Dấu hiệu cảnh báo</label>
                              <textarea
                                data-autoresize="true"
                                data-minheight="82"
                                value={soapView.plan.red_flags}
                                onChange={(e) => updatePlanField('red_flags', e.target.value)}
                                rows={2}
                                className={`${fieldClass('plan.red_flags')} min-h-[82px] resize-none overflow-hidden`}
                              />
                              {renderEvidenceLines('plan.red_flags')}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-12 border-t border-slate-200 pt-6 text-sm text-slate-700">
                      <div className="flex justify-end">
                        <span>
                          Ngày {examDateForFooter.getDate()} tháng {examDateForFooter.getMonth() + 1} năm {examDateForFooter.getFullYear()}
                        </span>
                      </div>
                      <div className="mt-8 flex justify-end">
                        <div className="text-center min-w-[220px]">
                          <p className="font-semibold">Bác sĩ khám bệnh</p>
                          <p className="text-xs text-slate-500">(Ký và ghi rõ họ tên)</p>
                        </div>
                      </div>
                      <p className="mt-6 text-xs italic text-slate-500">* Phiếu khám bệnh chỉ có giá trị lưu hành nội bộ.</p>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
          )}
          </div>
        )}

        {activePage === 'history' && (
          <div className="w-full space-y-6">
            <section className="no-print grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-3">
                  <CircleUserRound className="w-4 h-4 text-indigo-600" /> Thông tin quan trọng
                </h3>
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex justify-between"><span>Bác sĩ</span><span className="font-medium text-slate-800">{soapView.header.doctor || 'Chưa có'}</span></div>
                  <div className="flex justify-between"><span>Khoa/Phòng</span><span className="font-medium text-slate-800">{soapView.header.department || 'Chưa có'}</span></div>
                  <div className="flex justify-between"><span>Bệnh nhân gần nhất</span><span className="font-medium text-slate-800 truncate max-w-[140px]">{examHistory[0]?.patientName || 'Chưa có'}</span></div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-3">
                  <Clock3 className="w-4 h-4 text-indigo-600" /> Thống kê hôm nay
                </h3>
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex justify-between"><span>Ca hôm nay</span><span className="font-semibold text-slate-800">{historyToday.length}</span></div>
                  <div className="flex justify-between"><span>Ca nặng hôm nay</span><span className="font-semibold text-red-600">{criticalToday}</span></div>
                  <div className="flex justify-between"><span>Tổng bản ghi</span><span className="font-semibold text-slate-800">{examHistory.length}</span></div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm md:col-span-2">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-3">
                  <History className="w-4 h-4 text-indigo-600" /> Lịch sử gần đây
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {latestHistory.length === 0 ? (
                    <p className="text-xs text-slate-500">Chưa có lịch sử khám.</p>
                  ) : (
                    latestHistory.slice(0, 4).map((item) => (
                      <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-slate-800 truncate">{item.sheetTitle || item.patientName || 'Chưa rõ tên'}</p>
                          {item.critical && <span className="text-[10px] font-bold text-red-600">NẶNG</span>}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">{item.patientName || 'Chưa rõ bệnh nhân'} | {item.primaryDiagnosis || 'Chưa rõ chẩn đoán'}</p>
                        <p className="text-[10px] text-slate-400">{formatHistoryTime(item.savedAt)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>

            <section className="no-print bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-600" />
                  Lịch sử khám chi tiết
                </h3>
                <span className="text-xs text-slate-500">{examHistory.length} bản ghi</span>
              </div>
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-slate-600">
                      <th className="px-3 py-2 font-semibold">Thời điểm lưu</th>
                      <th className="px-3 py-2 font-semibold">Tên phiếu</th>
                      <th className="px-3 py-2 font-semibold">Bệnh nhân</th>
                      <th className="px-3 py-2 font-semibold">CCCD/Mã BN</th>
                      <th className="px-3 py-2 font-semibold">Giờ khám</th>
                      <th className="px-3 py-2 font-semibold">Lý do khám</th>
                      <th className="px-3 py-2 font-semibold">Chẩn đoán chính</th>
                      <th className="px-3 py-2 font-semibold">Thời lượng</th>
                      <th className="px-3 py-2 font-semibold">Mức độ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {examHistory.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-3 py-6 text-center text-slate-500">
                          Chưa có lịch sử khám. Hãy tạo SOAP hoặc lưu phiếu khám để bắt đầu.
                        </td>
                      </tr>
                    ) : (
                      examHistory.slice(0, 50).map((item) => (
                        <tr key={item.id} className="border-t border-slate-100">
                          <td className="px-3 py-2 text-slate-600">{formatHistoryTime(item.savedAt)}</td>
                          <td className="px-3 py-2 text-slate-700 max-w-[220px] truncate" title={item.sheetTitle}>
                            {item.sheetTitle || 'Chưa có'}
                          </td>
                          <td className="px-3 py-2 font-medium text-slate-800">{item.patientName || 'Chưa rõ'}</td>
                          <td className="px-3 py-2 text-slate-700">{item.patientIdentifier || 'Chưa rõ'}</td>
                          <td className="px-3 py-2 text-slate-700">{item.examDateTime || 'Chưa rõ'}</td>
                          <td className="px-3 py-2 text-slate-700 max-w-[260px] truncate" title={item.chiefComplaint}>
                            {item.chiefComplaint || 'Chưa rõ'}
                          </td>
                          <td className="px-3 py-2 text-slate-700 max-w-[260px] truncate" title={item.primaryDiagnosis}>
                            {item.primaryDiagnosis || 'Chưa rõ'}
                          </td>
                          <td className="px-3 py-2 text-slate-700">{formatHistoryDuration(item.durationSec)}</td>
                          <td className="px-3 py-2">
                            {item.critical ? (
                              <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Nặng</span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">Thường</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {activePage === 'template' && (
          <div className="w-full space-y-6">
            <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Giấy mẫu khám bệnh</h2>
              <p className="mt-2 text-sm text-slate-600">
                Trang này dùng để nạp nhanh mẫu phiếu khám chuẩn vào hệ thống. Sau khi nạp mẫu, hệ thống sẽ chuyển về trang khám chính để bạn chỉnh sửa theo từng bệnh nhân.
              </p>
              <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 flex items-start gap-2">
                <CircleAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>Dữ liệu mẫu chỉ để minh hoạ giao diện, không phải dữ liệu bệnh nhân thật.</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={applyTemplate}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                >
                  <LayoutTemplate className="w-4 h-4" /> Nạp giấy mẫu vào trang khám
                </button>
                <button
                  type="button"
                  onClick={() => setActivePage('history')}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
                >
                  <History className="w-4 h-4" /> Xem lịch sử khám
                </button>
              </div>
            </section>

            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70">
                <h3 className="text-sm font-semibold text-slate-900">Xem trước tờ phiếu khám mẫu</h3>
              </div>
              <div className="bg-slate-100 p-4 md:p-6">
                <div className="relative mx-auto w-full max-w-[840px] min-h-[1065px] rounded-2xl border border-slate-300 bg-white p-3 md:p-6 shadow-sm overflow-hidden bg-[radial-gradient(#d9e3f2_1px,transparent_1px)] bg-[length:18px_18px]">
                  <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
                    <div className="absolute left-1/2 top-1/2 w-[162%] -translate-x-1/2 -translate-y-1/2 -rotate-[45deg]">
                      <p className="select-none whitespace-nowrap w-full text-center text-[20px] md:text-[30px] font-black uppercase tracking-[0.08em] text-red-600/32">
                        VÍ DỤ DO AI LÀM RA - KHÔNG PHẢI THÔNG TIN THẬT
                      </p>
                    </div>
                  </div>

                  <div className="relative z-10">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 border-b border-slate-300 pb-3">
                      <div>
                        <h4 className="text-3xl font-black tracking-tight text-slate-800">THPT FPT</h4>
                        <p className="mt-1 text-sm text-slate-500">Phòng khám: Lớp 12A6</p>
                      </div>

                      <div className="w-full md:max-w-[360px]">
                        <p className="text-right text-3xl font-black text-indigo-700">PHIẾU KHÁM BỆNH</p>
                        <div className="mt-2 space-y-2 text-slate-700">
                          <div className="grid grid-cols-[115px_1fr] items-center gap-2">
                            <span className="font-semibold text-sm">Mã ca khám:</span>
                            <div className="h-10 rounded-xl border border-slate-300 bg-white px-3 flex items-center text-lg">MAU-DEMO-001</div>
                          </div>
                          <div className="grid grid-cols-[115px_1fr] items-center gap-2">
                            <span className="font-semibold text-sm">Ngày khám:</span>
                            <div className="h-10 rounded-xl border border-slate-300 bg-white px-3 flex items-center text-lg">16:44:09 28/2/2026</div>
                          </div>
                          <div className="grid grid-cols-[115px_1fr] items-center gap-2">
                            <span className="font-semibold text-sm">Khoa/Phòng:</span>
                            <div className="h-10 rounded-xl border border-slate-300 bg-white px-3 flex items-center text-lg">Lớp 12A6</div>
                          </div>
                          <div className="grid grid-cols-[115px_1fr] items-center gap-2">
                            <span className="font-semibold text-sm">Bác sĩ:</span>
                            <div className="h-10 rounded-xl border border-slate-300 bg-white px-3 flex items-center text-lg">Lee Việt Anh</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <p className="text-slate-500 font-semibold uppercase tracking-wide text-xs mb-1">Họ và tên</p>
                        <div className="h-10 rounded-xl border border-slate-300 bg-white px-3 flex items-center text-lg">BỆNH NHÂN VÍ DỤ</div>
                      </div>
                      <div>
                        <p className="text-slate-500 font-semibold uppercase tracking-wide text-xs mb-1">CCCD / Mã BN</p>
                        <div className="h-10 rounded-xl border border-slate-300 bg-white px-3 flex items-center text-lg">000000000000</div>
                      </div>
                      <div>
                        <p className="text-slate-500 font-semibold uppercase tracking-wide text-xs mb-1">Ngày sinh</p>
                        <div className="h-10 rounded-xl border border-slate-300 bg-white px-3 flex items-center text-lg">15/08/1988</div>
                      </div>
                      <div>
                        <p className="text-slate-500 font-semibold uppercase tracking-wide text-xs mb-1">Giới tính</p>
                        <div className="h-10 rounded-xl border border-slate-300 bg-white px-3 flex items-center text-lg">Nam</div>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div>
                        <p className="font-bold text-lg text-slate-700 mb-1">1. Lý do khám bệnh</p>
                        <div className="min-h-[86px] rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg">Sốt, ho, mệt mỏi 2 ngày</div>
                      </div>
                      <div>
                        <p className="font-bold text-lg text-slate-700 mb-1">2. Bệnh sử / Diễn tiến</p>
                        <div className="min-h-[128px] rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg">Bệnh nhân sốt nhẹ và ho khan, chưa dùng thuốc đặc hiệu.</div>
                      </div>
                      <div>
                        <p className="font-bold text-lg text-slate-700 mb-1">3. Tiền sử / Dị ứng / Thuốc đang dùng</p>
                        <div className="min-h-[128px] rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg">
                          <p>Tiền sử: Không bệnh nền đáng chú ý</p>
                          <p>Dị ứng: Chưa ghi nhận</p>
                          <p>Thuốc đang dùng: Paracetamol 500mg</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <p className="text-2xl font-black text-indigo-700 border-b-2 border-indigo-200 pb-2 mb-3">Chẩn đoán & Đánh giá</p>
                        <div className="space-y-3">
                          <div>
                            <p className="font-bold text-lg text-slate-700 mb-1">Chẩn đoán chính</p>
                            <div className="min-h-[86px] rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg">Nhiễm siêu vi hô hấp trên</div>
                          </div>
                          <div>
                            <p className="font-bold text-lg text-slate-700 mb-1">Chẩn đoán phân biệt</p>
                            <div className="min-h-[86px] rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg">Viêm phế quản cấp</div>
                          </div>
                          <div>
                            <p className="font-bold text-lg text-slate-700 mb-1">Mức độ nguy cơ</p>
                            <div className="min-h-[56px] rounded-xl border border-slate-300 bg-white px-4 py-2 flex items-start text-lg leading-tight">Thấp</div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="text-2xl font-black text-emerald-700 border-b-2 border-emerald-200 pb-2 mb-3">Điều trị & Kế hoạch</p>
                        <div className="space-y-3">
                          <div>
                            <p className="font-bold text-lg text-slate-700 mb-1">Thuốc điều trị</p>
                            <div className="min-h-[116px] rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg">
                              <p>Paracetamol - 500mg x 2 lần/ngày - 3 ngày</p>
                              <p>Natri clorid 0.9% - Rửa mũi 2-3 lần/ngày - 5 ngày</p>
                            </div>
                          </div>
                          <div>
                            <p className="font-bold text-lg text-slate-700 mb-1">Dặn dò</p>
                            <div className="min-h-[86px] rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg">Uống nhiều nước, nghỉ ngơi, theo dõi sốt.</div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="font-bold text-lg text-slate-700 mb-1">Tái khám</p>
                              <div className="min-h-[56px] rounded-xl border border-slate-300 bg-white px-4 py-2 flex items-start text-lg leading-tight break-words">Tái khám sau 2 ngày</div>
                            </div>
                            <div>
                              <p className="font-bold text-lg text-slate-700 mb-1">Dấu hiệu cảnh báo</p>
                              <div className="min-h-[56px] rounded-xl border border-slate-300 bg-white px-4 py-2 flex items-start text-lg leading-tight break-words">Khó thở, sốt cao liên tục</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-12 border-t border-slate-300 pt-6 text-slate-700">
                      <div className="flex justify-end">
                        <p className="text-lg">Ngày 28 tháng 2 năm 2026</p>
                      </div>
                      <div className="mt-8 flex justify-end">
                        <div className="text-center min-w-[220px]">
                          <p className="text-lg font-bold">Bác sĩ khám bệnh</p>
                          <p className="text-sm text-slate-500">(Ký và ghi rõ họ tên)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {activePage === 'creator_info' && (
          <div className="max-w-7xl mx-auto space-y-6">
            <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-6 md:p-8 shadow-sm">
              <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-indigo-200/40 blur-3xl" />
              <div className="absolute -left-20 -bottom-24 h-64 w-64 rounded-full bg-sky-200/30 blur-3xl" />
              <div className="relative grid grid-cols-1 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] gap-6">
                <div>
                  <p className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200">
                    Hồ sơ dự án
                  </p>
                  <h2 className="mt-3 text-2xl md:text-3xl font-black tracking-tight text-slate-900">
                    MedNote-SOAP
                  </h2>
                  <p className="mt-2 text-sm md:text-base text-slate-700 font-medium">
                    Hệ thống hỗ trợ ghi chú khám bệnh bằng giọng nói theo cấu trúc SOAP cho bối cảnh bệnh viện công quá tải.
                  </p>
                  <div className="mt-5 grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-4">
                    <div className="rounded-2xl border border-white/70 bg-white/90 p-3 shadow-sm">
                      <a
                        href={facebookProfileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block"
                        title="Mở Facebook cá nhân"
                      >
                        <img
                          src={creatorPhotoUrl}
                          alt="Ảnh Lê Việt Anh"
                          className="h-[220px] w-full rounded-xl object-cover ring-1 ring-indigo-200 transition-transform duration-200 group-hover:scale-[1.01]"
                        />
                      </a>
                      <a
                        href={facebookProfileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex text-xs font-semibold text-indigo-700 hover:text-indigo-600 hover:underline"
                      >
                        facebook.com/vietanh.lee.98892
                      </a>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <div className="rounded-xl border border-white/60 bg-white/80 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Người thực hiện</p>
                        <p className="mt-1 text-sm font-bold text-slate-900">Lê Việt Anh</p>
                      </div>
                      <div className="rounded-xl border border-white/60 bg-white/80 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Đơn vị học tập</p>
                        <p className="mt-1 text-sm font-bold text-slate-900">THPT FPT</p>
                      </div>
                      <div className="rounded-xl border border-white/60 bg-white/80 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Lớp</p>
                        <p className="mt-1 text-sm font-bold text-slate-900">12A6</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Thông tin liên hệ</h3>
                  <div className="mt-4 space-y-3 text-sm text-slate-700">
                    <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Họ và tên</p>
                      <div className="mt-2 flex items-center gap-2.5">
                        <a href={facebookProfileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex">
                          <img
                            src={creatorPhotoUrl}
                            alt="Ảnh đại diện Lê Việt Anh"
                            className="h-9 w-9 rounded-full object-cover ring-2 ring-indigo-200"
                          />
                        </a>
                        <p className="font-semibold text-slate-900">Lê Việt Anh</p>
                      </div>
                    </div>
                    <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Số điện thoại</p>
                      <p className="mt-1 font-semibold text-slate-900">0922797555</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Facebook</p>
                      <a
                        href={facebookProfileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex text-indigo-700 font-semibold hover:text-indigo-600 hover:underline break-all"
                      >
                        facebook.com/vietanh.lee.98892
                      </a>
                    </div>
                    <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Email</p>
                      <p className="mt-1 font-semibold text-slate-900 break-all">leevietanh0308@gmail.com</p>
                      <p className="mt-1 font-semibold text-slate-900 break-all">levietanh3808@gmail.com</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-6">
              <article className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-sm font-black">1</span>
                  <h3 className="text-lg font-bold text-slate-900">Bối cảnh và vấn đề đặt ra</h3>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-700">
                  Tại nhiều bệnh viện công, lưu lượng bệnh nhân cao khiến thời gian khám cho mỗi lượt thường rất ngắn.
                  Bác sĩ phải đồng thời khai thác triệu chứng, đánh giá tình trạng người bệnh và nhập liệu hồ sơ khám.
                  Một phần đáng kể thời gian bị tiêu tốn cho thao tác hành chính, làm tăng áp lực công việc và giảm thời lượng
                  giao tiếp trực tiếp với bệnh nhân.
                </p>
                <div className="mt-4 space-y-2 text-sm text-slate-700">
                  <p>- Áp lực thời gian và khối lượng công việc tăng cao đối với bác sĩ.</p>
                  <p>- Nguy cơ thiếu sót thông tin quan trọng do ghi chép vội, phân mảnh hoặc không theo cấu trúc.</p>
                  <p>- Giảm thời gian giao tiếp trực tiếp giữa bác sĩ và bệnh nhân, ảnh hưởng trải nghiệm và chất lượng khai thác bệnh sử.</p>
                  <p>- Dữ liệu khám bệnh khó chuẩn hóa, gây khó khăn cho lưu trữ, thống kê và quản lý bệnh nhân tập trung.</p>
                </div>
              </article>

              <article className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-sm font-black">2</span>
                  <h3 className="text-lg font-bold text-slate-900">Mục tiêu dự án</h3>
                </div>
                <div className="mt-4 space-y-2 text-sm text-slate-700">
                  <p>- Giảm thời gian nhập liệu thủ công bằng cách chuyển đổi giọng nói thành ghi chú có cấu trúc.</p>
                  <p>- Chuẩn hóa ghi chú lâm sàng theo SOAP (Subjective - Objective - Assessment - Plan).</p>
                  <p>- Hỗ trợ điền biểu mẫu giấy khám bệnh theo đúng thứ tự trường dữ liệu.</p>
                  <p>- Gắn cờ thiếu dữ kiện và red flags để nhắc hỏi bổ sung, ưu tiên đánh giá ngay.</p>
                  <p>- Tạo nền tảng quản lý bệnh nhân tập trung phục vụ truy xuất và thống kê.</p>
                </div>
              </article>
            </section>

            <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-sm font-black">3</span>
                <h3 className="text-lg font-bold text-slate-900">Ý tưởng cốt lõi và cách tiếp cận</h3>
              </div>
              <p className="mt-4 text-sm text-slate-700">
                MedNote-SOAP vận hành theo nguyên lý: <span className="font-bold">Thu thập đúng - Cấu trúc hóa - Bác sĩ xác nhận - Lưu trữ tập trung</span>.
              </p>
              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black text-indigo-700 uppercase tracking-wide">Bước 1</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">Thu âm</p>
                  <p className="mt-1 text-xs text-slate-600">In-room hoặc Dictation tùy bối cảnh.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black text-indigo-700 uppercase tracking-wide">Bước 2</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">Speech-to-Text</p>
                  <p className="mt-1 text-xs text-slate-600">Chuyển âm thanh thành transcript.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black text-indigo-700 uppercase tracking-wide">Bước 3</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">Cấu trúc hóa dữ liệu</p>
                  <p className="mt-1 text-xs text-slate-600">Đổ transcript vào SOAP và phiếu khám.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black text-indigo-700 uppercase tracking-wide">Bước 4</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">Bác sĩ duyệt/chỉnh</p>
                  <p className="mt-1 text-xs text-slate-600">Human-in-the-loop trước khi lưu.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black text-indigo-700 uppercase tracking-wide">Bước 5</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">Lưu trữ tập trung</p>
                  <p className="mt-1 text-xs text-slate-600">Hiển thị dashboard và lịch sử khám.</p>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <article className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-sm font-black">4</span>
                  <h3 className="text-lg font-bold text-slate-900">Phạm vi chức năng (Scope)</h3>
                </div>
                <div className="mt-4 space-y-3 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">5.1. Thu thập và chuẩn hóa dữ liệu khám bệnh</p>
                  <p>- Tạo transcript từ audio.</p>
                  <p>- Tạo ghi chú SOAP có cấu trúc.</p>
                  <p>- Tự động điền các trường quan trọng trong giấy khám bệnh nhân.</p>

                  <p className="pt-2 font-semibold text-slate-900">5.2. Kiểm soát chất lượng dữ liệu</p>
                  <p>- Gắn cờ thiếu dữ kiện khi thiếu thông tin bắt buộc.</p>
                  <p>- Gắn cờ red flags theo các hội chứng nguy cơ để nhắc đánh giá ưu tiên.</p>

                  <p className="pt-2 font-semibold text-slate-900">5.3. Quản lý bệnh nhân tập trung</p>
                  <p>- Lưu bệnh nhân và các lần khám (encounters).</p>
                  <p>- Tìm kiếm theo tên, căn cước công dân hoặc mã ca.</p>
                  <p>- Xem lịch sử ghi chú SOAP theo thời gian.</p>
                </div>
              </article>

              <article className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-sm font-black">5</span>
                  <h3 className="text-lg font-bold text-slate-900">Giới hạn và cam kết an toàn</h3>
                </div>
                <div className="mt-4 space-y-2 text-sm text-slate-700">
                  <p>- Không chẩn đoán xác định: hệ thống chỉ hỗ trợ ghi nhận và định hướng hỏi thêm.</p>
                  <p>- Không kê đơn tự động: mọi điều trị/thuốc chỉ ghi nhận khi bác sĩ xác nhận.</p>
                  <p>- Bác sĩ là người chịu trách nhiệm cuối trước khi lưu chính thức.</p>
                  <p>- Không suy luận khi dữ kiện chưa đủ ngưỡng tối thiểu.</p>
                  <p>- Định hướng bảo mật dữ liệu, hạn chế lưu audio khi không cần, ưu tiên ẩn danh dữ liệu mô phỏng.</p>
                </div>
              </article>
            </section>

            <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-sm font-black">6</span>
                <h3 className="text-lg font-bold text-slate-900">Động lực cá nhân thực hiện dự án</h3>
              </div>
              <div className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
                <p>
                  Lý do lựa chọn phát triển chủ đề này không chỉ xuất phát từ sự quan tâm đến công nghệ,
                  mà còn đến từ trải nghiệm thực tế của bản thân.
                </p>
                <p>
                  Tôi là học sinh đến từ Thành phố Hồ Chí Minh và mới ra Hà Nội học tập một thời gian.
                  Trong quá trình sinh sống và học tập, tôi có cơ hội trải nghiệm thăm khám tại nhiều bệnh viện công lớn,
                  sinh sống trong môi trường của một bệnh viện tư, và quan sát trực tiếp quy trình làm việc của bác sĩ
                  trong cả hai mô hình.
                </p>
                <p>
                  Qua những trải nghiệm đó, tôi nhận thấy tại nhiều bệnh viện công, số lượng bệnh nhân rất đông.
                  Bác sĩ phải làm việc với cường độ cao, mỗi lượt khám diễn ra nhanh, và phần lớn thời gian bị chia sẻ
                  cho việc nhập liệu hồ sơ. Áp lực công việc khiến quy trình ghi chú đôi khi mang tính thủ tục nhiều hơn
                  là tối ưu hóa dữ liệu lâm sàng.
                </p>
                <p>
                  Trong khi đó, ở môi trường bệnh viện tư, thời gian dành cho mỗi bệnh nhân thường nhiều hơn,
                  hồ sơ được ghi chép rõ ràng và có cấu trúc tốt hơn. Điều này cho thấy vấn đề không nằm ở chuyên môn bác sĩ,
                  mà nằm ở hệ thống vận hành và công cụ hỗ trợ.
                </p>
                <p>
                  Từ sự so sánh giữa hai môi trường này, tôi đặt ra câu hỏi:
                  <span className="font-semibold"> liệu có thể dùng công nghệ để hỗ trợ bác sĩ ghi nhận thông tin nhanh hơn, chính xác hơn, mà vẫn đảm bảo an toàn và đầy đủ?</span>
                </p>
                <p>
                  MedNote-SOAP ra đời từ câu hỏi đó. Dự án không nhằm thay đổi quy trình chuyên môn y khoa,
                  mà tập trung cải thiện lớp vận hành dữ liệu, giúp giảm gánh nặng hành chính, tăng chất lượng ghi chú
                  và hỗ trợ quản lý bệnh nhân hiệu quả hơn trong bối cảnh quá tải.
                </p>
              </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-sm font-black">7</span>
                <h3 className="text-lg font-bold text-slate-900">Kết quả kỳ vọng và giá trị mang lại</h3>
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Hiệu suất</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">Rút ngắn thời gian ghi chú</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Chất lượng hồ sơ</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">Tăng tính đầy đủ và chuẩn hóa</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">An toàn dữ liệu</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">Giảm nguy cơ bỏ sót dữ kiện quan trọng</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Quản trị</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">Tạo dữ liệu có cấu trúc cho thống kê</p>
                </div>
              </div>
            </section>

            <section className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold">Thông tin liên hệ</h3>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-white/10 px-4 py-3">
                  <p className="text-white/70 text-xs uppercase tracking-wide font-semibold">Người thực hiện</p>
                  <div className="mt-2 flex items-center gap-2.5">
                    <a href={facebookProfileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex">
                      <img
                        src={creatorPhotoUrl}
                        alt="Ảnh đại diện Lê Việt Anh"
                        className="h-9 w-9 rounded-full object-cover ring-2 ring-indigo-200"
                      />
                    </a>
                    <p className="font-semibold">Lê Việt Anh - THPT FPT - Lớp 12A6</p>
                  </div>
                </div>
                <div className="rounded-xl bg-white/10 px-4 py-3">
                  <p className="text-white/70 text-xs uppercase tracking-wide font-semibold">Số điện thoại</p>
                  <p className="mt-1 font-semibold">0922797555</p>
                </div>
                <div className="rounded-xl bg-white/10 px-4 py-3">
                  <p className="text-white/70 text-xs uppercase tracking-wide font-semibold">Facebook</p>
                  <a
                    href={facebookProfileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex font-semibold text-indigo-200 hover:text-indigo-100 hover:underline break-all"
                  >
                    facebook.com/vietanh.lee.98892
                  </a>
                </div>
                <div className="rounded-xl bg-white/10 px-4 py-3 md:col-span-2">
                  <p className="text-white/70 text-xs uppercase tracking-wide font-semibold">Email</p>
                  <p className="mt-1 font-semibold break-all">leevietanh0308@gmail.com</p>
                  <p className="mt-1 font-semibold break-all">levietanh3808@gmail.com</p>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {activePage === 'exam' && showSplitView && isAnyVoicePlaying && (
        <div className="no-print fixed left-4 bottom-4 z-40">
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur px-3 py-2 shadow-lg">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-indigo-300 bg-indigo-100">
              <Disc3 className={`w-4.5 h-4.5 ${isVoicePlayingActive ? 'animate-spin text-indigo-700' : 'text-indigo-400'}`} />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-800 truncate">
                {isVoicePaused
                  ? `Đã dừng tạm: ${playingVoiceCase?.title || 'Voice mô phỏng'}`
                  : `Đang phát: ${playingVoiceCase?.title || 'Voice mô phỏng'}`}
              </p>
              <p className="text-[10px] text-slate-500">
                {isVoicePaused ? 'Bấm Tiếp tục để nghe tiếp.' : 'Có thể dừng tạm bất kỳ lúc nào.'}
              </p>
            </div>
            <button
              type="button"
              onClick={toggleDemoVoicePause}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              {isVoicePaused ? (
                <>
                  <Play className="w-3.5 h-3.5" /> Tiếp tục
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5" fill="currentColor" /> Dừng tạm
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
