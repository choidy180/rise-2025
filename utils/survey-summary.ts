/**
 * ------------------------------------------------------------------
 * 1. Type Definitions (내부 정의)
 * ------------------------------------------------------------------
 */

export interface SurveyItem {
  index: number;         // 문항 번호
  question: string;      // 질문 텍스트
  answer: number | null; // 선택한 답변 값
}

export interface SurveyResult {
  total: number;         // 총 문항 수
  answeredCount: number; // 응답한 문항 수
  sum: number;           // 답변 값의 총합
  mean: number | null;   // 평균 점수
  items: SurveyItem[];   // 각 문항별 상세 정보
  answers: Array<number | null>; // 답변 값 배열
}

/**
 * ------------------------------------------------------------------
 * 2. Helper Functions (답변 매핑)
 * ------------------------------------------------------------------
 */

// 예/아니오 (1: 아니오, 2: 예)
const mapYN = (val: number | null) => {
  if (val === 1) return "아니오";
  if (val === 2) return "예";
  if (val === -1) return "모름";
  return "-";
};

// 있음/없음 (1: 없음, 2: 있음)
const mapExist = (val: number | null) => {
  if (val === 1) return "없음";
  if (val === 2) return "있음";
  if (val === -1) return "모름";
  return "-";
};

// 척도형 (1: 전혀 ~ 5: 매우)
const mapScale = (val: number | null) => {
  if (!val || val === -1) return "모름";
  const map = ["전혀 그렇지 않다", "거의 그렇지 않다", "가끔 그렇다", "자주 그렇다", "매우 그렇다"];
  // val이 1,3,5 처럼 들어와도 index로 접근 (ex: 3점 -> index 2 -> "가끔 그렇다")
  return map[val - 1] || "-";
};

// 기간
const mapYears = (val: number | null) => {
  if (!val || val === -1) return "모름";
  const map = ["10년 미만", "10~19년", "20~29년", "30년 이상"];
  return map[val - 1] || "-";
};

// 흡연량
const mapSmokeAmount = (val: number | null) => {
  if (!val || val === -1) return "모름";
  const map = ["10개비 미만", "반 갑(10~19개비)", "한 갑(20개비)", "한 갑 이상"];
  return map[val - 1] || "-";
};

// 음주 빈도
const mapDrinkFreq = (val: number | null) => {
  if (!val || val === -1) return "-";
  const map = ["마시지 않음", "월 1회 미만", "월 1회 정도", "주 2~3회", "거의 매일"];
  return map[val - 1] || "-";
};

// 음주량
const mapDrinkAmount = (val: number | null) => {
  if (!val || val === -1) return "-";
  const map = ["1~2잔", "반 병", "1병", "2병", "2병 이상"];
  return map[val - 1] || "-";
};

// 운동/사용 빈도
const mapFreqDays = (val: number | null) => {
  if (!val || val === -1) return "-";
  const map = ["전혀 안 함", "1일", "2~3일", "4~5일", "매일"];
  return map[val - 1] || `${val}`;
};

// 전자담배 빈도
const mapVapeFreq = (val: number | null) => {
  if (!val || val === -1) return "-";
  const map = ["안 함", "월 1-2회", "월 3–9회", "월 10-29회", "매일"];
  return map[val - 1] || "-";
};

// 운동 시간
const mapHours = (val: number | null) => {
  if (!val || val === -1) return "-";
  const map = ["30분 미만", "30분~1시간", "1~2시간", "2시간 이상", "4시간 이상"];
  return map[val - 1] || "-";
};


/**
 * ------------------------------------------------------------------
 * 3. Main Generator Function (리포트 생성)
 * ------------------------------------------------------------------
 */
export const generateHealthReport = (data: SurveyResult): string => {
  
  // 문항 번호(1~33)를 받아 배열 인덱스(0~32)로 변환하여 값 조회
  const getAns = (qNum: number) => {
    const val = data.answers[qNum - 1]; 
    return val !== undefined ? val : null;
  };

  // --- 1. 기저질환 및 가족력 ---
  const q1 = getAns(1);
  const q2 = getAns(2);
  const q3 = getAns(3);

  // --- 2. 흡연 ---
  const q4 = getAns(4);
  const q5 = getAns(5);
  
  let smokingStatus = "비흡연";
  if (q4 === 2 && q5 === 2) smokingStatus = "현재 흡연";
  else if (q4 === 2 && q5 === 1) smokingStatus = "과거 흡연";
  
  const q6 = mapYears(getAns(6));
  const q7 = mapSmokeAmount(getAns(7));
  const q8 = mapYears(getAns(8));
  const q9 = mapSmokeAmount(getAns(9));
  const q10 = mapYears(getAns(10));

  const q11 = getAns(11);
  const q13 = mapYears(getAns(13));
  const q14 = mapSmokeAmount(getAns(14));

  const q15 = getAns(15);
  const q16 = mapVapeFreq(getAns(16));

  // --- 3. 음주 ---
  const q17 = mapDrinkFreq(getAns(17));
  const q18 = mapDrinkAmount(getAns(18));

  // --- 4. 운동 ---
  const q19 = mapFreqDays(getAns(19));
  const q20 = mapHours(getAns(20));
  const q21 = mapFreqDays(getAns(21));
  const q22 = mapHours(getAns(22));
  const q23 = mapFreqDays(getAns(23));

  // --- 5. 노년기 건강 및 일상생활 ---
  const q24 = mapYN(getAns(24));
  const q25Val = getAns(25);
  const q25Text = q25Val === 2 ? "혼자 가능" : q25Val === 1 ? "도움 필요" : "모름";
  
  const q26 = mapYN(getAns(26));
  const q27 = mapYN(getAns(27));
  
  const q28 = mapScale(getAns(28));
  const q29 = mapScale(getAns(29));
  const q30 = mapScale(getAns(30));

  // --- 6. 영양 ---
  const q31 = mapScale(getAns(31));
  const q32 = mapScale(getAns(32));
  const q33 = mapScale(getAns(33));

  // === 리포트 텍스트 생성 ===
  return `
1. 기저질환 및 가족력
- 기저질환: [${q1 === 2 ? "있음" : "없음"}] 
    ${q1 === 2 ? "→ 뇌졸중, 심장질환 등 관련 약물 복용 중" : "→ 특이사항 없음"}
- 가족력: [${q2 === 2 ? "있음" : "없음"}]  
    ${q2 === 2 ? "→ 뇌졸중, 심근경색 등 가족 병력 보유" : "→ 특이사항 없음"}
- B형간염 바이러스 보유 여부 : [${mapYN(q3)}]

2. 주요 생활습관 및 건강위험 요약
- 흡연(일반담배)
    - 흡연 여부: [${q5 === 2 ? "예" : "아니오"}]
    - 현재 흡연 상태: [${smokingStatus}]
    ${smokingStatus === "현재 흡연" ? `- 현재 흡연자일 경우:
        · 흡연 기간: [${q6}]
        · 하루 흡연량: [${q7}]` : ""}
    ${smokingStatus === "과거 흡연" ? `- 과거 흡연자일 경우:
        · 과거 흡연 기간: [${q8}]
        · 과거 하루 흡연량: [${q9}]
        · 금연 기간: [${q10}]` : ""}
- 궐련형 전자담배 사용 경험: [${mapExist(q11)}]
    ${q11 === 2 ? `- 현재 사용 정보:
        · 사용 기간: [${q13}]
        · 하루 사용량: [${q14}]` : ""}
- 액상형 전자담배 사용 경험: [${mapExist(q15)}]
    ${q15 === 2 ? `- 최근 1개월 사용 빈도: [${q16}]` : ""}

- 지난 1년 동안 술을 마시는 횟수 : [${q17}]
    - 술을 마시는 날 하루 평균 음주량 : [${q18}]
    - 가장 많이 마셨던 하루 음주량 : [${q18}] (평균과 동일 가정)

- 신체활동(운동)
    - 고강도 운동(달리기 등) : 일주일에 [${q19}], 하루에 [${q20}]
    - 중강도 운동(빠르게 걷기 등) : 일주일에 [${q21}], 하루에 [${q22}]
    - 근력 운동 : 일주일에 [${q23}]

3. 기타 노년기 건강 및 영양 (추가 항목)
- 예방접종 및 일상생활
    - 최근 1년 내 독감/폐렴구균 접종 여부: [${q24}]
    - 일상생활(식사, 옷입기 등) 자립 여부: [${q25Text}]
    - 지난 6개월 간 낙상(넘어짐) 경험: [${q26}]
    - 배뇨 장애(소변 지림 등) 여부: [${q27}]

- 인지기능 및 정서
    - 기억력 저하(날짜, 약속 등): [${q28}]
    - 판단력 저하(계산, 길찾기): [${q29}]
    - 정서 변화(성격 변화, 만사 귀찮음): [${q30}]

- 식생활 및 영양
    - 건강 식품(채소, 단백질) 매일 섭취: [${q31}]
    - 주의 식품(짠 음식, 튀김) 자주 섭취: [${q32}]
    - 규칙적인 식사 및 외식 자제: [${q33}]
`;
};