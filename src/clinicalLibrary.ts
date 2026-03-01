export type SystemTag =
  | 'general'
  | 'respiratory'
  | 'cardio'
  | 'gastro'
  | 'neuro'
  | 'musculoskeletal'
  | 'urinary'
  | 'dermatology'
  | 'ophthalmology'
  | 'endocrine'
  | 'mental'
  | 'administrative';

export interface ChiefComplaintItem {
  id: string;
  label: string;
  synonyms: string[];
  systemTag: SystemTag;
}

export interface MandatoryVoiceQuestion {
  id: string;
  text: string;
}

export interface HpiPromptPack {
  label: string;
  followUps: string[];
  redFlags: string[];
}

export interface PmhItem {
  label: string;
  synonyms: string[];
}

export interface PmhGroup {
  id: string;
  label: string;
  items: PmhItem[];
}

export type RedFlagLevel = 'emergency' | 'urgent_same_day';

export interface RedFlagRule {
  id: string;
  label: string;
  level: RedFlagLevel;
  triggers: string[];
  recommendation: string;
}

export interface SyndromeModule {
  id: string;
  label: string;
  systemTags: SystemTag[];
  chiefComplaintIds: string[];
  keywords: string[];
  requiredChecks: string[];
  commonDiagnoses: string[];
  notToMissDiagnoses: string[];
  emergencyRedFlags: string[];
}

export const mandatoryVoiceQuestions: MandatoryVoiceQuestion[] = [
  { id: 'q1', text: 'Họ tên - Năm sinh - Giới tính' },
  { id: 'q2', text: 'CCCD hoặc Mã bệnh nhân' },
  { id: 'q3', text: 'Lý do khám chính (1 câu ngắn)' },
  { id: 'q4', text: 'Mô tả triệu chứng hiện tại (ngắn gọn)' },
  { id: 'q5', text: 'Mức độ hiện tại + triệu chứng kèm' },
  { id: 'q6', text: 'Tiền sử bệnh nền quan trọng' },
  { id: 'q7', text: 'Dị ứng + Thuốc đang dùng/đã dùng gần đây' },
];

export const universalHpiChecklist: string[] = [
  'Khởi phát: bắt đầu khi nào, đột ngột hay từ từ?',
  'Vị trí: đau/khó chịu ở đâu?',
  'Thời gian: liên tục hay từng cơn?',
  'Tính chất: nhói, âm ỉ, bỏng rát, đè nặng...',
  'Mức độ: thang điểm 0-10 hoặc nhẹ/vừa/nặng',
  'Triệu chứng hiện tại có gây ảnh hưởng sinh hoạt không?',
  'Triệu chứng kèm: sốt, khó thở, nôn, tiêu chảy...',
  'Tác động chức năng: ăn ngủ, đi lại, làm việc',
  'Đã dùng thuốc gì trước đó? liều và lần dùng cuối',
];

export const chiefComplaintList: ChiefComplaintItem[] = [
  { id: 'fever', label: 'Sốt', synonyms: ['nóng', 'sốt cao', 'ớn lạnh', 'rét run'], systemTag: 'general' },
  { id: 'fatigue', label: 'Mệt mỏi', synonyms: ['mệt', 'đuối', 'kiệt sức', 'uể oải'], systemTag: 'general' },
  { id: 'weight_loss', label: 'Sụt cân/chán ăn', synonyms: ['ăn kém', 'gầy nhanh', 'chán ăn'], systemTag: 'general' },
  { id: 'rash_fever', label: 'Phát ban kèm sốt', synonyms: ['nổi ban', 'nổi mẩn', 'ban đỏ'], systemTag: 'general' },

  { id: 'cough', label: 'Ho', synonyms: ['ho khan', 'ho có đờm', 'ho kéo dài', 'khạc đờm'], systemTag: 'respiratory' },
  { id: 'sore_throat', label: 'Đau họng', synonyms: ['rát họng', 'nuốt đau', 'khàn tiếng'], systemTag: 'respiratory' },
  { id: 'runny_nose', label: 'Sổ mũi/nghẹt mũi', synonyms: ['hắt hơi', 'chảy mũi', 'nghẹt mũi'], systemTag: 'respiratory' },
  { id: 'dyspnea', label: 'Khó thở', synonyms: ['hụt hơi', 'thở gấp', 'thở không ra hơi', 'khó thở khi nghỉ'], systemTag: 'respiratory' },
  { id: 'wheezing', label: 'Thở khò khè', synonyms: ['khò khè', 'hen', 'khò khè về đêm'], systemTag: 'respiratory' },
  { id: 'chest_pain_resp', label: 'Đau ngực', synonyms: ['tức ngực', 'nặng ngực', 'đau ngực khi thở'], systemTag: 'respiratory' },
  { id: 'hemoptysis', label: 'Ho ra máu', synonyms: ['khạc ra máu'], systemTag: 'respiratory' },

  { id: 'palpitation', label: 'Hồi hộp/đánh trống ngực', synonyms: ['tim đập nhanh', 'loạn nhịp'], systemTag: 'cardio' },
  { id: 'hypertension_visit', label: 'Kiểm tra huyết áp', synonyms: ['cao huyết áp', 'đo huyết áp'], systemTag: 'cardio' },
  { id: 'edema', label: 'Phù chân/phù mặt', synonyms: ['sưng chân', 'sưng mắt', 'phù'], systemTag: 'cardio' },
  { id: 'syncope', label: 'Ngất/suýt ngất', synonyms: ['xỉu', 'tối sầm', 'choáng'], systemTag: 'cardio' },

  { id: 'abdominal_pain', label: 'Đau bụng', synonyms: ['đau quặn bụng', 'đau âm ỉ bụng', 'đau thượng vị', 'đau hạ vị'], systemTag: 'gastro' },
  { id: 'reflux', label: 'Ợ chua/nóng rát/đầy bụng', synonyms: ['trào ngược', 'khó tiêu', 'đầy hơi'], systemTag: 'gastro' },
  { id: 'nausea_vomit', label: 'Buồn nôn/nôn', synonyms: ['ói', 'nôn nhiều', 'buồn nôn'], systemTag: 'gastro' },
  { id: 'diarrhea', label: 'Tiêu chảy', synonyms: ['đi ngoài', 'phân lỏng', 'đi nhiều lần'], systemTag: 'gastro' },
  { id: 'constipation', label: 'Táo bón', synonyms: ['khó đi', 'rặn', 'ít đi ngoài'], systemTag: 'gastro' },
  { id: 'gi_bleeding', label: 'Đi cầu ra máu/phân đen', synonyms: ['máu tươi', 'phân đen như hắc ín', 'đi ngoài ra máu'], systemTag: 'gastro' },
  { id: 'jaundice', label: 'Vàng da/vàng mắt', synonyms: ['vàng da', 'vàng mắt', 'ngứa kèm vàng da'], systemTag: 'gastro' },

  { id: 'headache', label: 'Đau đầu', synonyms: ['nhức đầu', 'đau nửa đầu', 'đau sau gáy'], systemTag: 'neuro' },
  { id: 'dizziness', label: 'Chóng mặt/choáng', synonyms: ['quay cuồng', 'lâng lâng', 'tối sầm', 'choáng váng'], systemTag: 'neuro' },
  { id: 'numb_weakness', label: 'Tê bì/yếu tay chân', synonyms: ['tê', 'yếu', 'liệt', 'khó nói'], systemTag: 'neuro' },
  { id: 'seizure', label: 'Co giật', synonyms: ['lên cơn', 'giật'], systemTag: 'neuro' },
  { id: 'altered_mental', label: 'Rối loạn ý thức', synonyms: ['lơ mơ', 'lú', 'ngủ gà'], systemTag: 'neuro' },

  { id: 'joint_pain', label: 'Đau khớp', synonyms: ['đau gối', 'đau cổ tay', 'đau vai', 'đau khớp ngón chân cái'], systemTag: 'musculoskeletal' },
  { id: 'swollen_joint', label: 'Sưng nóng đỏ khớp', synonyms: ['khớp sưng', 'khớp nóng đỏ'], systemTag: 'musculoskeletal' },
  { id: 'back_pain', label: 'Đau lưng/cột sống', synonyms: ['đau thắt lưng', 'đau lan chân'], systemTag: 'musculoskeletal' },
  { id: 'trauma', label: 'Chấn thương/té ngã', synonyms: ['bong gân', 'gãy', 'đụng dập'], systemTag: 'musculoskeletal' },

  { id: 'dysuria', label: 'Tiểu buốt/tiểu rắt', synonyms: ['xót tiểu', 'đi tiểu nhiều lần'], systemTag: 'urinary' },
  { id: 'hematuria', label: 'Tiểu ra máu', synonyms: ['nước tiểu đỏ', 'tiểu hồng'], systemTag: 'urinary' },
  { id: 'flank_pain', label: 'Đau hông lưng', synonyms: ['đau vùng thận', 'đau lan bẹn'], systemTag: 'urinary' },
  { id: 'urinary_retention', label: 'Bí tiểu', synonyms: ['không tiểu được'], systemTag: 'urinary' },
  { id: 'pelvic_pain', label: 'Đau bụng dưới/đau vùng chậu', synonyms: ['đau vùng chậu', 'đau hạ vị'], systemTag: 'urinary' },
  { id: 'abnormal_vaginal_bleeding', label: 'Ra huyết âm đạo bất thường', synonyms: ['rong kinh', 'ra máu âm đạo'], systemTag: 'urinary' },

  { id: 'urticaria', label: 'Mẩn ngứa/mề đay', synonyms: ['nổi mề đay', 'ngứa toàn thân'], systemTag: 'dermatology' },
  { id: 'rash', label: 'Phát ban', synonyms: ['nổi đỏ', 'ban sẩn'], systemTag: 'dermatology' },
  { id: 'skin_infection', label: 'Nhiễm trùng da/áp xe', synonyms: ['mụn nhọt', 'sưng đau có mủ'], systemTag: 'dermatology' },

  { id: 'red_eye', label: 'Đỏ mắt', synonyms: ['cộm mắt', 'chảy ghèn'], systemTag: 'ophthalmology' },
  { id: 'eye_pain', label: 'Đau mắt/sợ ánh sáng', synonyms: ['nhức mắt', 'sợ ánh sáng'], systemTag: 'ophthalmology' },
  { id: 'vision_loss', label: 'Giảm thị lực/nhìn mờ', synonyms: ['mờ mắt', 'nhìn mờ đột ngột'], systemTag: 'ophthalmology' },

  { id: 'polyuria_polydipsia', label: 'Khát nhiều/tiểu nhiều', synonyms: ['khát nước', 'tiểu đêm'], systemTag: 'endocrine' },
  { id: 'hypoglycemia', label: 'Hạ đường huyết', synonyms: ['run tay', 'vã mồ hôi', 'lịm'], systemTag: 'endocrine' },
  { id: 'thyroid_symptoms', label: 'Triệu chứng tuyến giáp', synonyms: ['bướu cổ', 'tim nhanh sụt cân', 'lạnh tăng cân'], systemTag: 'endocrine' },

  { id: 'insomnia', label: 'Mất ngủ', synonyms: ['khó ngủ', 'ngủ chập chờn'], systemTag: 'mental' },
  { id: 'anxiety', label: 'Lo âu/hoảng sợ', synonyms: ['hoảng loạn', 'căng thẳng'], systemTag: 'mental' },
  { id: 'depressed_mood', label: 'Trầm buồn/giảm hứng thú', synonyms: ['buồn chán kéo dài', 'mất hứng thú'], systemTag: 'mental' },

  { id: 'general_checkup', label: 'Khám sức khỏe tổng quát', synonyms: ['khám tổng quát', 'kiểm tra sức khỏe'], systemTag: 'administrative' },
  { id: 'review_results', label: 'Xem kết quả xét nghiệm', synonyms: ['đọc kết quả xét nghiệm', 'xem kết quả'], systemTag: 'administrative' },
  { id: 'followup_admin', label: 'Tái khám theo hẹn', synonyms: ['tái khám', 'khám lại theo hẹn'], systemTag: 'administrative' },
  { id: 'refill_prescription', label: 'Cấp lại đơn thuốc', synonyms: ['nhắc thuốc', 'xin lại đơn'], systemTag: 'administrative' },
];

export const hpiPromptsBySystem: Record<SystemTag, HpiPromptPack> = {
  general: {
    label: 'Toàn thân - sốt',
    followUps: [
      'Nhiệt độ cao nhất? đo bằng gì?',
      'Sốt liên tục hay từng cơn? có rét run/vã mồ hôi không?',
      'Có ho, đau họng, tiêu chảy, tiểu buốt hoặc phát ban không?',
      'Có tiếp xúc người bệnh hoặc đi vùng dịch không?',
    ],
    redFlags: ['Lơ mơ', 'Khó thở', 'Cứng cổ', 'Đau ngực', 'Mất nước nặng', 'Xuất huyết'],
  },
  respiratory: {
    label: 'Hô hấp',
    followUps: [
      'Ho khan hay ho đờm? màu đờm gì?',
      'Khó thở khi nghỉ hay khi gắng sức?',
      'Có đau ngực, sốt, khò khè hoặc ho ra máu không?',
      'Có tiền sử hen/COPD hoặc hút thuốc không?',
    ],
    redFlags: ['SpO2 thấp', 'Thở nhanh', 'Tím tái', 'Nói không thành câu', 'Ho ra máu'],
  },
  cardio: {
    label: 'Tim mạch',
    followUps: [
      'Đau ngực ở vị trí nào? kiểu đè nặng hay nhói?',
      'Có lan tay trái/hàm/lưng không?',
      'Có liên quan gắng sức? đỡ khi nghỉ không?',
      'Có kèm vã mồ hôi, buồn nôn, khó thở, ngất không?',
    ],
    redFlags: ['Đau ngực bóp nghẹt', 'Ngất', 'Khó thở tăng', 'Vã mồ hôi nhiều'],
  },
  gastro: {
    label: 'Tiêu hóa',
    followUps: [
      'Đau bụng vùng nào? thượng vị/quanh rốn/hố chậu phải?',
      'Đau quặn hay âm ỉ? liên quan ăn uống không?',
      'Có nôn, tiêu chảy, táo bón hoặc phân đen/đi cầu máu không?',
      'Có sốt, chướng bụng, đau tăng dần không?',
    ],
    redFlags: ['Đau bụng dữ dội tăng nhanh', 'Bụng cứng', 'Nôn máu', 'Phân đen', 'Ngất'],
  },
  neuro: {
    label: 'Thần kinh',
    followUps: [
      'Đau đầu vùng nào? mức độ bao nhiêu/10?',
      'Chóng mặt quay cuồng hay choáng tối sầm?',
      'Có yếu liệt, tê bì, nói khó hoặc co giật không?',
      'Có sốt/cứng cổ/sợ ánh sáng không?',
    ],
    redFlags: ['Đau đầu tệ nhất', 'Yếu liệt', 'Nói khó', 'Lơ mơ', 'Co giật', 'Cứng cổ + sốt'],
  },
  musculoskeletal: {
    label: 'Cơ xương khớp',
    followUps: [
      'Khớp nào đau? một khớp hay nhiều khớp?',
      'Có sưng nóng đỏ và hạn chế vận động không?',
      'Khởi phát đột ngột qua đêm hay kéo dài?',
      'Có sốt hoặc vết thương vùng khớp không?',
    ],
    redFlags: ['Sốt + khớp sưng nóng đỏ', 'Đau tăng nhanh', 'Không vận động được'],
  },
  urinary: {
    label: 'Tiết niệu - sinh dục',
    followUps: [
      'Có tiểu buốt/rắt hoặc tiểu ra máu không?',
      'Có đau hông lưng lan bẹn không?',
      'Có sốt rét run, nôn, bí tiểu không?',
      'Nữ: có trễ kinh, khả năng mang thai, ra huyết âm đạo bất thường không?',
    ],
    redFlags: ['Sốt cao + đau hông lưng', 'Bí tiểu', 'Tiểu máu nhiều', 'Đau tăng nhanh'],
  },
  dermatology: {
    label: 'Da liễu - dị ứng',
    followUps: [
      'Nổi ban từ khi nào? có lan nhanh không?',
      'Có phù môi/lưỡi hoặc khó thở không?',
      'Có dùng thuốc mới hoặc ăn đồ lạ gần đây không?',
      'Ngứa nhiều hay đau rát?',
    ],
    redFlags: ['Khó thở', 'Phù môi lưỡi', 'Choáng tụt huyết áp', 'Ban lan nhanh'],
  },
  ophthalmology: {
    label: 'Mắt',
    followUps: [
      'Đỏ mắt một bên hay hai bên? có ghèn không?',
      'Có đau mắt, sợ ánh sáng, nhìn mờ đột ngột không?',
      'Có chấn thương mắt hoặc đeo kính áp tròng không?',
    ],
    redFlags: ['Mờ mắt đột ngột', 'Đau mắt dữ dội', 'Sợ ánh sáng nhiều'],
  },
  endocrine: {
    label: 'Nội tiết - chuyển hóa',
    followUps: [
      'Khát nước/tiểu nhiều kéo dài bao lâu?',
      'Có run tay, vã mồ hôi, lịm nghi hạ đường huyết không?',
      'Có triệu chứng tuyến giáp: tim nhanh/sụt cân hoặc lạnh/tăng cân không?',
    ],
    redFlags: ['Lơ mơ do hạ đường huyết', 'Mất nước nặng', 'Tim nhanh kéo dài'],
  },
  mental: {
    label: 'Tâm thần - giấc ngủ',
    followUps: [
      'Mất ngủ bao lâu? có ảnh hưởng sinh hoạt không?',
      'Có lo âu, hoảng sợ, buồn chán kéo dài không?',
      'Có dùng rượu/chất kích thích để ngủ không?',
    ],
    redFlags: ['Kích động nặng', 'Ý nghĩ tự hại', 'Mất ngủ kéo dài kèm suy kiệt'],
  },
  administrative: {
    label: 'Hành chính - tái khám',
    followUps: ['Xác nhận lý do hành chính và hồ sơ cần bổ sung.', 'Kiểm tra lịch hẹn và các xét nghiệm liên quan.'],
    redFlags: [],
  },
};

export const pmhChecklist: PmhGroup[] = [
  {
    id: 'cardio',
    label: 'Tim mạch',
    items: [
      { label: 'Tăng huyết áp', synonyms: ['cao huyết áp'] },
      { label: 'Bệnh mạch vành', synonyms: ['đau thắt ngực', 'đặt stent'] },
      { label: 'Suy tim', synonyms: [] },
      { label: 'Rối loạn nhịp', synonyms: ['loạn nhịp'] },
      { label: 'Đột quỵ/TIA', synonyms: ['tai biến', 'đột quỵ'] },
    ],
  },
  {
    id: 'endocrine',
    label: 'Nội tiết - chuyển hóa',
    items: [
      { label: 'Đái tháo đường', synonyms: ['tiểu đường'] },
      { label: 'Rối loạn mỡ máu', synonyms: ['mỡ máu cao'] },
      { label: 'Bệnh tuyến giáp', synonyms: ['cường giáp', 'suy giáp'] },
      { label: 'Béo phì', synonyms: [] },
    ],
  },
  {
    id: 'respiratory',
    label: 'Hô hấp',
    items: [
      { label: 'Hen phế quản', synonyms: ['hen'] },
      { label: 'COPD', synonyms: ['phổi tắc nghẽn mạn tính'] },
      { label: 'Lao phổi cũ', synonyms: ['lao phổi'] },
    ],
  },
  {
    id: 'renal',
    label: 'Thận - tiết niệu',
    items: [
      { label: 'Bệnh thận mạn', synonyms: ['suy thận mạn'] },
      { label: 'Sỏi thận', synonyms: ['sạn thận'] },
      { label: 'Nhiễm trùng tiểu tái phát', synonyms: ['viêm đường tiểu tái phát'] },
    ],
  },
  {
    id: 'gastro',
    label: 'Tiêu hóa - gan mật',
    items: [
      { label: 'Viêm dạ dày/GERD', synonyms: ['trào ngược', 'viêm dạ dày'] },
      { label: 'Loét dạ dày tá tràng', synonyms: ['loét dạ dày'] },
      { label: 'Viêm gan B/C', synonyms: ['viêm gan b', 'viêm gan c'] },
      { label: 'Xơ gan', synonyms: [] },
      { label: 'Sỏi mật', synonyms: [] },
    ],
  },
  {
    id: 'musculoskeletal',
    label: 'Cơ xương khớp',
    items: [
      { label: 'Gút', synonyms: ['gout'] },
      { label: 'Thoái hóa khớp', synonyms: [] },
      { label: 'Viêm khớp dạng thấp', synonyms: [] },
      { label: 'Loãng xương', synonyms: [] },
    ],
  },
  {
    id: 'neuro_psych',
    label: 'Thần kinh - tâm thần',
    items: [
      { label: 'Động kinh', synonyms: [] },
      { label: 'Trầm cảm/lo âu', synonyms: ['trầm cảm', 'lo âu'] },
      { label: 'Rối loạn giấc ngủ', synonyms: ['mất ngủ mạn'] },
    ],
  },
  {
    id: 'infectious_other',
    label: 'Truyền nhiễm - khác',
    items: [
      { label: 'HIV/AIDS', synonyms: ['hiv'] },
      { label: 'Lao', synonyms: [] },
      { label: 'Ung thư', synonyms: ['k', 'u ác'] },
      { label: 'Dị ứng mạn tính', synonyms: ['viêm mũi dị ứng mạn'] },
    ],
  },
];

export const redFlagRules: RedFlagRule[] = [
  {
    id: 'respiratory_severe',
    label: 'Khó thở nặng/tím tái',
    level: 'emergency',
    triggers: ['khó thở nặng', 'tím tái', 'không thở', 'nói không thành câu', 'thở rít', 'co kéo cơ hô hấp phụ'],
    recommendation: 'Cần chuyển cấp cứu ngay.',
  },
  {
    id: 'chest_pain_high_risk',
    label: 'Đau ngực nguy cơ cao',
    level: 'emergency',
    triggers: [
      'đau ngực bóp nghẹt',
      'đau ngực lan tay trái',
      'đau ngực kèm vã mồ hôi',
      'đau ngực kèm ngất',
      'đau ngực hơn 15 phút',
      'đau ngực kéo dài 15 phút',
      'đau ngực kèm khó thở',
      'đau ngực kèm nôn',
    ],
    recommendation: 'Ưu tiên cấp cứu tim mạch.',
  },
  {
    id: 'shock_syncope',
    label: 'Tụt huyết áp/ngất',
    level: 'emergency',
    triggers: ['tụt huyết áp', 'huyết áp thấp', 'ngất', 'choáng nặng', 'lạnh đầu chi'],
    recommendation: 'Cần xử trí cấp cứu theo ABC.',
  },
  {
    id: 'neuro_focal_deficit',
    label: 'Thiếu sót thần kinh khu trú',
    level: 'emergency',
    triggers: ['yếu liệt', 'nói khó', 'méo miệng', 'co giật', 'lơ mơ', 'FAST dương tính', 'mất thăng bằng đột ngột'],
    recommendation: 'Cần đánh giá thần kinh cấp cứu.',
  },
  {
    id: 'severe_headache_meningeal',
    label: 'Đau đầu dữ dội/cứng cổ',
    level: 'emergency',
    triggers: ['đau đầu tệ nhất', 'đau đầu dữ dội đột ngột', 'cứng cổ', 'sốt kèm cứng cổ'],
    recommendation: 'Cần loại trừ nguyên nhân thần kinh nguy hiểm.',
  },
  {
    id: 'gi_bleeding_severe',
    label: 'Xuất huyết tiêu hóa',
    level: 'emergency',
    triggers: ['nôn ra máu', 'đi cầu phân đen', 'đi ngoài ra máu nhiều'],
    recommendation: 'Cần khám cấp cứu tiêu hóa.',
  },
  {
    id: 'acute_abdomen',
    label: 'Đau bụng cấp nguy cơ cao',
    level: 'emergency',
    triggers: ['đau bụng dữ dội', 'bụng cứng', 'đau bụng tăng nhanh', 'ngất vì đau bụng'],
    recommendation: 'Cần đánh giá ngoại khoa cấp cứu.',
  },
  {
    id: 'allergy_anaphylaxis',
    label: 'Phản vệ/dị ứng nặng',
    level: 'emergency',
    triggers: [
      'phù môi lưỡi',
      'khó thở sau ăn',
      'mề đay kèm tụt huyết áp',
      'choáng phản vệ',
      'khò khè sau tiếp xúc dị nguyên',
    ],
    recommendation: 'Xử trí phản vệ khẩn cấp.',
  },
  {
    id: 'sepsis_signs',
    label: 'Nhiễm trùng nặng/Sepsis',
    level: 'emergency',
    triggers: ['ban xuất huyết', 'ban không mất màu', 'da loang lổ', 'da xám', 'tím tái', 'lơ mơ kèm sốt'],
    recommendation: 'Ưu tiên xử trí sepsis và chuyển cấp cứu.',
  },
  {
    id: 'urinary_sepsis',
    label: 'Nhiễm trùng tiết niệu biến chứng',
    level: 'urgent_same_day',
    triggers: ['sốt cao rét run', 'đau hông lưng kèm sốt', 'tiểu buốt kèm sốt'],
    recommendation: 'Cần khám trong ngày và làm xét nghiệm phù hợp.',
  },
  {
    id: 'respiratory_urgent',
    label: 'Khó thở/sốt cần khám trong ngày',
    level: 'urgent_same_day',
    triggers: ['khó thở', 'khò khè', 'sốt cao kéo dài', 'ho đờm xanh'],
    recommendation: 'Cần khám trong ngày, theo dõi SpO2 và nhịp thở.',
  },
  {
    id: 'dehydration_urgent',
    label: 'Nôn/tiêu chảy nguy cơ mất nước',
    level: 'urgent_same_day',
    triggers: ['nôn nhiều', 'tiêu chảy nhiều', 'không ăn uống được', 'mất nước'],
    recommendation: 'Cần khám trong ngày để bù dịch và đánh giá nguyên nhân.',
  },
  {
    id: 'dizziness_fainting_urgent',
    label: 'Choáng/ngất cần đánh giá sớm',
    level: 'urgent_same_day',
    triggers: ['choáng nhiều', 'chóng mặt nhiều', 'suýt ngất', 'xỉu'],
    recommendation: 'Cần khám trong ngày, kiểm tra sinh hiệu và nguyên nhân.',
  },
];

export const syndromeModules: SyndromeModule[] = [
  {
    id: 'chest_pain',
    label: 'Đau ngực / Tức ngực',
    systemTags: ['cardio', 'respiratory'],
    chiefComplaintIds: ['chest_pain_resp', 'palpitation', 'syncope'],
    keywords: ['đau ngực', 'tức ngực', 'nặng ngực'],
    requiredChecks: [
      'Đau kéo dài >15 phút hay không',
      'Có liên quan gắng sức không',
      'Có lan tay trái/hàm/lưng không',
      'Có vã mồ hôi, nôn, khó thở, ngất không',
    ],
    commonDiagnoses: ['Đau cơ thành ngực', 'Trào ngược/viêm thực quản', 'Cơn lo âu/panic'],
    notToMissDiagnoses: ['Hội chứng mạch vành cấp (ACS)', 'Thuyên tắc phổi', 'Bóc tách động mạch chủ', 'Tràn khí màng phổi'],
    emergencyRedFlags: ['Đau >15 phút + khó thở/nôn/vã mồ hôi/ngất/tụt huyết áp'],
  },
  {
    id: 'dyspnea_cough',
    label: 'Khó thở / Khò khè / Ho nhiều',
    systemTags: ['respiratory'],
    chiefComplaintIds: ['dyspnea', 'wheezing', 'cough', 'hemoptysis'],
    keywords: ['khó thở', 'khò khè', 'ho nhiều'],
    requiredChecks: [
      'Nói được câu dài hay không',
      'SpO2 hiện tại',
      'Có sốt, đau ngực, đờm không',
      'Tiền sử hen/COPD',
    ],
    commonDiagnoses: ['Cảm cúm/viêm hô hấp trên', 'Viêm phế quản', 'Hen nhẹ do kích thích'],
    notToMissDiagnoses: ['Cơn hen nặng', 'Viêm phổi nặng', 'Phù phổi cấp', 'Thuyên tắc phổi'],
    emergencyRedFlags: ['Nói không thành câu', 'Tím tái', 'SpO2 giảm', 'Lơ mơ'],
  },
  {
    id: 'fever_module',
    label: 'Sốt',
    systemTags: ['general', 'respiratory', 'urinary', 'gastro'],
    chiefComplaintIds: ['fever', 'rash_fever'],
    keywords: ['sốt', 'rét run', 'nhiệt độ'],
    requiredChecks: [
      'Nhiệt độ cao nhất và thời gian sốt',
      'Rét run/phát ban/đau đầu/khó thở/tiểu buốt/tiêu chảy',
      'Yếu tố dịch tễ/tiếp xúc',
    ],
    commonDiagnoses: ['Nhiễm virus hô hấp', 'Cúm', 'Viêm họng/viêm xoang', 'Nhiễm trùng tiểu'],
    notToMissDiagnoses: ['Sepsis', 'Viêm màng não/viêm não', 'Sốt xuất huyết'],
    emergencyRedFlags: ['Ban xuất huyết', 'Tím tái', 'Lơ mơ', 'Khó thở', 'Tụt huyết áp'],
  },
  {
    id: 'headache_module',
    label: 'Đau đầu',
    systemTags: ['neuro'],
    chiefComplaintIds: ['headache', 'dizziness', 'numb_weakness'],
    keywords: ['đau đầu', 'nhức đầu', 'đau đầu dữ dội'],
    requiredChecks: [
      'Khởi phát đột ngột hay từ từ',
      'Có phải đau đầu tệ nhất đời không',
      'Có sốt/cứng cổ/yếu liệt/nói khó/chấn thương đầu không',
    ],
    commonDiagnoses: ['Đau đầu căng thẳng', 'Migraine', 'Viêm xoang'],
    notToMissDiagnoses: ['Xuất huyết não/SAH', 'Viêm màng não', 'Tăng huyết áp cấp cứu'],
    emergencyRedFlags: ['FAST', 'Lơ mơ/co giật', 'Cứng cổ + sốt', 'Đau đầu sét đánh'],
  },
  {
    id: 'dizziness_syncope_module',
    label: 'Chóng mặt / Choáng / Ngất',
    systemTags: ['neuro', 'cardio', 'general'],
    chiefComplaintIds: ['dizziness', 'syncope', 'palpitation'],
    keywords: ['chóng mặt', 'choáng', 'ngất', 'xỉu'],
    requiredChecks: [
      'Chóng mặt xoay tròn hay choáng',
      'Có ngất thật không',
      'Kèm đau ngực/khó thở',
      'Có tê yếu/nói khó',
    ],
    commonDiagnoses: ['Hạ huyết áp tư thế', 'BPPV', 'Mất nước nhẹ'],
    notToMissDiagnoses: ['Rối loạn nhịp tim', 'Nhồi máu cơ tim', 'Đột quỵ thân não/tiểu não', 'Xuất huyết tiêu hóa'],
    emergencyRedFlags: ['Ngất kèm đau ngực/khó thở', 'FAST dương tính'],
  },
  {
    id: 'abdominal_pain_module',
    label: 'Đau bụng',
    systemTags: ['gastro', 'urinary'],
    chiefComplaintIds: ['abdominal_pain', 'pelvic_pain', 'nausea_vomit'],
    keywords: ['đau bụng', 'đau hố chậu phải', 'đau thượng vị'],
    requiredChecks: [
      'Vị trí đau và hướng lan',
      'Nôn/tiêu chảy/sốt/tiểu buốt',
      'Nữ: trễ kinh/ra huyết',
    ],
    commonDiagnoses: ['Viêm dạ dày/GERD', 'Ngộ độc thức ăn/viêm dạ dày ruột', 'Táo bón'],
    notToMissDiagnoses: ['Viêm ruột thừa', 'Thai ngoài tử cung', 'Viêm tụy cấp', 'Tắc ruột', 'Thủng tạng rỗng'],
    emergencyRedFlags: ['Đau tăng nhanh dữ dội', 'Bụng cứng', 'Nôn liên tục', 'Choáng/ngất'],
  },
  {
    id: 'vomit_diarrhea_module',
    label: 'Nôn / Tiêu chảy',
    systemTags: ['gastro', 'general'],
    chiefComplaintIds: ['nausea_vomit', 'diarrhea'],
    keywords: ['nôn', 'ói', 'tiêu chảy'],
    requiredChecks: [
      'Số lần nôn/tiêu chảy',
      'Dấu mất nước: khát nhiều, tiểu ít',
      'Có máu trong phân hay sốt cao không',
    ],
    commonDiagnoses: ['Viêm dạ dày ruột do virus', 'Ngộ độc thức ăn'],
    notToMissDiagnoses: ['Mất nước nặng/sepsis', 'Tắc ruột'],
    emergencyRedFlags: ['Phân đen/ra máu', 'Lơ mơ', 'Dấu mất nước nặng'],
  },
  {
    id: 'dyspepsia_module',
    label: 'Ợ chua / Đau thượng vị / Khó tiêu',
    systemTags: ['gastro'],
    chiefComplaintIds: ['reflux', 'abdominal_pain'],
    keywords: ['ợ chua', 'đau thượng vị', 'khó tiêu'],
    requiredChecks: [
      'Đau liên quan bữa ăn hay tư thế',
      'Có nuốt nghẹn/sụt cân/nôn dai dẳng không',
      'Có thiếu máu/ra máu tiêu hóa không',
    ],
    commonDiagnoses: ['GERD/viêm dạ dày', 'Loét dạ dày tá tràng'],
    notToMissDiagnoses: ['Ung thư dạ dày-thực quản', 'Xuất huyết tiêu hóa'],
    emergencyRedFlags: ['Nôn máu', 'Phân đen', 'Sụt cân nhanh', 'Nuốt nghẹn tiến triển'],
  },
  {
    id: 'urinary_module',
    label: 'Tiểu buốt / Tiểu rắt / Tiểu máu / Đau hông lưng',
    systemTags: ['urinary'],
    chiefComplaintIds: ['dysuria', 'hematuria', 'flank_pain'],
    keywords: ['tiểu buốt', 'tiểu rắt', 'tiểu máu', 'đau hông lưng'],
    requiredChecks: [
      'Có sốt rét run không',
      'Đau hông lưng có lan bẹn không',
      'Có thai hay không',
    ],
    commonDiagnoses: ['Viêm bàng quang (UTI)', 'Sỏi niệu quản'],
    notToMissDiagnoses: ['Viêm thận-bể thận', 'Nhiễm trùng huyết nguồn niệu'],
    emergencyRedFlags: ['Sốt cao rét run + đau hông lưng', 'Tụt huyết áp'],
  },
  {
    id: 'joint_module',
    label: 'Đau khớp / Sưng nóng đỏ',
    systemTags: ['musculoskeletal'],
    chiefComplaintIds: ['joint_pain', 'swollen_joint'],
    keywords: ['đau khớp', 'sưng nóng đỏ'],
    requiredChecks: [
      'Một khớp hay nhiều khớp',
      'Khởi phát qua đêm hay kéo dài',
      'Có sốt/vết thương/tiền sử gút không',
    ],
    commonDiagnoses: ['Cơn gút cấp', 'Thoái hóa khớp', 'Viêm gân'],
    notToMissDiagnoses: ['Viêm khớp nhiễm trùng'],
    emergencyRedFlags: ['Sốt + khớp sưng nóng đỏ', 'Đau không chịu được'],
  },
  {
    id: 'allergy_rash_module',
    label: 'Phát ban / Mề đay / Phù mặt',
    systemTags: ['dermatology', 'respiratory'],
    chiefComplaintIds: ['urticaria', 'rash', 'skin_infection'],
    keywords: ['mề đay', 'phát ban', 'phù mặt', 'dị ứng'],
    requiredChecks: [
      'Có khó thở/khò khè không',
      'Có phù môi lưỡi không',
      'Có thuốc/đồ ăn mới không',
    ],
    commonDiagnoses: ['Mề đay dị ứng nhẹ', 'Viêm da tiếp xúc'],
    notToMissDiagnoses: ['Phản vệ', 'Stevens-Johnson/TEN'],
    emergencyRedFlags: ['Phù môi-lưỡi + khó thở/khò khè/choáng'],
  },
];
