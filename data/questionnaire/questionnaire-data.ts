// data/checkupQuestions.ts

export type AnswerType = "scale" | "yesno" | "select";

export interface AnswerOption {
  value: number;
  label: string;
}

export interface CheckupQuestion {
  id: number;
  category: string;
  type: AnswerType;
  question: string;
  options?: AnswerOption[]; // ✅ 질문별 맞춤 버튼 라벨
  dependency?: {
    targetId: number;
    answerValue: number | number[]; 
  };
  isReverse?: boolean;
}

/* ============================================================
   1. 답변 프리셋 (재사용할 옵션들 정의)
   ============================================================ */

// [기본] 5점 척도
const OPT_SCALE_DEFAULT: AnswerOption[] = [
  { value: 1, label: "전혀 그렇지 않다" },
  { value: 2, label: "거의 그렇지 않다" },
  { value: 3, label: "보통 / 가끔" },
  { value: 4, label: "자주 그렇다" },
  { value: 5, label: "매우(매일) 그렇다" },
];

// [기본] 예/아니오
const OPT_YESNO: AnswerOption[] = [
  { value: 1, label: "아니요" },
  { value: 2, label: "예" },
];

// [기간] 년수 (흡연 기간 등)
const OPT_YEARS: AnswerOption[] = [
  { value: 1, label: "10년 미만" },
  { value: 2, label: "10년 ~ 19년" },
  { value: 3, label: "20년 ~ 29년" },
  { value: 4, label: "30년 이상" },
  { value: 5, label: "기억나지 않음" },
];

// [수량] 담배 개비 (흡연량)
const OPT_CIGAR_AMOUNT: AnswerOption[] = [
  { value: 1, label: "10개비 이하" },
  { value: 2, label: "반 갑~한 갑" }, // 11~20
  { value: 3, label: "한 갑~한 갑 반" }, // 21~30
  { value: 4, label: "한 갑 반 이상" }, // 31~
  { value: 5, label: "잘 모름" },
];

// [빈도] 주간 횟수 (운동, 전자담배 등)
const OPT_FREQ_WEEK: AnswerOption[] = [
  { value: 1, label: "전혀 안 함" },
  { value: 2, label: "주 1~2회" },
  { value: 3, label: "주 3~4회" },
  { value: 4, label: "주 5~6회" },
  { value: 5, label: "매일 함" },
];

// [빈도] 월간 횟수 (음주, 가끔 하는 전자담배)
const OPT_FREQ_MONTH: AnswerOption[] = [
  { value: 1, label: "안 함" },
  { value: 2, label: "월 1회 이하" },
  { value: 3, label: "월 2~4회" },
  { value: 4, label: "주 2~3회" },
  { value: 5, label: "주 4회 이상" },
];

// [수량] 음주량 (잔)
const OPT_DRINK_AMOUNT: AnswerOption[] = [
  { value: 1, label: "1~2잔" },
  { value: 2, label: "3~4잔 (반 병)" },
  { value: 3, label: "5~7잔 (한 병)" },
  { value: 4, label: "8~14잔 (두 병)" },
  { value: 5, label: "15잔 이상" },
];

// [시간] 운동 지속 시간
const OPT_TIME_DURATION: AnswerOption[] = [
  { value: 1, label: "30분 미만" },
  { value: 2, label: "30분~1시간" },
  { value: 3, label: "1~2시간" },
  { value: 4, label: "2~4시간" },
  { value: 5, label: "4시간 이상" },
];

// [3점 척도] 인지기능/영양 (아니다/가끔/자주)
const OPT_SCALE_3: AnswerOption[] = [
  { value: 1, label: "아니다" },
  { value: 3, label: "가끔 그렇다" },
  { value: 5, label: "자주 그렇다" },
];

/* ============================================================
   2. 질문 리스트 (options 필드 필수 확인)
   ============================================================ */
export const CHECKUP_QUESTIONS: CheckupQuestion[] = [
  // --- 1. 질환력 ---
  {
    id: 1, category: "질환력", type: "yesno",
    question: "현재 고혈압, 당뇨병, 고지혈증, 뇌졸중, 심장질환, 폐결핵 등으로 약을 드시고 계십니까?",
    options: OPT_YESNO,
    isReverse: true,
  },
  {
    id: 2, category: "가족력", type: "yesno",
    question: "가족(부모,형제,자매) 중 뇌졸중, 심근경색, 고혈압, 당뇨, 암 환자가 있습니까?",
    options: OPT_YESNO,
    isReverse: true,
  },
  {
    id: 3, category: "감염병", type: "select",
    question: "B형간염 바이러스 보균자이거나 현재 앓고 계십니까?",
    options: [
      { value: 1, label: "아니요" },
      { value: 2, label: "예" },
      { value: 3, label: "모름" },
    ],
    isReverse: true,
  },

  // --- 2. 흡연 (일반담배) ---
  {
    id: 4, category: "흡연경험", type: "yesno",
    question: "평생 담배를 5갑(100개비) 이상 피운 적이 있습니까?",
    options: OPT_YESNO,
    isReverse: true,
  },
  {
    id: 5, category: "현재흡연", type: "select",
    question: "현재 담배를 피우십니까?",
    options: [
      { value: 1, label: "피우지 않음" },
      { value: 2, label: "현재 피움" },
    ],
    dependency: { targetId: 4, answerValue: 2 },
    isReverse: true,
  },
  // 🔴 [수정] 년수 질문
  {
    id: 6, category: "흡연기간", type: "select",
    question: "총 몇 년 정도 담배를 피우셨습니까?",
    options: OPT_YEARS, // ✅ 년수 옵션 적용
    dependency: { targetId: 5, answerValue: 2 },
    isReverse: true,
  },
  // 🔴 [수정] 개비 질문 (사용자 지적 사항)
  {
    id: 7, category: "흡연량", type: "select",
    question: "하루에 평균적으로 몇 개비나 피우십니까?",
    options: OPT_CIGAR_AMOUNT, // ✅ 개비 옵션 적용
    dependency: { targetId: 5, answerValue: 2 },
    isReverse: true,
  },
  // 과거 흡연자용
  {
    id: 8, category: "과거흡연기간", type: "select",
    question: "과거에 총 몇 년 정도 담배를 피우셨습니까?",
    options: OPT_YEARS, // ✅ 년수 옵션
    dependency: { targetId: 5, answerValue: 1 },
    isReverse: true,
  },
  {
    id: 9, category: "과거흡연량", type: "select",
    question: "피우셨을 때 하루 평균 몇 개비 정도 피우셨습니까?",
    options: OPT_CIGAR_AMOUNT, // ✅ 개비 옵션
    dependency: { targetId: 5, answerValue: 1 },
    isReverse: true,
  },
  {
    id: 10, category: "금연기간", type: "select",
    question: "담배를 끊은 지 얼마나 되셨습니까?",
    options: [
      { value: 1, label: "1년 미만" },
      { value: 2, label: "1~5년" },
      { value: 3, label: "5~10년" },
      { value: 4, label: "10년 이상" },
      { value: 5, label: "20년 이상" },
    ],
    dependency: { targetId: 5, answerValue: 1 },
    isReverse: false,
  },

  // --- 3. 전자담배 ---
  {
    id: 11, category: "전자담배", type: "yesno",
    question: "궐련형 전자담배(아이코스 등)를 피운 적이 있습니까?",
    options: OPT_YESNO,
    isReverse: true,
  },
  {
    id: 12, category: "전자담배현재", type: "select",
    question: "현재 궐련형 전자담배를 피우십니까?",
    options: [
      { value: 1, label: "안 피움" },
      { value: 2, label: "현재 피움" },
    ],
    dependency: { targetId: 11, answerValue: 2 },
    isReverse: true,
  },
  {
    id: 13, category: "전자담배기간", type: "select",
    question: "궐련형 전자담배를 총 몇 년 사용하셨습니까?",
    options: OPT_YEARS, // ✅ 년수 옵션
    dependency: { targetId: 12, answerValue: 2 },
    isReverse: true,
  },
  {
    id: 14, category: "전자담배량", type: "select",
    question: "하루 평균 몇 개비 정도 사용하십니까?",
    options: OPT_CIGAR_AMOUNT, // ✅ 개비 옵션
    dependency: { targetId: 12, answerValue: 2 },
    isReverse: true,
  },
  // 액상형
  {
    id: 15, category: "액상경험", type: "yesno",
    question: "액상형 전자담배를 사용한 경험이 있습니까?",
    options: OPT_YESNO,
    isReverse: true,
  },
  {
    id: 16, category: "액상빈도", type: "select",
    question: "최근 한 달간 액상형 전자담배를 얼마나 사용하셨습니까?",
    options: OPT_FREQ_MONTH, // ✅ 월간 빈도 옵션
    dependency: { targetId: 15, answerValue: 2 },
    isReverse: true,
  },

  // --- 4. 음주 ---
  {
    id: 17, category: "음주빈도", type: "select",
    question: "지난 1년 동안 술을 얼마나 자주 드셨습니까?",
    options: OPT_FREQ_MONTH, // ✅ 월간 빈도 옵션
    isReverse: true,
  },
  {
    id: 18, category: "음주량", type: "select",
    question: "술을 마시는 날에는 보통 몇 잔 드십니까? (소주/맥주 잔 기준)",
    options: OPT_DRINK_AMOUNT, // ✅ 잔 수 옵션
    dependency: { targetId: 17, answerValue: [2, 3, 4, 5] },
    isReverse: true,
  },

  // --- 5. 신체활동 (운동) ---
  {
    id: 19, category: "고강도빈도", type: "select",
    question: "숨이 많이 찰 정도의 고강도 운동(달리기, 등산 등)을 일주일에 며칠 하십니까?",
    options: OPT_FREQ_WEEK, // ✅ 주간 빈도 옵션
    isReverse: false,
  },
  {
    id: 20, category: "고강도시간", type: "select",
    question: "고강도 운동을 하는 날은 보통 몇 시간 하십니까?",
    options: OPT_TIME_DURATION, // ✅ 시간 옵션
    dependency: { targetId: 19, answerValue: [2, 3, 4, 5] },
    isReverse: false,
  },
  {
    id: 21, category: "중강도빈도", type: "select",
    question: "숨이 약간 찰 정도의 운동(빠르게 걷기 등)을 일주일에 며칠 하십니까?",
    options: OPT_FREQ_WEEK, // ✅ 주간 빈도 옵션
    isReverse: false,
  },
  {
    id: 22, category: "중강도시간", type: "select",
    question: "중강도 운동을 하는 날은 보통 몇 시간 하십니까?",
    options: OPT_TIME_DURATION, // ✅ 시간 옵션
    dependency: { targetId: 21, answerValue: [2, 3, 4, 5] },
    isReverse: false,
  },
  {
    id: 23, category: "근력운동", type: "select",
    question: "근력 운동(헬스, 아령 등)을 일주일에 며칠 하십니까?",
    options: OPT_FREQ_WEEK, // ✅ 주간 빈도 옵션
    isReverse: false,
  },

  // --- 6. 노인기능 ---
  {
    id: 24, category: "예방접종", type: "yesno",
    question: "최근 1년 내 독감/폐렴구균 예방접종을 받으셨습니까?",
    options: OPT_YESNO,
    isReverse: false,
  },
  {
    id: 25, category: "일상생활", type: "select",
    question: "식사, 옷 입기, 목욕, 외출 등을 혼자서 잘 하십니까?",
    options: [
      { value: 1, label: "도움이 필요함" },
      { value: 2, label: "혼자서 잘 함" },
    ],
    isReverse: false,
  },
  {
    id: 26, category: "낙상", type: "yesno",
    question: "지난 6개월 동안 넘어진 적이 있습니까?",
    options: OPT_YESNO,
    isReverse: true,
  },
  {
    id: 27, category: "배뇨장애", type: "yesno",
    question: "소변을 지리거나 보는데 어려움이 있습니까?",
    options: OPT_YESNO,
    isReverse: true,
  },

  // --- 7. 인지기능 (3점 척도) ---
  {
    id: 28, category: "기억력", type: "select",
    question: "1년 전보다 날짜, 약속, 물건 둔 곳을 기억하기 어려우십니까?",
    options: OPT_SCALE_3, // ✅ 3점 척도 적용
    isReverse: true,
  },
  {
    id: 29, category: "판단력", type: "select",
    question: "계산이 서툴러지거나 길을 잃은 적이 있습니까?",
    options: OPT_SCALE_3, // ✅ 3점 척도 적용
    isReverse: true,
  },
  {
    id: 30, category: "성격변화", type: "select",
    question: "예전에 비해 성격이 변했거나 만사가 귀찮아지셨습니까?",
    options: OPT_SCALE_3, // ✅ 3점 척도 적용
    isReverse: true,
  },

  // --- 8. 영양 (3점 척도) ---
  {
    id: 31, category: "건강식", type: "select",
    question: "채소, 과일, 유제품, 단백질을 매일 드십니까?",
    options: [
      { value: 1, label: "아닌 편이다" },
      { value: 3, label: "보통이다" },
      { value: 5, label: "항상 그렇다" },
    ],
    isReverse: false,
  },
  {
    id: 32, category: "주의식", type: "select",
    question: "짠 음식, 튀김, 단 음료 등을 자주 드십니까?",
    options: [
      { value: 1, label: "아닌 편이다" },
      { value: 3, label: "보통이다" },
      { value: 5, label: "항상 그렇다" },
    ],
    isReverse: true,
  },
  {
    id: 33, category: "규칙식사", type: "select",
    question: "세끼를 규칙적으로 드시고 외식을 자제하십니까?",
    options: [
      { value: 1, label: "아닌 편이다" },
      { value: 3, label: "보통이다" },
      { value: 5, label: "항상 그렇다" },
    ],
    isReverse: false,
  },
];